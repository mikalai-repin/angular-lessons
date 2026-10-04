// Проверка контента курса: структура шагов, цепочка start/solution и сборка кода шага тем же модулем,
// что и превью (ловит ненайденные templateUrl/styleUrl и синтаксические ошибки).
// Запуск: npm run validate (типы кода уроков проверяет отдельно `tsc -p tsconfig.content.json`)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { angularJitApplicationTransform } from '@angular/compiler-cli';
import { parse as parseYaml } from 'yaml';
import { compileFiles } from '../shared/compile-core.js';
import { readFiles, readResult, readStart } from './step-files.mjs';

const root = join(import.meta.dirname, '..', 'content');
const errors = [];
const warnings = [];

const isDir = (path) => existsSync(path) && statSync(path).isDirectory();

const course = JSON.parse(readFileSync(join(root, 'course.json'), 'utf8'));
// tsconfig.content.json с комментариями: убираем строки-комментарии перед разбором
const contentTsconfig = JSON.parse(
  readFileSync(join(root, '..', 'tsconfig.content.json'), 'utf8').replace(/^\s*\/\/.*$/gm, ''),
);
const contentExcludes = contentTsconfig.exclude ?? [];
let stepCount = 0;

// Служебные главы (devChapters, песочница) проверяются так же, как обычные
for (const chapterDir of [...course.chapters, ...(course.devChapters ?? [])]) {
  const chapterPath = join(root, chapterDir);
  if (!existsSync(join(chapterPath, 'chapter.json'))) {
    errors.push(`${chapterDir}: нет chapter.json`);
    continue;
  }

  const steps = readdirSync(chapterPath).filter((name) => isDir(join(chapterPath, name))).sort();

  for (const stepDir of steps) {
    stepCount++;
    const where = `${chapterDir}/${stepDir}`;
    const stepPath = join(chapterPath, stepDir);
    if (!/^\d{2}-[a-z0-9-]+$/.test(stepDir)) errors.push(`${where}: имя папки должно быть вида NN-slug`);

    const lessonPath = join(stepPath, 'lesson.md');
    let meta = {};
    if (!existsSync(lessonPath)) {
      errors.push(`${where}: нет lesson.md`);
    } else {
      const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(lessonPath, 'utf8'));
      if (!match) errors.push(`${where}: нет frontmatter`);
      else {
        try {
          meta = parseYaml(match[1]) ?? {};
        } catch (error) {
          errors.push(`${where}: ошибка YAML во frontmatter: ${error.message.split('\n')[0]}`);
        }
      }
      if (!meta.title) errors.push(`${where}: во frontmatter нет title`);
    }

    const startFrom = meta.startFrom ?? 'previous';
    const ownStart = readFiles(join(stepPath, 'start'));
    const solution = readFiles(join(stepPath, 'solution'));
    // startFrom: previous — папки start/ нет: старт = результат предыдущего шага (scripts/step-files.mjs)
    if (startFrom === 'previous') {
      if (steps.indexOf(stepDir) === 0) errors.push(`${where}: первый шаг главы должен иметь startFrom: custom`);
      if (isDir(join(stepPath, 'start'))) {
        const same = JSON.stringify(ownStart) === JSON.stringify(readResult(join(chapterPath, steps[steps.indexOf(stepDir) - 1] ?? '')));
        errors.push(
          `${where}: startFrom: previous, но есть папка start/ — ${same ? 'это копия результата предыдущего шага, удалите её' : 'она отличается от результата предыдущего шага: нужен startFrom: custom'}`,
        );
      }
    }
    const start = startFrom === 'previous' ? readStart(stepPath) : ownStart;
    if (!start['main.ts']) errors.push(`${where}: нет start/main.ts`);
    if (meta.noSolution && Object.keys(solution).length) errors.push(`${where}: noSolution: true, но папка solution/ не пуста`);
    if (!solution['main.ts'] && !meta.noSolution) warnings.push(`${where}: нет solution/main.ts — кнопки «Решение» не будет`);

    // Старт со startFrom: previous уже собран как результат предыдущего шага — повторно не собираем
    for (const [kind, files] of [['start', startFrom === 'custom' ? start : {}], ['solution', solution]]) {
      if (!Object.keys(files).length) continue;
      // brokenStart: стартовый код намеренно содержит ошибки (шаг про отладку)
      if (kind === 'start' && meta.brokenStart) {
        if (!contentExcludes.some((pattern) => pattern.startsWith(`content/${where}/start`))) {
          errors.push(`${where}: brokenStart: true, но папка start/ не исключена в tsconfig.content.json → exclude`);
        }
        continue;
      }
      const { errors: buildErrors } = compileFiles(ts, angularJitApplicationTransform, files);
      for (const error of buildErrors) errors.push(`${where}/${kind}: ${error}`);
    }

  }
}

for (const warning of warnings) console.warn(`⚠ ${warning}`);
for (const error of errors) console.error(`✗ ${error}`);
console.log(`Проверено шагов: ${stepCount}. Ошибок: ${errors.length}, предупреждений: ${warnings.length}.`);
process.exit(errors.length ? 1 : 0);
