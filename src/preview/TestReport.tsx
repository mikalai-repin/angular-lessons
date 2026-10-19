// Отчёт о тестах шага (превью в режиме «Тесты»): события раннера vendor-src/vitest.mjs приходят из iframe
// сообщениями { type: 'tests', event } — см. public/preview-runtime.js, runTests
import { useState } from 'react';

export type TestState = 'pass' | 'fail' | 'skip' | 'todo';

export interface TestError {
  name: string;
  message: string;
  diff?: string;
  stack?: string;
}

export interface TestNode {
  id: number;
  type: 'suite' | 'test';
  name: string;
  mode: 'run' | 'skip' | 'todo';
  children?: TestNode[];
  /** Только у файла: ошибка загрузки модуля теста */
  error?: TestError | null;
}

export interface UnhandledError {
  kind: string;
  message: string;
  stack?: string;
  file?: string;
  test?: string;
}

export type TestEvent =
  | { type: 'collected'; files: TestNode[] }
  | { type: 'result'; id: number; state: TestState; duration?: number; errors?: TestError[] }
  | { type: 'done'; duration: number; unhandled?: UnhandledError[]; failed?: string };

export interface TestRun {
  files: TestNode[];
  results: Map<number, Extract<TestEvent, { type: 'result' }>>;
  done: Extract<TestEvent, { type: 'done' }> | null;
}

export const emptyTestRun = (): TestRun => ({ files: [], results: new Map(), done: null });

export function applyTestEvent(run: TestRun, event: TestEvent): TestRun {
  if (event.type === 'collected') return { ...run, files: event.files };
  if (event.type === 'result') {
    const results = new Map(run.results);
    // Ошибка afterAll приходит набору — копим ошибки, а не перезаписываем
    const previous = results.get(event.id);
    results.set(
      event.id,
      previous ? { ...event, errors: [...(previous.errors ?? []), ...(event.errors ?? [])] } : event,
    );
    return { ...run, results };
  }
  return { ...run, done: event };
}

function testsOf(node: TestNode): TestNode[] {
  return node.type === 'test' ? [node] : (node.children ?? []).flatMap(testsOf);
}

function suitesOf(node: TestNode): TestNode[] {
  return node.type === 'suite' ? [node, ...(node.children ?? []).flatMap(suitesOf)] : [];
}

/** Тесты по состояниям; fail — ещё и наборы с ошибкой (beforeAll, afterAll) и незагрузившиеся файлы, как в Vitest */
export function testCounts(run: TestRun) {
  const counts = { pass: 0, fail: 0, skip: 0, todo: 0, pending: 0 };
  for (const file of run.files) {
    if (file.error) counts.fail++;
    for (const suite of suitesOf(file)) if (run.results.get(suite.id)?.state === 'fail') counts.fail++;
    for (const test of testsOf(file)) {
      const state = run.results.get(test.id)?.state;
      if (state) counts[state]++;
      else counts.pending++;
    }
  }
  return counts;
}

const ICONS: Record<TestState | 'pending', string> = { pass: '✓', fail: '✗', skip: '↓', todo: '…', pending: '○' };

function ErrorBlock({ error }: { error: TestError }) {
  return (
    <div className="test-error">
      <pre className="test-error-message">
        {error.name && !error.message.startsWith(error.name) ? `${error.name}: ` : ''}
        {error.message}
      </pre>
      {error.diff && <pre className="test-error-diff">{error.diff}</pre>}
      {error.stack && <pre className="test-error-stack">{error.stack}</pre>}
    </div>
  );
}

function TestItem({ node, run, depth }: { node: TestNode; run: TestRun; depth: number }) {
  const result = run.results.get(node.id);
  if (node.type === 'suite') {
    return (
      <li className="test-suite">
        <div className="test-suite-name" style={{ paddingLeft: depth * 14 }}>
          {node.name}
        </div>
        {result?.errors?.map((error, i) => (
          <div key={i} style={{ paddingLeft: depth * 14 + 18 }}>
            <ErrorBlock error={error} />
          </div>
        ))}
        <ul>
          {node.children?.map((child) => (
            <TestItem key={child.id} node={child} run={run} depth={depth + 1} />
          ))}
        </ul>
      </li>
    );
  }
  const state = result?.state ?? 'pending';
  return (
    <li className={`test-case test-${state}`} style={{ paddingLeft: depth * 14 }}>
      <div className="test-case-row">
        <span className="test-icon">{ICONS[state]}</span>
        <span className="test-name">{node.name}</span>
        {result?.duration !== undefined && state !== 'skip' && (
          <span className="test-duration">{result.duration} мс</span>
        )}
      </div>
      {result?.errors?.map((error, i) => (
        <ErrorBlock key={i} error={error} />
      ))}
    </li>
  );
}

function fileFailed(file: TestNode, run: TestRun) {
  return (
    Boolean(file.error) || [...testsOf(file), ...suitesOf(file)].some((t) => run.results.get(t.id)?.state === 'fail')
  );
}

function FileBlock({ file, run, anyFailed }: { file: TestNode; run: TestRun; anyFailed: boolean }) {
  const tests = testsOf(file);
  const failed = fileFailed(file, run);
  // Пока ученик не раскрыл или не свернул файл сам: когда что-то упало, прошедшие файлы свёрнуты
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? (failed || !anyFailed);
  const setOpen = (value: boolean) => setToggled(value);
  return (
    <section className={`test-file${failed ? ' failed' : ''}`}>
      <button className="test-file-name" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="test-file-arrow">{open ? '▾' : '▸'}</span>
        {file.name}
        <span className="test-file-count">{tests.length}</span>
      </button>
      {open && (
        <>
          {file.error && (
            <div className="test-file-error">
              Файл не загрузился:
              <ErrorBlock error={file.error} />
            </div>
          )}
          <ul>
            {file.children?.map((child) => (
              <TestItem key={child.id} node={child} run={run} depth={0} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function TestSummary({ run }: { run: TestRun }) {
  const counts = testCounts(run);
  const unhandled = run.done?.unhandled?.length ?? 0;
  if (!run.done && run.files.length === 0) return <span className="test-summary">Тесты выполняются…</span>;
  if (run.done && run.files.length === 0) {
    return <span className="test-summary">{run.done.failed ? 'Тесты не запустились' : 'Нет файлов *.spec.ts'}</span>;
  }
  const failed = counts.fail > 0 || unhandled > 0 || Boolean(run.done?.failed);
  return (
    <span className={`test-summary${run.done ? (failed ? ' failed' : ' passed') : ''}`}>
      {counts.pass > 0 && <span className="test-pass">✓ {counts.pass}</span>}
      {counts.fail > 0 && <span className="test-fail">✗ {counts.fail}</span>}
      {counts.skip > 0 && <span className="test-skip">↓ {counts.skip}</span>}
      {counts.todo > 0 && <span className="test-todo">… {counts.todo}</span>}
      {unhandled > 0 && <span className="test-fail">ошибок вне тестов: {unhandled}</span>}
      {run.done ? (
        <span className="test-time">{(run.done.duration / 1000).toFixed(2).replace('.', ',')} с</span>
      ) : (
        <span className="test-time">выполняются…</span>
      )}
    </span>
  );
}

export function TestReport({ run }: { run: TestRun }) {
  const unhandled = run.done?.unhandled ?? [];
  return (
    <div className="test-report">
      {run.files.length === 0 && run.done && !run.done.failed && (
        <div className="preview-empty">В шаге нет файлов тестов (*.spec.ts)</div>
      )}
      {run.done?.failed && <div className="test-file-error">Тесты не запустились: {run.done.failed}</div>}
      {run.files.map((file) => (
        <FileBlock
          key={file.id}
          file={file}
          run={run}
          anyFailed={Boolean(run.done) && run.files.some((f) => fileFailed(f, run))}
        />
      ))}
      {unhandled.length > 0 && (
        <section className="test-file failed">
          <div className="test-file-name">Ошибки вне тестов: {unhandled.length}</div>
          <p className="test-unhandled-note">
            Ошибка случилась не в самом тесте, а в отложенном коде (таймер, промис, простой браузера). Прогон считается
            неудачным, как в Vitest.
          </p>
          {unhandled.map((error, i) => (
            <div key={i} className="test-unhandled">
              <div className="test-unhandled-place">
                {error.kind}
                {error.file ? ` · ${error.file}` : ''}
                {error.test ? ` · после теста «${error.test}»` : ''}
              </div>
              <ErrorBlock error={{ name: '', message: error.message, stack: error.stack }} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
