// AOT-проверка главы: полный код каждого шага (решение, а у шага без решения — старт) собирается ngc
// со strictTemplates и расширенной диагностикой. Ошибки и предупреждения шаблонов, которых JIT в превью не видит.
// node tools/e2e/aot-chapter.mjs 13-forms
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readStepDir, writeFiles } from '../../scripts/step-files.mjs';
import { OUT, ROOT } from './lib.mjs';

const chapter = process.argv[2];
if (!chapter) {
  console.error('Использование: node tools/e2e/aot-chapter.mjs <папка главы>');
  process.exit(1);
}
const chapterDir = resolve(ROOT, 'content', chapter);
const ngc = resolve(ROOT, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js');
const tsconfig = {
  compilerOptions: {
    strict: true,
    target: 'es2022',
    module: 'es2022',
    moduleResolution: 'bundler',
    experimentalDecorators: true,
    skipLibCheck: true,
    lib: ['es2022', 'dom', 'dom.iterable'],
    rootDir: 'src',
    outDir: 'out',
  },
  files: ['src/main.ts'],
  angularCompilerOptions: {
    strictTemplates: true,
    strictInjectionParameters: true,
    extendedDiagnostics: { defaultCategory: 'warning' },
  },
};

let failed = 0;
for (const step of readdirSync(chapterDir)
  .filter((name) => existsSync(join(chapterDir, name, 'lesson.md')))
  .sort()) {
  const kind = existsSync(join(chapterDir, step, 'solution')) ? 'solution' : 'start';
  const out = resolve(OUT, 'aot', chapter, `${step}-${kind}`);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  writeFiles(join(out, 'src'), readStepDir(join(chapterDir, step, kind)));
  writeFileSync(join(out, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
  // ngc ищет @angular/* рядом с проектом: ссылка на node_modules курса
  symlinkSync(resolve(ROOT, 'node_modules'), join(out, 'node_modules'));
  let output = '';
  try {
    output = execFileSync('node', [ngc, '-p', 'tsconfig.json'], { cwd: out, encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    output = `${error.stdout ?? ''}${error.stderr ?? ''}` || error.message;
  }
  if (output.trim()) {
    failed++;
    console.log(`✗ ${step}/${kind}\n${output.trim()}\n`);
  } else {
    console.log(`✓ ${step}/${kind}`);
  }
}
console.log(failed ? `\nС замечаниями: ${failed}` : '\nВсё прошло');
process.exit(failed ? 1 : 0);
