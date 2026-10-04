// Полный код шагов на диске (Node). Шаг хранит только изменения: start/ — поверх результата предыдущего шага
// (только у startFrom: custom), solution/ — поверх старта, удаления — во frontmatter. Собирает шаги
// shared/step-chain.js — тот же модуль, что у платформы (src/content/course.ts).
// Используют валидатор (scripts/validate-content.mjs), браузерные проверки (tools/e2e/lib.mjs) и генераторы глав
// (tools/authoring/steps.py → step_dir).
//
// Выгрузить полный код шага в папку, чтобы посмотреть или прочитать его целиком:
//   npm run step content/06-lifecycle/05-content-children/solution [папка=tools/e2e/out/step]
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { resolveChapter } from '../shared/step-chain.js';

const isDir = (path) => existsSync(path) && statSync(path).isDirectory();

/** Все файлы папки (с подпапками): 'core/models.ts' → текст. Нет папки — пустой объект */
export function readFiles(dir) {
  const files = {};
  if (!isDir(dir)) return files;
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      if (isDir(path)) walk(path);
      else files[relative(dir, path)] = readFileSync(path, 'utf8');
    }
  };
  walk(dir);
  return files;
}

/** Frontmatter lesson.md шага (или пустой объект) */
export function readMeta(stepPath) {
  const lessonPath = join(stepPath, 'lesson.md');
  if (!existsSync(lessonPath)) return {};
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(lessonPath, 'utf8'));
  return match ? (parseYaml(match[1]) ?? {}) : {};
}

/** Папки шагов главы по порядку */
export function chapterSteps(chapterPath) {
  return readdirSync(chapterPath)
    .filter((name) => isDir(join(chapterPath, name)))
    .sort()
    .map((name) => join(chapterPath, name));
}

/** Полный код всех шагов главы: [{ path, meta, own: { start, solution }, start, solution }] */
export function resolveChapterDir(chapterPath) {
  const steps = chapterSteps(chapterPath).map((path) => ({
    path,
    meta: readMeta(path),
    own: { start: readFiles(join(path, 'start')), solution: readFiles(join(path, 'solution')) },
  }));
  const resolved = resolveChapter(steps.map(({ meta, own }) => ({ meta, ...own })));
  return steps.map((step, index) => ({ ...step, ...resolved[index] }));
}

function resolveStep(stepPath) {
  const step = resolveChapterDir(dirname(stepPath)).find((s) => s.path === resolve(stepPath));
  if (!step) throw new Error(`[step-files] нет шага ${stepPath}`);
  return step;
}

/** Полный старт шага */
export function readStart(stepPath) {
  return resolveStep(stepPath).start;
}

/** Код, которым шаг заканчивается: решение, а у шага без решения — старт */
export function readResult(stepPath) {
  const step = resolveStep(stepPath);
  return step.meta.noSolution ? step.start : step.solution;
}

/** Полный код шага по пути …/<шаг>/start или …/<шаг>/solution */
export function readStepDir(dir) {
  const step = resolveStep(dirname(resolve(dir)));
  return basename(dir) === 'start' ? step.start : readResult(step.path);
}

/** Записывает набор файлов в папку (папку предварительно очищает) */
export function writeFiles(dir, files) {
  rmSync(dir, { recursive: true, force: true });
  for (const [name, text] of Object.entries(files)) {
    const path = join(dir, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
}

// Запуск из командной строки: выгрузить полный код шага
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const [dir, out = 'tools/e2e/out/step'] = process.argv.slice(2);
  if (!dir || !['start', 'solution'].includes(basename(dir))) {
    console.error('Использование: npm run step <…/шаг/start | …/шаг/solution> [папка]');
    process.exit(1);
  }
  const files = readStepDir(dir);
  writeFiles(out, files);
  console.log(`${Object.keys(files).length} файлов → ${out}`);
}
