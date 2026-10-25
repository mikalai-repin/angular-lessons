import { Fragment, useEffect, useState } from 'react';

/** Класс ученика и код, который JIT-компилятор сгенерировал для него (сообщение превью 'templates') */
export interface TemplateItem {
  name: string;
  kind: 'component' | 'directive' | 'pipe' | 'service' | 'other';
  /** ɵcmp / ɵdir / ɵpipe / ɵprov / ɵfac — в порядке компиляции */
  parts: { part: string; code: string }[];
}

/** Компонент на странице (сообщение превью 'tree') */
export interface TreeNode {
  id: number;
  name: string;
  tag: string;
  /** Поля экземпляра: kind — вид сигнала (signal, computed, input, model, linkedSignal) или '' у обычного поля */
  fields: { name: string; kind: string; value: string }[];
  children: TreeNode[];
}

const KIND_TITLES: [TemplateItem['kind'], string][] = [
  ['component', 'Компоненты'],
  ['directive', 'Директивы'],
  ['pipe', 'Пайпы'],
  ['service', 'Сервисы'],
  ['other', 'Другие классы'],
];

const PART_TITLES: Record<string, string> = {
  ɵcmp: 'ɵcmp — определение компонента (с функцией шаблона)',
  ɵdir: 'ɵdir — определение директивы',
  ɵpipe: 'ɵpipe — определение пайпа',
  ɵprov: 'ɵprov — как DI создаёт сервис',
  ɵfac: 'ɵfac — фабрика: как создать экземпляр',
};

/** Сгенерированный код длинными строками → формат и подсветка (Prettier и Shiki грузятся лениво, результат кэшируется) */
const htmlCache = new Map<string, Promise<string>>();

function formatAndHighlight(code: string): Promise<string> {
  let cached = htmlCache.get(code);
  if (!cached) {
    cached = (async () => {
      const [prettier, babel, estree, { highlightCode }] = await Promise.all([
        import('prettier/standalone'),
        import('prettier/plugins/babel'),
        import('prettier/plugins/estree'),
        import('../lesson/markdown'),
      ]);
      let formatted = code;
      try {
        formatted = await prettier.format(code, {
          parser: 'babel',
          plugins: [babel, estree],
          printWidth: 72,
          singleQuote: true,
        });
      } catch {
        // Не разобрался — покажем как есть
      }
      return highlightCode(formatted.trimEnd(), 'js');
    })();
    htmlCache.set(code, cached);
  }
  return cached;
}

function CodePart({ code }: { code: string }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setHtml(null);
    void formatAndHighlight(code).then((result) => alive && setHtml(result));
    return () => {
      alive = false;
    };
  }, [code]);
  return html === null ? (
    <pre className="inspector-code">{code}</pre>
  ) : (
    <div className="inspector-code" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

export function TemplatePanel({
  items,
  selected,
  onSelect,
}: {
  items: TemplateItem[];
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  if (items.length === 0) {
    return <div className="console-empty">Здесь появится код, который компилятор сгенерировал для ваших классов</div>;
  }
  const item = items.find((i) => i.name === selected) ?? items.find((i) => i.kind === 'component') ?? items[0];
  return (
    <div className="inspector-template">
      <div className="inspector-bar">
        <select
          aria-label="Класс"
          className="inspector-select"
          value={item.name}
          onChange={(event) => onSelect(event.target.value)}
        >
          {KIND_TITLES.map(([kind, title]) => {
            const group = items.filter((i) => i.kind === kind);
            return group.length === 0 ? null : (
              <optgroup key={kind} label={title}>
                {group.map((i) => (
                  <option key={i.name} value={i.name}>
                    {i.name}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <span className="inspector-note">код JIT-компилятора</span>
      </div>
      {item.parts.map(({ part, code }) => (
        <Fragment key={part}>
          <div className="inspector-part">{PART_TITLES[part] ?? part}</div>
          <CodePart code={code} />
        </Fragment>
      ))}
    </div>
  );
}

function TreeRow({
  node,
  depth,
  open,
  onToggle,
  onHighlight,
}: {
  node: TreeNode;
  depth: number;
  open: Set<number>;
  onToggle: (id: number) => void;
  onHighlight: (id: number | null) => void;
}) {
  const expanded = open.has(node.id);
  return (
    <>
      <div
        className={expanded ? 'tree-row selected' : 'tree-row'}
        style={{ paddingLeft: 12 + depth * 14 }}
        onClick={() => onToggle(node.id)}
        onMouseEnter={() => onHighlight(node.id)}
        onMouseLeave={() => onHighlight(null)}
      >
        <span className="tree-name">{node.name}</span>
        <span className="tree-tag">&lt;{node.tag}&gt;</span>
      </div>
      {expanded && (
        <div className="tree-fields" style={{ paddingLeft: 26 + depth * 14 }}>
          {node.fields.length === 0 ? (
            <div className="tree-field muted">полей нет</div>
          ) : (
            node.fields.map((field) => (
              <div key={field.name} className="tree-field">
                <span className="tree-field-name">{field.name}</span>
                {field.kind && <span className={`tree-kind tree-kind-${field.kind}`}>{field.kind}</span>}
                <span className="tree-field-value">{field.value}</span>
              </div>
            ))
          )}
        </div>
      )}
      {node.children.map((child) => (
        <TreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          open={open}
          onToggle={onToggle}
          onHighlight={onHighlight}
        />
      ))}
    </>
  );
}

export function TreePanel({ nodes, onHighlight }: { nodes: TreeNode[]; onHighlight: (id: number | null) => void }) {
  // Раскрытые строки — по номеру хоста: номер у элемента постоянный, пока элемент жив
  const [open, setOpen] = useState<Set<number>>(new Set());
  if (nodes.length === 0) {
    return <div className="console-empty">Здесь появится дерево компонентов на странице</div>;
  }
  const toggle = (id: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  return (
    <div className="inspector-tree">
      {nodes.map((node) => (
        <TreeRow key={node.id} node={node} depth={0} open={open} onToggle={toggle} onHighlight={onHighlight} />
      ))}
    </div>
  );
}
