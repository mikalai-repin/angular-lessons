// Следит за плитками каталога и после каждого изменения пишет в консоль, что стало с DOM:
// сколько плиток создано заново, сколько перемещено, сколько удалено и сколько текстов переписано.
// Только для изучения — в приложении такое не нужно.

export function watchCatalog() {
  const grid = document.querySelector('.grid');
  if (!grid) return;
  const seen = new WeakSet<Node>(
    grid.querySelectorAll('.tile'),
  );

  new MutationObserver((records) => {
    const added = new Set<Node>();
    const removed = new Set<Node>();
    let texts = 0;
    for (const record of records) {
      if (record.type === 'characterData') texts++;
      if (record.target !== grid) continue;
      record.addedNodes.forEach(
        (node) =>
          node instanceof HTMLElement &&
          node.matches('.tile') &&
          added.add(node),
      );
      record.removedNodes.forEach(
        (node) =>
          node instanceof HTMLElement &&
          node.matches('.tile') &&
          removed.add(node),
      );
    }
    // Плитка, которую убрали и тут же вставили, — перемещённая, а не новая
    const moved = [...added].filter((node) =>
      seen.has(node),
    ).length;
    const created = added.size - moved;
    const deleted = [...removed].filter(
      (node) => !added.has(node),
    ).length;
    added.forEach((node) => seen.add(node));
    console.log(
      `Плитки: создано ${created}, перемещено ${moved}, удалено ${deleted}; текстов переписано: ${texts}`,
    );
  }).observe(grid, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}
