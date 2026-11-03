// Проверка контента курса: структура шагов, цепочка start/solution (шаг хранит только изменения — см.
// shared/step-chain.js) и сборка кода шага тем же модулем, что и превью (ловит ненайденные templateUrl/styleUrl
// и синтаксические ошибки). Полный код каждого старта и решения выгружает в .content-check/ и собирает там ngc
// (AOT, без вывода файлов): типы TS и шаблонов (strictTemplates), расширенная диагностика шаблонов.
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { parse as parseYaml } from 'yaml';
import { angularJitApplicationTransform, performCompilation, readConfiguration } from '@angular/compiler-cli';
import { compileFiles } from '../shared/compile-core.js';
import { filesHash, isDir, readResult, resolveChapterDir, writeFiles } from './step-files.mjs';

const root = join(import.meta.dirname, '..', 'content');
const checkDir = join(import.meta.dirname, '..', '.content-check');
const errors = [];
const QUIZ_MIN = 10;
const QUIZ_MAX = 15;

const course = JSON.parse(readFileSync(join(root, 'course.json'), 'utf8'));
let stepCount = 0;
rmSync(checkDir, { recursive: true, force: true });

// Файлы оверлея, совпадающие с базой (копии), и удаления, которых в базе нет
function checkOverlay(where, kind, base, own, removed = []) {
  for (const name of Object.keys(own)) {
    if (base[name] === own[name])
      errors.push(`${where}/${kind}/${name}: совпадает с тем, что было до шага, — копия, удалите её`);
  }
  for (const name of removed) {
    if (!(name in base))
      errors.push(`${where}: removedIn${kind === 'start' ? 'Start' : 'Solution'}: файла ${name} и так нет`);
    if (name in own) errors.push(`${where}: ${name} и удалён, и лежит в ${kind}/`);
  }
}

for (const [chapterIndex, chapterDir] of course.chapters.entries()) {
  const chapterPath = join(root, chapterDir);
  if (!existsSync(join(chapterPath, 'chapter.json'))) {
    errors.push(`${chapterDir}: нет chapter.json`);
    continue;
  }

  const steps = resolveChapterDir(chapterPath);
  for (const [index, step] of steps.entries()) {
    stepCount++;
    const stepDir = step.path.split('/').at(-1);
    const where = `${chapterDir}/${stepDir}`;
    if (!/^\d{2}-[a-z0-9-]+$/.test(stepDir)) errors.push(`${where}: имя папки должно быть вида NN-slug`);

    // base — то, поверх чего лежит start/: результат предыдущего шага (у первого шага главы — шага из `base`)
    const { meta, metaError, own, base, start, solution } = step;
    if (metaError) errors.push(`${where}: ${metaError}`);
    else if (!meta.title) errors.push(`${where}: во frontmatter нет title`);

    const startFrom = meta.startFrom ?? 'previous';
    // База первого шага главы — результат шага прошлой главы (base) с хешем (baseHash)
    if (meta.base !== undefined || meta.baseHash !== undefined) {
      const baseChapter = String(meta.base ?? '').split('/')[0];
      if (index !== 0) errors.push(`${where}: base и baseHash бывают только у первого шага главы`);
      else if (!meta.base || !meta.baseHash) errors.push(`${where}: нужны оба поля — base и baseHash`);
      else if (course.chapters.indexOf(baseChapter) < 0 || course.chapters.indexOf(baseChapter) >= chapterIndex) {
        errors.push(`${where}: base ${meta.base} — не шаг одной из предыдущих глав курса`);
      } else if (!isDir(join(root, meta.base))) {
        errors.push(`${where}: base ${meta.base} — нет такого шага`);
      } else {
        const actual = filesHash(readResult(join(root, meta.base)));
        if (String(meta.baseHash) !== actual) {
          errors.push(
            `${where}: база ${meta.base} изменилась (baseHash ${meta.baseHash}, сейчас ${actual}) — ` +
              `проверьте, что изменения подходят главе, и перезапустите её генератор`,
          );
        }
      }
    }
    if (startFrom === 'previous') {
      if (index === 0) errors.push(`${where}: первый шаг главы должен иметь startFrom: custom`);
      if (isDir(join(step.path, 'start')))
        errors.push(`${where}: startFrom: previous, но есть папка start/ — нужен startFrom: custom (или удалите её)`);
      if (meta.removedInStart) errors.push(`${where}: removedInStart бывает только у startFrom: custom`);
    } else {
      checkOverlay(where, 'start', base, own.start, meta.removedInStart);
      if (index > 0 && !Object.keys(own.start).length && !meta.removedInStart?.length) {
        errors.push(
          `${where}: startFrom: custom, но старт ничем не отличается от результата предыдущего шага — нужен startFrom: previous`,
        );
      }
    }
    if (meta.noSolution) {
      if (Object.keys(own.solution).length) errors.push(`${where}: noSolution: true, но папка solution/ не пуста`);
      if (meta.removedInSolution) errors.push(`${where}: noSolution: true, но есть removedInSolution`);
    } else {
      checkOverlay(where, 'solution', start, own.solution, meta.removedInSolution);
      if (!Object.keys(own.solution).length && !meta.removedInSolution?.length) {
        errors.push(`${where}: решение не отличается от старта — нужен noSolution: true или файлы в solution/`);
      }
      if (!solution['main.ts']) errors.push(`${where}: в решении нет main.ts`);
    }
    if (!start['main.ts']) errors.push(`${where}: в старте нет main.ts`);

    // Старт со startFrom: previous — результат предыдущего шага, он уже проверен
    for (const [kind, files] of [
      ['start', startFrom === 'custom' ? start : {}],
      ['solution', solution],
    ]) {
      if (!Object.keys(files).length) continue;
      // brokenStart: стартовый код намеренно содержит ошибки (шаг про отладку) — не собираем и не проверяем типы
      if (kind === 'start' && meta.brokenStart) continue;
      const { errors: buildErrors } = compileFiles(ts, angularJitApplicationTransform, files);
      for (const error of buildErrors) errors.push(`${where}/${kind}: ${error}`);
      writeFiles(join(checkDir, chapterDir, stepDir, kind), files);
    }

    // Проверка шага (check.ts): собирается и проверяется по типам вместе с кодом шагов
    const checkPath = join(step.path, 'check.ts');
    if (existsSync(checkPath)) {
      if (meta.noSolution) errors.push(`${where}: check.ts у шага без решения (noSolution) — проверять нечего`);
      const files = { 'check.ts': readFileSync(checkPath, 'utf8') };
      const { errors: buildErrors } = compileFiles(ts, angularJitApplicationTransform, files);
      for (const error of buildErrors) errors.push(`${where}/${error}`);
      writeFiles(join(checkDir, chapterDir, stepDir, 'check'), files);
    }
  }

  checkQuiz(chapterDir, chapterPath, new Set(steps.map((step) => step.path.split('/').at(-1))));
}

// Квиз главы (quiz.yaml, необязательный): 10–15 вопросов, у каждого 3–5 разных вариантов (первый — правильный), пояснение и шаг главы
function checkQuiz(chapterDir, chapterPath, stepDirs) {
  const where = `${chapterDir}/quiz.yaml`;
  const path = join(chapterPath, 'quiz.yaml');
  if (!existsSync(path)) return;
  let quiz;
  try {
    quiz = parseYaml(readFileSync(path, 'utf8'));
  } catch (error) {
    errors.push(`${where}: ошибка YAML: ${error.message.split('\n')[0]}`);
    return;
  }
  const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];
  if (questions.length < QUIZ_MIN || questions.length > QUIZ_MAX)
    errors.push(`${where}: вопросов ${questions.length}, нужно от ${QUIZ_MIN} до ${QUIZ_MAX}`);
  const texts = new Set();
  for (const [index, q] of questions.entries()) {
    const at = `${where}, вопрос ${index + 1}`;
    const isText = (value) => typeof value === 'string' && value.trim() !== '';
    if (!isText(q?.question)) errors.push(`${at}: нет question`);
    else if (texts.has(q.question.trim())) errors.push(`${at}: такой вопрос уже есть`);
    else texts.add(q.question.trim());
    if (!isText(q?.explanation)) errors.push(`${at}: нет explanation`);
    if (!stepDirs.has(q?.step)) errors.push(`${at}: step ${q?.step} — нет такого шага в главе`);
    const options = Array.isArray(q?.options) ? q.options : [];
    if (options.length < 3 || options.length > 5) errors.push(`${at}: вариантов ${options.length}, нужно от 3 до 5`);
    if (!options.every(isText)) errors.push(`${at}: каждый вариант — непустая строка`);
    else if (new Set(options.map((o) => o.trim())).size !== options.length) errors.push(`${at}: варианты повторяются`);
  }
}

// Справочные страницы (content/pages/<slug>.md, адрес /<slug>) и внутренние ссылки уроков, квизов и страниц:
// step:<глава>/<шаг> — на существующий шаг, page:<slug> — на существующую страницу
const pagesDir = join(root, 'pages');
const pageSlugs = new Set(
  isDir(pagesDir)
    ? readdirSync(pagesDir)
        .filter((name) => name.endsWith('.md'))
        .map((name) => name.slice(0, -3))
    : [],
);
const linkSources = [];
for (const slug of pageSlugs) {
  const where = `pages/${slug}.md`;
  const text = readFileSync(join(pagesDir, `${slug}.md`), 'utf8');
  if (!/^[a-z0-9-]+$/.test(slug)) errors.push(`${where}: имя файла — латиница в kebab-case`);
  if (!/^---\n[\s\S]*?^title: .+$[\s\S]*?\n---\n/m.test(text)) errors.push(`${where}: во frontmatter нет title`);
  linkSources.push([where, text]);
}
const stepIds = new Set();
for (const chapterDir of course.chapters) {
  for (const step of resolveChapterDir(join(root, chapterDir))) {
    const stepDir = step.path.split('/').at(-1);
    stepIds.add(`${chapterDir}/${stepDir}`);
    linkSources.push([`${chapterDir}/${stepDir}`, readFileSync(join(step.path, 'lesson.md'), 'utf8')]);
  }
  const quizPath = join(root, chapterDir, 'quiz.yaml');
  if (existsSync(quizPath)) linkSources.push([`${chapterDir}/quiz.yaml`, readFileSync(quizPath, 'utf8')]);
}
for (const [where, text] of linkSources) {
  for (const [, scheme, target] of text.matchAll(/\]\((step|page):([^)\s]*)\)/g)) {
    if (scheme === 'step' && !stepIds.has(target)) errors.push(`${where}: ссылка step:${target} — нет такого шага`);
    if (scheme === 'page' && !pageSlugs.has(target))
      errors.push(`${where}: ссылка page:${target} — нет такой страницы`);
  }
}

// Проверка полного кода шагов ngc: настройки — из tsconfig.content.json
writeFileSync(
  join(checkDir, 'tsconfig.json'),
  JSON.stringify(
    {
      extends: '../tsconfig.content.json',
      include: ['**/*.ts', '../shared/course-check.d.ts', '../shared/vitest.d.ts'],
    },
    null,
    2,
  ) + '\n',
);

checkAot();

// ngc по всему .content-check/ разом (~30 с): ошибки TS и шаблонов, предупреждения расширенной диагностики.
// Предупреждение — тоже ошибка, кроме NG8113 (импорт не используется в шаблоне) в старте: там импорты
// заготовлены для кода, который напишет ученик.
function checkAot() {
  const config = readConfiguration(join(checkDir, 'tsconfig.json'));
  // Все стадии сразу: стандартный сбор диагностики после первой ошибки TS не проверяет шаблоны, а здесь в одной
  // программе все шаги — ошибка в одном скрыла бы ошибки шаблонов в остальных
  const gatherDiagnostics = (program) => {
    const options = [...program.getTsOptionDiagnostics(), ...program.getNgOptionDiagnostics()];
    if (options.length) return options;
    return [
      ...program.getTsSyntacticDiagnostics(),
      ...program.getTsSemanticDiagnostics(),
      ...program.getNgStructuralDiagnostics(),
      ...program.getNgSemanticDiagnostics(),
    ];
  };
  const { diagnostics } = performCompilation({
    rootNames: config.rootNames,
    options: config.options,
    gatherDiagnostics,
  });
  for (const d of [...config.errors, ...diagnostics]) {
    const path = d.file ? relative(checkDir, d.file.fileName) : '';
    if (d.category === ts.DiagnosticCategory.Warning && d.code === -998113 && path.split('/')[2] === 'start') continue;
    const at = d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start) : undefined;
    const code = String(d.code).startsWith('-99') ? `NG${String(d.code).slice(3)}` : `TS${d.code}`;
    const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
    errors.push(`${path}${at ? `:${at.line + 1}:${at.character + 1}` : ''}: ${code} ${message}`);
  }
}

for (const error of errors) console.error(`✗ ${error}`);
console.log(`Проверено шагов: ${stepCount}. Ошибок: ${errors.length}.`);
process.exit(errors.length ? 1 : 0);
