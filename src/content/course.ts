import { parse as parseYaml } from 'yaml';

/** Набор файлов шага: имя файла → исходный код */
export type FileMap = Record<string, string>;

export interface StepMeta {
  title: string;
  files?: string[];
  readonly?: string[];
  focus?: string;
  startFrom?: 'previous' | 'custom';
  api?: string[];
  /** Шаг без задания (демо, теория): кнопки «Решение» нет */
  noSolution?: boolean;
  /** Начальный адрес приложения в превью, по умолчанию '/' */
  url?: string;
  /** Настройки учебного бэкенда для шага */
  backend?: BackendConfig;
}

/** Настройки учебного бэкенда (public/backend/backend.js) */
export interface BackendConfig {
  /** Задержка ответа, мс */
  latency?: number;
  /** Доля запросов, которые отвечают 500 (0..1) */
  failRate?: number;
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
  body: string;
  start: FileMap;
  solution: FileMap;
  /** Порядок вкладок в редакторе */
  fileOrder: string[];
  chapter: Chapter;
}

export interface Chapter {
  dir: string;
  slug: string;
  index: number;
  title: string;
  description: string;
  part: number;
  steps: Step[];
  /** Служебная глава (devChapters): только в режиме разработки, вне цепочки «Назад / Далее» */
  dev: boolean;
}

export interface Course {
  title: string;
  angularVersion: string;
  chapters: Chapter[];
  /** Служебные главы для проверки платформы (песочница). В продакшен-сборку не попадают */
  devChapters: Chapter[];
}

// Vite собирает content/ в бандл на этапе сборки. Песочница (служебная глава из devChapters) подключается
// только в режиме разработки: в продакшене ветка с import.meta.env.DEV = false удаляется вместе с её файлами.
// Путь песочницы здесь задан явно: шаблоны import.meta.glob должны быть литералами
const raw: Record<string, string> = {
  ...import.meta.glob<string>(['/content/**/*', '!/content/00-sandbox/**'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...(import.meta.env.DEV
    ? import.meta.glob<string>('/content/00-sandbox/**/*', { query: '?raw', import: 'default', eager: true })
    : {}),
};

const stripOrder = (dir: string) => dir.replace(/^\d+-/, '');

function readJson<T>(path: string): T {
  const text = raw[path];
  if (text === undefined) throw new Error(`[content] не найден файл ${path}`);
  return JSON.parse(text) as T;
}

function parseLesson(path: string): { meta: StepMeta; body: string } {
  const text = raw[path];
  if (text === undefined) throw new Error(`[content] не найден файл ${path}`);
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) throw new Error(`[content] нет frontmatter в ${path}`);
  try {
    return { meta: parseYaml(match[1]) as StepMeta, body: match[2] };
  } catch (error) {
    throw new Error(`[content] ошибка YAML во frontmatter ${path}: ${(error as Error).message}`);
  }
}

function collectFiles(prefix: string): FileMap {
  const files: FileMap = {};
  for (const [path, text] of Object.entries(raw)) {
    if (path.startsWith(prefix)) files[path.slice(prefix.length)] = text;
  }
  return files;
}

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
  const courseJson = readJson<{ title: string; angularVersion: string; chapters: string[]; devChapters?: string[] }>(
    '/content/course.json',
  );

  const loadChapter = (chapterDir: string, chapterIndex: number, dev: boolean): Chapter => {
    const info = readJson<{ title: string; description: string; part: number }>(`/content/${chapterDir}/chapter.json`);
    const chapter: Chapter = {
      dir: chapterDir,
      slug: stripOrder(chapterDir),
      index: chapterIndex,
      title: info.title,
      description: info.description,
      part: info.part,
      steps: [],
      dev,
    };

    const stepDirs = new Set<string>();
    const prefix = `/content/${chapterDir}/`;
    for (const path of Object.keys(raw)) {
      if (!path.startsWith(prefix)) continue;
      const rest = path.slice(prefix.length).split('/');
      if (rest.length > 1) stepDirs.add(rest[0]);
    }

    // Шаг со startFrom: previous не хранит папку start/: его старт — решение предыдущего шага
    // (у шага без решения — его собственный старт). Так в content/ нет копий одних и тех же файлов
    let previousResult: FileMap = {};
    chapter.steps = [...stepDirs].sort().map((stepDir, index): Step => {
      const base = `${prefix}${stepDir}/`;
      const { meta, body } = parseLesson(`${base}lesson.md`);
      const ownStart = collectFiles(`${base}start/`);
      const start =
        Object.keys(ownStart).length || meta.startFrom === 'custom' ? ownStart : { ...previousResult };
      const solution = collectFiles(`${base}solution/`);
      previousResult = Object.keys(solution).length ? solution : start;
      return {
        id: `${chapter.slug}/${stripOrder(stepDir)}`,
        dir: `${chapterDir}/${stepDir}`,
        slug: stripOrder(stepDir),
        index,
        meta,
        body,
        start,
        solution,
        fileOrder: orderFiles(meta, { ...solution, ...start }),
        chapter,
      };
    });

    return chapter;
  };

  const chapters = courseJson.chapters.map((dir, index) => loadChapter(dir, index, false));
  const devChapters = import.meta.env.DEV ? (courseJson.devChapters ?? []).map((dir, index) => loadChapter(dir, index, true)) : [];
  return { title: courseJson.title, angularVersion: courseJson.angularVersion, chapters, devChapters };
}

export const course = loadCourse();

/** Все шаги курса подряд — для кнопок «Назад/Далее» через границы глав */
export const allSteps: Step[] = course.chapters.flatMap((chapter) => chapter.steps);

/** Шаги служебных глав: открываются по ссылке и из оглавления, но не по «Назад / Далее» */
const devSteps: Step[] = course.devChapters.flatMap((chapter) => chapter.steps);

export function findStep(chapterSlug?: string, stepSlug?: string): Step | undefined {
  return [...allSteps, ...devSteps].find((step) => step.chapter.slug === chapterSlug && step.slug === stepSlug);
}

/** Соседние шаги для «Назад / Далее»: в служебной главе — только внутри неё */
export function neighbours(step: Step): { prev?: Step; next?: Step } {
  const list = step.chapter.dev ? step.chapter.steps : allSteps;
  const index = list.indexOf(step);
  return { prev: list[index - 1], next: list[index + 1] };
}

export function stepPath(step: Step): string {
  return `/${step.chapter.slug}/${step.slug}`;
}

/** «02-templates/02-property-binding» → шаг; используется для ссылок `step:` в markdown */
export function findStepByDir(dir: string): Step | undefined {
  return [...allSteps, ...devSteps].find((step) => step.dir === dir);
}
