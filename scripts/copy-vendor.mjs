// Готовит всё, что нужно превью для запуска кода ученика без сборщика (запускается перед dev и build):
//   public/vendor/angular/<пакет>/  — ESM-файлы пакетов Angular (fesm2022) как есть;
//   public/vendor/rxjs.mjs          — RxJS одним файлом (в пакете сотни модулей);
//   public/vendor/ts-angular.mjs    — TypeScript + JIT-трансформ из @angular/compiler-cli для воркера компиляции;
//   public/vendor/es-module-lexer.js;
//   public/preview.html             — из scripts/preview.template.html с import map, построенной по полю
//                                     `exports` пакетов: при обновлении Angular новые подпути попадут в карту сами.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'public/vendor');
mkdirSync(out, { recursive: true });

const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));

// Пакеты Angular, доступные коду ученика. @angular/animations не подключаем: пакет устарел (см. docs/modern-angular.md)
const ANGULAR_PACKAGES = ['core', 'common', 'compiler', 'platform-browser', 'forms', 'router'];
// Локали для пайпов дат и чисел (глава 7): `import localeRu from '@angular/common/locales/ru'`
const LOCALES = ['ru', 'en'];

const importMap = {};

for (const name of ANGULAR_PACKAGES) {
  const pkgDir = `node_modules/@angular/${name}`;
  const target = resolve(out, 'angular', name);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  for (const file of readdirSync(resolve(root, pkgDir, 'fesm2022'))) {
    copyFileSync(resolve(root, pkgDir, 'fesm2022', file), resolve(target, file));
  }
  const { exports } = readJson(`${pkgDir}/package.json`);
  for (const [subpath, entry] of Object.entries(exports)) {
    const file = typeof entry === 'string' ? entry : entry.default;
    if (subpath.includes('*') || !file?.startsWith('./fesm2022/')) continue;
    importMap[`@angular/${name}${subpath.slice(1)}`] = `/vendor/angular/${name}/${file.slice('./fesm2022/'.length)}`;
  }
}

mkdirSync(resolve(out, 'angular/common/locales'), { recursive: true });
for (const locale of LOCALES) {
  copyFileSync(
    resolve(root, `node_modules/@angular/common/locales/${locale}.js`),
    resolve(out, `angular/common/locales/${locale}.mjs`),
  );
  importMap[`@angular/common/locales/${locale}`] = `/vendor/angular/common/locales/${locale}.mjs`;
}

// RxJS 7 экспортирует все операторы и из корня, поэтому rxjs/operators указывает на тот же файл
buildSync({
  stdin: { contents: "export * from 'rxjs';", resolveDir: root },
  bundle: true,
  format: 'esm',
  minify: true,
  outfile: resolve(out, 'rxjs.mjs'),
  logLevel: 'warning',
});
importMap['rxjs'] = '/vendor/rxjs.mjs';
importMap['rxjs/operators'] = '/vendor/rxjs.mjs';

copyFileSync(resolve(root, 'node_modules/es-module-lexer/dist/lexer.js'), resolve(out, 'es-module-lexer.js'));

// Компилятор для воркера: ~4 МБ, сборка занимает несколько секунд — пересобираем только при смене версий
const versions = {
  typescript: readJson('node_modules/typescript/package.json').version,
  compilerCli: readJson('node_modules/@angular/compiler-cli/package.json').version,
};
const stampPath = resolve(out, 'ts-angular.stamp.json');
const stamp = existsSync(stampPath) ? readFileSync(stampPath, 'utf8') : '';
if (stamp !== JSON.stringify(versions) || !existsSync(resolve(out, 'ts-angular.mjs'))) {
  // compiler-cli рассчитан на Node: модули Node, которые ему не нужны для трансформа, заменяем заглушкой
  const stub = resolve(root, 'scripts/node-stub.mjs');
  buildSync({
    stdin: {
      contents:
        "import ts from 'typescript';\nimport { angularJitApplicationTransform } from '@angular/compiler-cli';\nexport { ts, angularJitApplicationTransform };",
      resolveDir: root,
    },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    minify: true,
    alias: Object.fromEntries(['fs', 'path', 'module', 'url', 'os', 'crypto', 'process', 'util'].map((m) => [m, stub])),
    outfile: resolve(out, 'ts-angular.mjs'),
    logLevel: 'error',
  });
  writeFileSync(stampPath, JSON.stringify(versions));
  console.log(`[vendor] собран ts-angular.mjs (TypeScript ${versions.typescript}, compiler-cli ${versions.compilerCli})`);
}

const template = readFileSync(resolve(root, 'scripts/preview.template.html'), 'utf8');
const importMapJson = JSON.stringify({ imports: importMap }, null, 2).replace(/\n/g, '\n    ');
writeFileSync(resolve(root, 'public/preview.html'), template.replace('<!--IMPORT_MAP-->', importMapJson));

console.log(`[vendor] Angular: ${ANGULAR_PACKAGES.length} пакетов, ${Object.keys(importMap).length} записей в import map`);
