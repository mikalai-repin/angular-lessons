// Сборка полного кода шагов главы из того, что лежит на диске. Общая для платформы (src/content/course.ts)
// и Node (scripts/step-files.mjs → валидатор, tools/e2e, генераторы глав).
//
// Шаг хранит только то, что в нём поменялось:
// - start/ — только у шагов startFrom: custom; это файлы, которые добавлены или изменены поверх результата
//   предыдущего шага главы (у первого шага главы предыдущего нет — его start/ и есть полный снимок);
// - solution/ — файлы, которые добавлены или изменены поверх старта шага;
// - удалённые файлы перечисляются во frontmatter: removedInStart (закадровая подготовка custom-старта)
//   и removedInSolution (их удаляет ученик).
// Результат шага — его решение, а у шага с noSolution — его старт.

/**
 * @typedef {Record<string, string>} FileMap
 * @typedef {{ startFrom?: string, noSolution?: boolean, removedInStart?: string[], removedInSolution?: string[] }} ChainMeta
 * @param {{ meta: ChainMeta, start: FileMap, solution: FileMap }[]} steps — шаги главы по порядку: frontmatter и
 *   собственные файлы папок start/ и solution/
 * @returns {{ start: FileMap, solution: FileMap }[]} полный код старта и решения каждого шага
 *   (у шага с noSolution решение — пустой объект)
 */
export function resolveChapter(steps) {
  let previousResult = {};
  return steps.map(({ meta, start: ownStart, solution: ownSolution }) => {
    const start =
      meta.startFrom === 'custom' ? overlay(previousResult, ownStart, meta.removedInStart) : { ...previousResult };
    const solution = meta.noSolution ? {} : overlay(start, ownSolution, meta.removedInSolution);
    previousResult = meta.noSolution ? start : solution;
    return { start, solution };
  });
}

/** base + изменения − удалённые файлы */
function overlay(base, changes, removed = []) {
  const files = { ...base, ...changes };
  for (const name of removed) delete files[name];
  return files;
}
