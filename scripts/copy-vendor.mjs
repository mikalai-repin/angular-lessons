// Готовит всё, что нужно превью для запуска кода ученика без сборщика (запускается перед dev и build):
//   public/vendor/angular/<пакет>/  — ESM-файлы пакетов Angular (fesm2022) как есть;
//   public/vendor/ngrx/<пакет>/     — то же для пакетов NgRx (глава 18);
//   public/vendor/rxjs.mjs          — RxJS одним файлом (в пакете сотни модулей);
//   public/vendor/ts-angular.mjs    — TypeScript + JIT-трансформ из @angular/compiler-cli для воркера компиляции;
//   public/vendor/vitest.mjs        — API Vitest для тестов в превью (vendor-src/vitest.mjs + @vitest/expect, chai, @vitest/spy);
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
// Пакеты NgRx (глава 18) — такая же раскладка fesm2022 + exports. Тот же список — в src/editor/monaco.ts
const NGRX_PACKAGES = ['signals', 'store', 'effects', 'operators', 'store-devtools'];
// Локали для пайпов дат и чисел (глава 7): `import localeRu from '@angular/common/locales/ru'`.
// Тот же список — в src/editor/monaco.ts (localeTypes): типы локалей для редактора
const LOCALES = ['ru', 'en'];

const importMap = {};

/** Копирует fesm2022 пакета в public/vendor/<scope>/<name>/ и добавляет его подпути из `exports` в import map */
function copyPackage(scope, name) {
  const pkgDir = `node_modules/@${scope}/${name}`;
  const target = resolve(out, scope, name);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  for (const file of readdirSync(resolve(root, pkgDir, 'fesm2022'))) {
    copyFileSync(resolve(root, pkgDir, 'fesm2022', file), resolve(target, file));
  }
  const { exports } = readJson(`${pkgDir}/package.json`);
  for (const [subpath, entry] of Object.entries(exports)) {
    const file = typeof entry === 'string' ? entry : entry.default;
    if (subpath.includes('*') || !file?.startsWith('./fesm2022/')) continue;
    importMap[`@${scope}/${name}${subpath.slice(1)}`] = `/vendor/${scope}/${name}/${file.slice('./fesm2022/'.length)}`;
  }
}

for (const name of ANGULAR_PACKAGES) copyPackage('angular', name);
for (const name of NGRX_PACKAGES) copyPackage('ngrx', name);

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

// Тесты в превью (глава 16): API Vitest — раннер vendor-src/vitest.mjs с настоящими @vitest/expect, chai и @vitest/spy.
// В import map — как 'vitest': тесты ученика работают и с глобальными describe/expect, и с импортом из 'vitest'
buildSync({
  entryPoints: [resolve(root, 'vendor-src/vitest.mjs')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  minify: true,
  // fake-timers зовёт require('util') только в Node (_global.process) — в браузере заглушка не используется
  alias: { util: resolve(root, 'scripts/node-stub.mjs') },
  outfile: resolve(out, 'vitest.mjs'),
  logLevel: 'warning',
});
importMap['vitest'] = '/vendor/vitest.mjs';

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
  console.log(
    `[vendor] собран ts-angular.mjs (TypeScript ${versions.typescript}, compiler-cli ${versions.compilerCli})`,
  );
}

const template = readFileSync(resolve(root, 'scripts/preview.template.html'), 'utf8');
const importMapJson = JSON.stringify({ imports: importMap }, null, 2).replace(/\n/g, '\n    ');
writeFileSync(resolve(root, 'public/preview.html'), template.replace('<!--IMPORT_MAP-->', importMapJson));

console.log(
  `[vendor] Angular: ${ANGULAR_PACKAGES.length} пакетов, NgRx: ${NGRX_PACKAGES.length}, ${Object.keys(importMap).length} записей в import map`,
);
