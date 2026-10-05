// Печатает граф сигналов компонента: что читает каждый сигнал и кто читает его.
// Опирается на внутреннее устройство Angular (узлы за символом SIGNAL) — только для изучения, не для приложения.

// Узел графа: у сигнала-функции он лежит в свойстве с символом SIGNAL
function nodeOf(value: unknown): any {
  if (typeof value !== 'function') return null;
  const symbol = Object.getOwnPropertySymbols(value).find(
    (s) => s.description === 'SIGNAL',
  );
  return symbol ? (value as any)[symbol] : null;
}

// Связи узла хранятся списками: producers → nextProducer, consumers → nextConsumer
function linked(
  first: any,
  end: 'producer' | 'consumer',
): Set<any> {
  const nodes = new Set();
  for (
    let link = first;
    link;
    link =
      end === 'producer' ? link.nextProducer : link.nextConsumer
  ) {
    nodes.add(link[end]);
  }
  return nodes;
}

export function printSignalGraph(component: object) {
  // Имена узлов — имена полей компонента; у шаблона и эффектов полей нет
  const names = new Map<any, string>();
  for (const [name, value] of Object.entries(component)) {
    const node = nodeOf(value);
    if (node) names.set(node, name);
  }
  const nameOf = (node: any) =>
    names.get(node) ??
    (node.kind === 'template' ? 'шаблон' : 'эффект');
  const list = (nodes: Set<any>) =>
    [...nodes].map(nameOf).join(', ') || '—';

  for (const [node, name] of names) {
    const reads = list(linked(node.producers, 'producer'));
    const readBy = list(linked(node.consumers, 'consumer'));
    console.log(
      `${name} (${node.kind}): читает ${reads}; его читают ${readBy}`,
    );
  }
}
