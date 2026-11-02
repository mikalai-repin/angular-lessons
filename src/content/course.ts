import { resolveChapter } from '../../shared/step-chain.js';
import type { ChainMeta, FileMap } from '../../shared/step-chain.js';
import courseIndex, { sources } from 'virtual:course';

/** Набор файлов шага: имя файла → исходный код */
export type { FileMap };

/** Frontmatter урока; поля цепочки шагов (startFrom, base, noSolution, removedIn…) — из ChainMeta */
export interface StepMeta extends ChainMeta {
  title: string;
  files?: string[];
  readonly?: string[];
  focus?: string;
  startFrom?: 'previous' | 'custom';
  /** Хеш полного кода базы (base) — его сверяет валидатор */
  baseHash?: string;
  api?: string[];
  /** Начальный адрес приложения в превью, по умолчанию '/' */
  url?: string;
  /** Настройки учебного бэкенда для шага */
  backend?: BackendConfig;
  /** Что показывает превью при входе на шаг: приложение (по умолчанию) или тесты *.spec.ts */
  preview?: 'app' | 'tests';
}

/** Настройки учебного бэкенда (public/backend/backend.js) */
export interface BackendConfig {
  /** Задержка ответа, мс */
  latency?: number;
  /** Доля запросов, которые отвечают 500 (0..1) */
  failRate?: number;
  /** Срок жизни access-токена, который выдаёт вход, с (по умолчанию 3600) */
  tokenTtl?: number;
}

export interface Step {
  /** Уникальный id для хранения прогресса: «templates/property-binding» */
  id: string;
  /** Папка на диске: «02-templates/02-property-binding» */
  dir: string;
  slug: string;
  /** Номер шага внутри главы, с нуля */
  index: number;
  meta: StepMeta;
  chapter: Chapter;
}

/** Шаг вместе с содержимым — оно приходит с чанком главы (loadChapter) */
export interface LoadedStep extends Step {
  body: string;
  start: FileMap;
  solution: FileMap;
  /** Порядок вкладок в редакторе */
  fileOrder: string[];
  /** Проверка шага — исходник check.ts (docs/lesson-format.md), если она есть */
  check?: string;
}

export interface Chapter {
  dir: string;
  slug: string;
  index: number;
  title: string;
  description: string;
  part: number;
  steps: Step[];
  /** Есть ли у главы квиз (quiz.yaml в папке главы); глава пройдена, когда квиз сдан */
  hasQuiz: boolean;
}

export interface ChapterContent {
  steps: LoadedStep[];
  quiz?: Quiz;
}

/** Вопрос квиза: тексты — markdown, первый вариант в options — правильный (на экране варианты перемешиваются) */
export interface QuizQuestion {
  question: string;
  options: string[];
  explanation: string;
  /** Папка шага главы, к которому относится вопрос: '03-render' */
  step: string;
}

export interface Quiz {
  questions: QuizQuestion[];
}

/** Доля правильных ответов, с которой квиз сдан */
export const QUIZ_PASS_RATE = 0.85;

/** Сколько правильных ответов нужно для зачёта: 13 вопросов → 12 */
export function quizPassScore(total: number): number {
  return Math.ceil(total * QUIZ_PASS_RATE);
}

export interface Part {
  title: string;
  description: string;
}

export interface Course {
  title: string;
  angularVersion: string;
  /** Части курса по порядку; chapter.part — номер части с единицы */
  parts: Part[];
  chapters: Chapter[];
}

// Уроки собирает плагин scripts/vite-course-content.mjs: оглавление (названия глав, frontmatter шагов) — в бандле
// страницы, всё остальное — отдельный чанк на каждую главу (src/env.d.ts — типы модулей плагина)

const stripOrder = (dir: string) => dir.replace(/^\d+-/, '');

const EXTENSION_ORDER = ['ts', 'html', 'css'];

/**
 * Порядок вкладок без `files` во frontmatter: файлы одного компонента рядом (.ts, .html, .css),
 * компоненты — по алфавиту путей, файлы в корне шага — раньше подпапок
 */
function compareFiles(a: string, b: string) {
  const key = (file: string) => {
    const dot = file.lastIndexOf('.');
    const base = file.slice(0, dot);
    const extension = EXTENSION_ORDER.indexOf(file.slice(dot + 1));
    return [file.includes('/') ? 1 : 0, base, extension === -1 ? EXTENSION_ORDER.length : extension] as const;
  };
  const [ka, kb] = [key(a), key(b)];
  return ka[0] - kb[0] || ka[1].localeCompare(kb[1]) || ka[2] - kb[2];
}

function orderFiles(meta: StepMeta, files: FileMap): string[] {
  const names = Object.keys(files);
  const ordered = meta.files ? meta.files.filter((name) => name in files) : [...names].sort(compareFiles);
  for (const name of names) if (!ordered.includes(name)) ordered.push(name);
  // main.ts — всегда первая вкладка
  return ordered.sort((a, b) => Number(b === 'main.ts') - Number(a === 'main.ts'));
}

function loadCourse(): Course {
  const chapters = courseIndex.chapters.map((info, chapterIndex): Chapter => {
    const chapter: Chapter = {
      dir: info.dir,
      slug: stripOrder(info.dir),
      index: chapterIndex,
      title: info.title,
      description: info.description,
      part: info.part,
      hasQuiz: info.hasQuiz,
      steps: [],
    };
    chapter.steps = info.steps.map(({ dir, meta }, index) => ({
      id: `${chapter.slug}/${stripOrder(dir)}`,
      dir: `${info.dir}/${dir}`,
      slug: stripOrder(dir),
      index,
      meta,
      chapter,
    }));
    return chapter;
  });
  return { title: courseIndex.title, angularVersion: courseIndex.angularVersion, parts: courseIndex.parts, chapters };
}

export const course = loadCourse();

const loaded = new Map<Chapter, Promise<ChapterContent>>();

/**
 * Содержимое главы: тексты, полный код каждого шага, проверки, квиз. Промис один на главу — его можно отдавать
 * в `use()`. Шаг хранит только изменения: start/ — поверх результата предыдущего шага (startFrom: custom; у первого
 * шага главы — поверх base из прошлой главы), solution/ — поверх старта. Полный код собирает shared/step-chain.js
 * (тот же модуль, что у валидатора)
 */
export function loadChapter(chapter: Chapter): Promise<ChapterContent> {
  let promise = loaded.get(chapter);
  if (!promise) {
    promise = sources[chapter.dir]().then(({ default: source }) => {
      const resolved = resolveChapter(
        chapter.steps.map((step, index) => ({ meta: step.meta, ...source.steps[index] })),
        () => source.base ?? {},
      );
      const steps = chapter.steps.map((step, index): LoadedStep => {
        const { start, solution } = resolved[index];
        return {
          ...step,
          body: source.steps[index].body,
          start,
          solution,
          fileOrder: orderFiles(step.meta, { ...solution, ...start }),
          check: source.steps[index].check,
        };
      });
      return { steps, quiz: source.quiz };
    });
    // Не загрузилось (сеть, новая версия на сервере) — следующий заход загрузит заново
    promise.catch(() => loaded.delete(chapter));
    loaded.set(chapter, promise);
  }
  return promise;
}

/** Все шаги курса подряд — для кнопок «Назад/Далее» через границы глав */
export const allSteps: Step[] = course.chapters.flatMap((chapter) => chapter.steps);

export function findStep(chapterSlug?: string, stepSlug?: string): Step | undefined {
  return allSteps.find((step) => step.chapter.slug === chapterSlug && step.slug === stepSlug);
}

/** Соседние шаги для «Назад / Далее» */
export function neighbours(step: Step): { prev?: Step; next?: Step } {
  const index = allSteps.findIndex((other) => other.id === step.id);
  return { prev: allSteps[index - 1], next: allSteps[index + 1] };
}

export function stepPath(step: Step): string {
  return `/${step.chapter.slug}/${step.slug}`;
}

export function quizPath(chapter: Chapter): string {
  return `/${chapter.slug}/quiz`;
}

export function findChapter(slug?: string): Chapter | undefined {
  return course.chapters.find((chapter) => chapter.slug === slug);
}

/** Куда ведёт «Далее» с шага: после последнего шага главы — на квиз главы, иначе — на следующий шаг */
export function nextPath(step: Step): string | undefined {
  const isLast = step.index === step.chapter.steps.length - 1;
  if (isLast && step.chapter.hasQuiz) return quizPath(step.chapter);
  const { next } = neighbours(step);
  return next && stepPath(next);
}

/** «02-templates/02-property-binding» → шаг; используется для ссылок `step:` в markdown */
export function findStepByDir(dir: string): Step | undefined {
  return allSteps.find((step) => step.dir === dir);
}
