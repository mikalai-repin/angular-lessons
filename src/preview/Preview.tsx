import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import type { BackendConfig, FileMap } from '../content/course';
import { Loader } from '../app/Loader';
import type { Diagnostic } from '../editor/monaco';
import { TemplatePanel, TreePanel, type TemplateItem, type TreeNode } from './Inspector';
import { TestReport, TestSummary, applyTestEvent, emptyTestRun, type TestEvent } from './TestReport';

export interface ConsoleEntry {
  id: number;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug' | 'ts' | 'build';
  text: string;
  /** Сколько раз подряд пришло то же сообщение (Angular повторяет ошибку для каждого элемента @for) */
  count: number;
}

export interface NetworkEntry {
  id: number;
  method: string;
  url: string;
  status: number | 'pending' | 'canceled';
  ms?: number;
  /** Заголовки запроса: Authorization, Content-Type, X-XSRF-TOKEN… */
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
}

/** Что показывает превью: приложение (main.ts) или тесты (*.spec.ts) */
export type PreviewMode = 'app' | 'tests';

export interface PreviewRun {
  mode: PreviewMode;
  files: FileMap;
  styles: string[];
  entry: string;
  id: number;
  /** Ошибки TypeScript: показываем их в консоли, но код всё равно запускаем */
  diagnostics: Diagnostic[];
  /** Ошибки сборки: не найден файл шаблона, синтаксис */
  buildErrors: string[];
  /** Проверка шага (скомпилированный check.ts): приложение запускается с начального адреса шага, затем проверка */
  check?: string;
}

export interface CheckResult {
  pass: boolean;
  hint?: string;
}

interface PreviewMessage {
  source: 'angular-course-preview';
  type: 'ready' | 'console' | 'error' | 'url' | 'network' | 'title' | 'check-result' | 'tests' | 'templates' | 'tree';
  level?: ConsoleEntry['level'];
  text?: string;
  url?: string;
  title?: string;
  entry?: NetworkEntry;
  pass?: boolean;
  hint?: string;
  event?: TestEvent;
  items?: TemplateItem[];
  nodes?: TreeNode[];
}

interface Props {
  /** Скомпилированный код; новый объект = новый запуск */
  run: PreviewRun | null;
  /** Адрес приложения при входе на шаг */
  initialUrl: string;
  /** Настройки учебного бэкенда из шага */
  backend: BackendConfig;
  /** Кнопки в конце адресной строки (свернуть панель) */
  actions?: ReactNode;
  /** Результат проверки шага (run.check) */
  onCheckResult?: (result: CheckResult) => void;
  /** Переключатель «Приложение / Тесты»: есть, если в шаге есть тесты */
  onModeChange?: (mode: PreviewMode) => void;
}

type Panel = 'console' | 'network' | 'template' | 'tree';

const DEFAULT_BACKEND: Required<BackendConfig> = { latency: 300, failRate: 0, tokenTtl: 3600 };
const LATENCIES = [0, 300, 1000, 3000];

let nextEntryId = 1;

const URL_OR_CODE = /(https?:\/\/[^\s)'"]+|\bNG0\d{3,4}\b)/g;

/** Делает ссылками адреса и коды ошибок Angular (NG0303 → angular.dev/errors/NG0303) */
function linkify(text: string): ReactNode {
  const parts = text.split(URL_OR_CODE);
  return parts.map((part, index) => {
    if (index % 2 === 0) return <Fragment key={index}>{part}</Fragment>;
    const href = part.startsWith('http') ? part : `https://angular.dev/errors/${part}`;
    return (
      <a key={index} href={href} target="_blank" rel="noopener">
        {part}
      </a>
    );
  });
}

function statusClass(status: NetworkEntry['status']) {
  if (status === 'pending' || status === 'canceled') return status;
  return status >= 400 ? 'failed' : 'ok';
}

export function Preview({ run, initialUrl, backend, actions, onCheckResult, onModeChange }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [network, setNetwork] = useState<NetworkEntry[]>([]);
  const [panel, setPanel] = useState<Panel>('console');
  /** Нижняя панель развёрнута на большую часть превью: код во вкладке «Шаблон» длинный */
  const [panelExpanded, setPanelExpanded] = useState(false);
  /** Вкладка «Шаблон»: сгенерированный код классов ученика и выбранный класс (сохраняется между запусками) */
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  /** Вкладка «Дерево»: компоненты на странице; обновляется раз в секунду, пока вкладка открыта */
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [backendConfig, setBackendConfig] = useState({ ...DEFAULT_BACKEND, ...backend });
  /** Адрес, который показывает адресная строка (приложение сообщает о каждом переходе) */
  const [url, setUrl] = useState(initialUrl);
  const [typedUrl, setTypedUrl] = useState(initialUrl);
  /** Заголовок вкладки приложения — document.title внутри iframe */
  const [title, setTitle] = useState('');
  /** Текущий iframe: ключ (новый ключ — новый iframe) и адрес, с которого приложение стартует */
  const [frame, setFrame] = useState<{ key: string; startUrl: string; check: boolean } | null>(null);
  /** Результаты тестов текущего запуска (режим «Тесты») */
  const [testRun, setTestRun] = useState(emptyTestRun);
  const urlRef = useRef(initialUrl);
  const restarts = useRef(0);

  const configRef = useRef(backendConfig);
  configRef.current = backendConfig;

  /** check: запуск ради проверки шага (перезапуск кнопкой ⟳ или из адресной строки проверку не повторяет) */
  function start(startUrl: string, check = false) {
    if (!run) return;
    restarts.current++;
    urlRef.current = startUrl;
    setUrl(startUrl);
    setTypedUrl(startUrl);
    setTitle('');
    setNetwork([]);
    setSelectedRequest(null);
    setTemplates([]);
    setTree([]);
    setTestRun(emptyTestRun());
    setEntries([
      ...run.buildErrors.map((text) => ({ id: nextEntryId++, level: 'build' as const, text, count: 1 })),
      ...run.diagnostics.map((d) => ({
        id: nextEntryId++,
        level: 'ts' as const,
        text: `${d.file}:${d.line}:${d.column} — ${d.message}`,
        count: 1,
      })),
    ]);
    setFrame({ key: `${run.id}-${restarts.current}`, startUrl, check });
  }

  // Новый запуск кода — новый iframe. Адрес сохраняется: после правки кода ученик остаётся на той же странице.
  // Проверка шага всегда начинается с начального адреса шага
  useEffect(() => {
    start(run?.check ? initialUrl : urlRef.current, Boolean(run?.check));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  useEffect(() => {
    function onMessage(event: MessageEvent<PreviewMessage>) {
      const data = event.data;
      if (data?.source !== 'angular-course-preview') return;
      if (event.source !== iframeRef.current?.contentWindow) return;

      if (data.type === 'ready' && run && frame) {
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: 'run',
            mode: run.mode,
            files: run.files,
            styles: run.styles,
            entry: run.entry,
            url: frame.startUrl,
            backend: configRef.current,
            check: frame.check ? run.check : undefined,
          },
          '*',
        );
      } else if (data.type === 'url' && data.url !== undefined) {
        urlRef.current = data.url;
        setUrl(data.url);
        setTypedUrl(data.url);
      } else if (data.type === 'tests' && data.event) {
        const event = data.event;
        setTestRun((current) => applyTestEvent(current, event));
      } else if (data.type === 'check-result') {
        onCheckResult?.({ pass: Boolean(data.pass), hint: data.hint });
      } else if (data.type === 'templates' && data.items) {
        setTemplates(data.items);
      } else if (data.type === 'tree' && data.nodes) {
        setTree(data.nodes);
      } else if (data.type === 'title' && data.title !== undefined) {
        setTitle(data.title);
      } else if (data.type === 'network' && data.entry) {
        const entry = data.entry;
        setNetwork((list) => {
          const index = list.findIndex((e) => e.id === entry.id);
          if (index === -1) return [...list.slice(-199), entry];
          const next = [...list];
          next[index] = entry;
          return next;
        });
      } else if (data.type === 'console' || data.type === 'error') {
        const level: ConsoleEntry['level'] = data.type === 'error' ? 'error' : (data.level ?? 'log');
        const text = data.text ?? '';
        setEntries((list) => {
          const last = list.at(-1);
          if (last && last.level === level && last.text === text) {
            return [...list.slice(0, -1), { ...last, count: last.count + 1 }];
          }
          return [...list.slice(-199), { id: nextEntryId++, level, text, count: 1 }];
        });
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [run, frame, onCheckResult]);

  function post(message: object) {
    iframeRef.current?.contentWindow?.postMessage(message, '*');
  }

  // Дерево компонентов меняется вместе с приложением: пока вкладка открыта, спрашиваем его раз в секунду
  useEffect(() => {
    if (panel !== 'tree' || !frame) return;
    const ask = () => iframeRef.current?.contentWindow?.postMessage({ type: 'inspect-tree' }, '*');
    ask();
    const timer = setInterval(ask, 1000);
    return () => clearInterval(timer);
  }, [panel, frame]);

  function updateBackend(patch: Partial<BackendConfig>) {
    const next = { ...backendConfig, ...patch };
    setBackendConfig(next);
    post({ type: 'backend-config', config: next });
  }

  const selected = network.find((e) => e.id === selectedRequest);
  // В режиме «Тесты» приложения нет — вкладки «Шаблон» и «Дерево» скрыты
  const shownPanel = run?.mode === 'tests' && (panel === 'template' || panel === 'tree') ? 'console' : panel;
  const errorCount = entries.filter((e) => e.level === 'error' || e.level === 'build').length;

  return (
    <div className="preview">
      <div className="preview-tab">
        <span className="preview-tab-title" title="Заголовок вкладки — document.title приложения">
          {run?.mode === 'tests' ? 'Тесты' : title || '\u00a0'}
        </span>
        {onModeChange && (
          <div className="preview-modes" role="tablist" aria-label="Что показывает превью">
            {(
              [
                ['app', 'Приложение'],
                ['tests', 'Тесты'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                role="tab"
                aria-selected={run?.mode === mode}
                className={run?.mode === mode ? 'preview-mode active' : 'preview-mode'}
                onClick={() => onModeChange(mode)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {run?.mode === 'tests' ? (
        <div className="address-bar test-bar">
          <button
            type="button"
            className="icon-button"
            title="Запустить тесты заново"
            onClick={() => start(initialUrl)}
          >
            ⟳
          </button>
          <TestSummary run={testRun} />
          {actions}
        </div>
      ) : (
        <form
          className="address-bar"
          onSubmit={(event) => {
            event.preventDefault();
            const target = typedUrl.trim() || '/';
            // Ввод адреса — как в браузере: приложение загружается заново с этого адреса
            start(target.startsWith('/') ? target : `/${target}`);
          }}
        >
          <button
            type="button"
            className="icon-button"
            title="Назад"
            onClick={() => post({ type: 'history', delta: -1 })}
          >
            ←
          </button>
          <button
            type="button"
            className="icon-button"
            title="Вперёд"
            onClick={() => post({ type: 'history', delta: 1 })}
          >
            →
          </button>
          <button
            type="button"
            className="icon-button"
            title="Перезагрузить приложение с текущего адреса"
            onClick={() => start(url)}
          >
            ⟳
          </button>
          <input
            className="address-input"
            value={typedUrl}
            spellCheck={false}
            aria-label="Адрес приложения"
            onChange={(event) => setTypedUrl(event.target.value)}
          />
          {actions}
        </form>
      )}
      <div className="preview-frame">
        {run && frame ? (
          <>
            <iframe key={frame.key} ref={iframeRef} src="/preview.html" title="Результат" />
            {/* Тесты создают компоненты в iframe; поверх — отчёт */}
            {run.mode === 'tests' && <TestReport run={testRun} />}
          </>
        ) : (
          <div className="preview-empty">
            <Loader label="Компилируем…" compact />
          </div>
        )}
      </div>
      <div className={panelExpanded ? 'console expanded' : 'console'}>
        <div className="console-header">
          <div className="panel-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={shownPanel === 'console'}
              className={shownPanel === 'console' ? 'panel-tab active' : 'panel-tab'}
              onClick={() => setPanel('console')}
            >
              Консоль{errorCount > 0 && <span className="panel-badge error">{errorCount}</span>}
            </button>
            <button
              role="tab"
              aria-selected={shownPanel === 'network'}
              className={shownPanel === 'network' ? 'panel-tab active' : 'panel-tab'}
              onClick={() => setPanel('network')}
            >
              Сеть{network.length > 0 && <span className="panel-badge">{network.length}</span>}
            </button>
            {run?.mode !== 'tests' && (
              <>
                <button
                  role="tab"
                  aria-selected={shownPanel === 'template'}
                  className={shownPanel === 'template' ? 'panel-tab active' : 'panel-tab'}
                  title="Код, который компилятор Angular сгенерировал для ваших классов"
                  onClick={() => setPanel('template')}
                >
                  Шаблон
                </button>
                <button
                  role="tab"
                  aria-selected={shownPanel === 'tree'}
                  className={shownPanel === 'tree' ? 'panel-tab active' : 'panel-tab'}
                  title="Компоненты на странице, их входы и сигналы"
                  onClick={() => setPanel('tree')}
                >
                  Дерево
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            className="icon-button panel-expand"
            title={panelExpanded ? 'Уменьшить панель' : 'Развернуть панель'}
            aria-pressed={panelExpanded}
            onClick={() => setPanelExpanded((value) => !value)}
          >
            {panelExpanded ? '▾' : '▴'}
          </button>
          {shownPanel === 'console' && entries.length > 0 && (
            <button className="link-button" onClick={() => setEntries([])}>
              Очистить
            </button>
          )}
          {shownPanel === 'network' && (
            <div className="backend-controls">
              <label title="Задержка ответа учебного бэкенда">
                Задержка
                <select
                  value={backendConfig.latency}
                  onChange={(event) => updateBackend({ latency: Number(event.target.value) })}
                >
                  {[...new Set([...LATENCIES, backendConfig.latency])]
                    .sort((a, b) => a - b)
                    .map((ms) => (
                      <option key={ms} value={ms}>
                        {ms} мс
                      </option>
                    ))}
                </select>
              </label>
              <label title="Все запросы к /api/… отвечают ошибкой 500">
                <input
                  type="checkbox"
                  checked={backendConfig.failRate >= 1}
                  onChange={(event) => updateBackend({ failRate: event.target.checked ? 1 : 0 })}
                />
                Ошибка 500
              </label>
            </div>
          )}
        </div>
        {shownPanel === 'template' ? (
          <div className="console-body">
            <TemplatePanel items={templates} selected={selectedClass} onSelect={setSelectedClass} />
          </div>
        ) : shownPanel === 'tree' ? (
          <div className="console-body" onMouseLeave={() => post({ type: 'highlight', id: null })}>
            <TreePanel nodes={tree} onHighlight={(id) => post({ type: 'highlight', id })} />
          </div>
        ) : shownPanel === 'console' ? (
          <div className="console-body">
            {entries.length === 0 ? (
              <div className="console-empty">Здесь появится вывод console.log и ошибки</div>
            ) : (
              entries.map((entry) => (
                <pre key={entry.id} className={`console-line console-${entry.level}`}>
                  {entry.count > 1 && <span className="console-count">{entry.count}</span>}
                  {entry.level === 'ts' && <span className="console-badge">TS</span>}
                  {entry.level === 'build' && <span className="console-badge">Сборка</span>}
                  {linkify(entry.text)}
                </pre>
              ))
            )}
          </div>
        ) : (
          <div className="console-body network-body">
            {network.length === 0 ? (
              <div className="console-empty">Здесь появятся запросы к учебному бэкенду (/api/…)</div>
            ) : (
              <>
                <table className="network-table">
                  <tbody>
                    {network.map((entry) => (
                      <tr
                        key={entry.id}
                        className={`network-row network-${statusClass(entry.status)}${entry.id === selectedRequest ? ' selected' : ''}`}
                        onClick={() => setSelectedRequest(entry.id === selectedRequest ? null : entry.id)}
                      >
                        <td className="network-method">{entry.method}</td>
                        <td className="network-url">{entry.url}</td>
                        <td className="network-status">
                          {entry.status === 'pending' ? '…' : entry.status === 'canceled' ? 'отменён' : entry.status}
                        </td>
                        <td className="network-ms">{entry.ms !== undefined ? `${entry.ms} мс` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selected && (
                  <div className="network-details">
                    {selected.requestHeaders && Object.keys(selected.requestHeaders).length > 0 && (
                      <>
                        <div className="network-details-title">Заголовки запроса</div>
                        <pre>
                          {Object.entries(selected.requestHeaders)
                            .map(([name, value]) => `${name}: ${value}`)
                            .join('\n')}
                        </pre>
                      </>
                    )}
                    {selected.requestBody !== undefined && (
                      <>
                        <div className="network-details-title">Тело запроса</div>
                        <pre>{JSON.stringify(selected.requestBody, null, 2)}</pre>
                      </>
                    )}
                    <div className="network-details-title">Ответ</div>
                    <pre>
                      {selected.responseBody === undefined
                        ? '—'
                        : JSON.stringify(selected.responseBody, null, 2)?.slice(0, 5000)}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
