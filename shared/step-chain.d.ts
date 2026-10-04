// Типы для shared/step-chain.js (сборка полного кода шагов главы)
export type FileMap = Record<string, string>;

export interface ChainMeta {
  startFrom?: string;
  noSolution?: boolean;
  removedInStart?: string[];
  removedInSolution?: string[];
}

export function resolveChapter(
  steps: { meta: ChainMeta; start: FileMap; solution: FileMap }[],
): { start: FileMap; solution: FileMap }[];
