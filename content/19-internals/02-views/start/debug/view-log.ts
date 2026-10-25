// Alt + щелчок по элементу превью: в консоли — представление (LView), в котором Angular создал элемент,
// и его общая часть (TView). Щелчок с Alt только пишет журнал: кнопка под курсором не сработает.
// Читает внутренние структуры Angular (ɵ) — только для изучения: в приложении так не делают.
import { ɵgetLContext as getLContext } from '@angular/core';

// Номера ячеек заголовка LView — константы из исходников @angular/core 22.2
const HOST = 0;
const TVIEW = 1;
const FLAGS = 2;
const PARENT = 3;
const CONTEXT = 8;
const HEADER_OFFSET = 28;

// Флаги представления (LViewFlags): бит → название
const FLAG_NAMES: [number, string][] = [
  [4, 'CreationMode'],
  [16, 'CheckAlways'],
  [64, 'Dirty'],
  [128, 'Attached'],
  [256, 'Destroyed'],
  [512, 'IsRoot'],
  [1024, 'RefreshView'],
  [8192, 'HasChildViewsToRefresh'],
];

// TView.type: корневое представление, шаблон компонента или встроенное (@if, @for, @defer)
const VIEW_KINDS = ['корневое', 'компонент', 'встроенное'];

export function logViewOnAltClick() {
  window.addEventListener(
    'click',
    (event) => {
      if (!event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      const element = event.target as Element;
      // Элемент знает своё представление: Angular записал в него __ngContext__ — номер LView
      const context = getLContext(element);
      if (!context?.lView) return;
      printView(
        element,
        context.lView as any[],
        context.nodeIndex,
      );
    },
    // Фаза перехвата: журнал срабатывает раньше обработчиков Angular
    true,
  );
}

function printView(
  element: Element,
  lView: any[],
  index: number,
) {
  const tView = lView[TVIEW];
  const tNode = tView.data[index];
  const {
    bindingStartIndex: bindings,
    expandoStartIndex: expando,
  } = tView;
  console.log(
    `${tag(element)} — узел ${index - HEADER_OFFSET} шаблона ${owner(lView)}, ячейка ${index} его LView`,
  );
  console.log(
    `TNode узла: тег ${tNode.value}, атрибуты ${JSON.stringify(tNode.attrs)}`,
  );
  console.log(`LView — массив из ${lView.length} ячеек:`);
  console.log(
    `  0–27 заголовок: HOST ${tag(lView[HOST])}, FLAGS ${flags(lView[FLAGS])}, PARENT ${lView[PARENT] ? owner(parentView(lView)) : '—'}, CONTEXT ${name(lView[CONTEXT])}`,
  );
  console.log(
    `  ${HEADER_OFFSET}–${bindings - 1} узлы: ${range(lView, HEADER_OFFSET, bindings, slot)}`,
  );
  console.log(
    `  ${bindings}–${expando - 1} привязки: ${range(lView, bindings, expando, value)}`,
  );
  console.log(
    `  ${expando}–${lView.length - 1} прочее: ${summary(lView.slice(expando))}`,
  );
  // Сколько живых представлений на странице устроены по этому же TView
  const same = [...document.querySelectorAll('*')].filter(
    (el) => {
      const c = getLContext(el);
      return (
        c?.lView &&
        (c.lView as any[])[TVIEW] === tView &&
        c.nodeIndex === index
      );
    },
  ).length;
  console.log(
    `TView ${owner(lView)} — общий для ${same} таких представлений на странице`,
  );
}

// У встроенного представления родитель — LContainer (массив с true во второй ячейке), над ним — представление
function parentView(lView: any[]): any[] {
  const parent = lView[PARENT];
  return parent[TVIEW] === true ? parent[PARENT] : parent;
}

// Чей шаблон: контекст компонента — его экземпляр, у встроенного представления — служебный объект
function owner(lView: any[]): string {
  return `${name(lView[CONTEXT])} (${VIEW_KINDS[lView[TVIEW].type]})`;
}

function flags(bits: number): string {
  return FLAG_NAMES.filter(([bit]) => bits & bit)
    .map(([, title]) => title)
    .join(' + ');
}

function range(
  lView: any[],
  from: number,
  to: number,
  show: (item: any) => string,
): string {
  const items: string[] = [];
  for (let i = from; i < to; i++)
    items.push(`${i}: ${show(lView[i])}`);
  return items.join(', ');
}

// Ячейка узла: DOM-узел, LContainer (место @if/@for), LView дочернего компонента или экземпляр пайпа
function slot(item: any): string {
  if (Array.isArray(item)) {
    if (item[TVIEW] === true)
      return `LContainer[${item.length - 10}]`;
    return `LView ${name(item[CONTEXT])}`;
  }
  if (item instanceof Element) return tag(item);
  if (item instanceof Text)
    return JSON.stringify(
      item.textContent?.trim().slice(0, 14),
    );
  if (item instanceof Comment)
    return `<!--${item.textContent}-->`;
  return value(item);
}

function value(item: any): string {
  if (typeof item === 'symbol')
    return item.description ?? 'symbol';
  if (Array.isArray(item)) return `Array(${item.length})`;
  if (item && typeof item === 'object') return name(item);
  return JSON.stringify(item)?.slice(0, 22) ?? String(item);
}

// Хвост LView: экземпляры директив и данные инжекторов элементов (числа фильтров Блума)
function summary(items: any[]): string {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key =
      item === null || item === undefined
        ? String(item)
        : typeof item === 'object' || typeof item === 'function'
          ? name(item)
          : typeof item;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .map(([key, n]) => (n > 1 ? `${key} ×${n}` : key))
    .join(', ');
}

function name(item: any): string {
  return item?.constructor?.name ?? String(item);
}

function tag(node: any): string {
  return node instanceof Element
    ? `<${node.tagName.toLowerCase()}>`
    : String(node);
}
