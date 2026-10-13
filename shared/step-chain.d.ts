// Типы для shared/step-chain.js (сборка полного кода шагов главы)
export type FileMap = Record<string, string>;

export interface ChainMeta {
  startFrom?: string;
  /** У первого шага главы: шаг прошлой главы ('07-directives-pipes/07-practice'), поверх результата которого start/ */
  base?: string;
  /** Шаг без задания (демо, теория): кнопки «Решение» нет */
  noSolution?: boolean;
  /** Файлы результата предыдущего шага, которых нет в custom-старте (закадровая подготовка) */
  removedInStart?: string[];
  /** Файлы старта, которые ученик удаляет в этом шаге */
  removedInSolution?: string[];
}

export function parseLesson(text: string): { meta: Record<string, unknown>; body: string } | null;

export function resolveChapter(
  steps: { meta: ChainMeta; start: FileMap; solution: FileMap }[],
  resultOf?: (ref: string) => FileMap,
): { base: FileMap; start: FileMap; solution: FileMap }[];

export function stepResult(meta: ChainMeta, step: { start: FileMap; solution: FileMap }): FileMap;
