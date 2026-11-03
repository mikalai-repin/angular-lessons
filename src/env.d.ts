/** Файлы public/assets (пути от public/) — их перечисляет плагин public-files в vite.config.ts */
declare module 'virtual:public-files' {
  const files: string[];
  export default files;
}

/** Уроки курса — их собирает плагин scripts/vite-course-content.mjs (src/content/course.ts) */
declare module 'virtual:course' {
  import type { FileMap, Part, Quiz, StepMeta } from './content/course';

  const course: {
    title: string;
    angularVersion: string;
    parts: Part[];
    chapters: {
      dir: string;
      title: string;
      description: string;
      part: number;
      hasQuiz: boolean;
      templateCheck?: boolean;
      steps: { dir: string; meta: StepMeta }[];
    }[];
    /** Справочные страницы content/pages/<slug>.md */
    pages: { slug: string; title: string; description?: string }[];
  };
  export default course;

  /** Содержимое главы: собственные файлы шагов (только изменения) и полный код базы первого шага */
  export interface ChapterSource {
    base?: FileMap;
    quiz?: Quiz;
    steps: { body: string; start: FileMap; solution: FileMap; check?: string }[];
  }
  /** Папка главы → загрузчик её чанка */
  export const sources: Record<string, () => Promise<{ default: ChapterSource }>>;
  /** Справочная страница → загрузчик её текста (markdown без frontmatter) */
  export const pageSources: Record<string, () => Promise<{ default: string }>>;
}
