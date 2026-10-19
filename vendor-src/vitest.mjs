// Тесты в превью: API Vitest 5 для кода ученика — describe/it/test, хуки, expect, vi.
// Собирается scripts/copy-vendor.mjs в public/vendor/vitest.mjs (esbuild), в import map — как модуль 'vitest'.
//
// expect — настоящий @vitest/expect поверх chai (те же матчеры, сообщения и diff, что в Vitest), createExpect повторяет
// Vitest 5 (vitest/dist/chunks/index.*.js). vi.fn/vi.spyOn — настоящий @vitest/spy. Фейковые таймеры — @sinonjs/fake-timers
// с обёрткой как класс FakeTimers в Vitest. Сам раннер (сбор и выполнение тестов) — свой: @vitest/runner в Vitest 5 отдельно
// не публикуется. Семантика — как в Vitest: хуки beforeEach снаружи внутрь, afterEach/afterAll — в обратном порядке
// (sequence.hooks: 'stack'), функция, которую вернул beforeEach/beforeAll, — очистка; .only — в пределах файла;
// тайм-ауты 5000 мс у теста и 10000 мс у хука. Ограничения превью: нет vi.mock (подмены модулей), снапшотов, expect.poll.
import * as chai from 'chai';
import {
  ASYMMETRIC_MATCHERS_OBJECT,
  ChaiStyleAssertions,
  GLOBAL_EXPECT,
  JestAsymmetricMatchers,
  JestChaiExpect,
  JestExtend,
  addCustomEqualityTesters,
  customMatchers,
  getState,
  setState,
} from '@vitest/expect';
import * as spy from '@vitest/spy';
import { processError } from '@vitest/utils/error';
import { withGlobal } from '@sinonjs/fake-timers';

chai.use(JestExtend);
chai.use(JestChaiExpect);
chai.use(ChaiStyleAssertions);
chai.use(JestAsymmetricMatchers);

// Настоящие таймеры — до того, как тест подменит их vi.useFakeTimers: на них держатся тайм-ауты раннера
const realSetTimeout = globalThis.setTimeout.bind(globalThis);
const realClearTimeout = globalThis.clearTimeout.bind(globalThis);
const realNow = () => globalThis.performance.now();
const realRequestIdleCallback = globalThis.requestIdleCallback?.bind(globalThis);

/**
 * Отдать управление браузеру: между тестами Vitest общается с сервером, и таймеры и колбэки простоя
 * (requestIdleCallback) успевают сработать во время прогона — их ошибки попадают в «Unhandled Errors»
 */
const yieldToBrowser = () => new Promise((resolve) => realSetTimeout(resolve, 0));
const waitIdle = () =>
  new Promise((resolve) =>
    realRequestIdleCallback ? realRequestIdleCallback(() => resolve(), { timeout: 1000 }) : realSetTimeout(resolve, 50),
  );

const TEST_TIMEOUT = 5000;
const HOOK_TIMEOUT = 10000;

// ---------- expect ----------

let currentTest = null;
let currentFile = '';
// Последний выполненный тест: ошибка после него, скорее всего, его хвост (как в отчёте Vitest)
let lastTestName = '';

function createExpect(test) {
  const expect = (value, message) => {
    const { assertionCalls } = getState(expect);
    setState({ assertionCalls: assertionCalls + 1 }, expect);
    const assert = chai.expect(value, message);
    const owner = test || currentTest;
    return owner ? assert.withTest(owner) : assert;
  };
  Object.assign(expect, chai.expect);
  Object.assign(expect, globalThis[ASYMMETRIC_MATCHERS_OBJECT]);
  expect.getState = () => getState(expect);
  expect.setState = (state) => setState(state, expect);
  const globalState = getState(globalThis[GLOBAL_EXPECT]) || {};
  setState(
    {
      ...globalState,
      assertionCalls: 0,
      isExpectingAssertions: false,
      isExpectingAssertionsError: null,
      expectedAssertionsNumber: null,
      expectedAssertionsNumberErrorGen: null,
      get testPath() {
        return currentFile;
      },
      currentTestName: test ? fullName(test) : globalState.currentTestName,
    },
    expect,
  );
  expect.assert = chai.assert;
  expect.extend = (matchers) => chai.expect.extend(expect, matchers);
  expect.addEqualityTesters = (testers) => addCustomEqualityTesters(testers);
  expect.soft = (...args) => expect(...args).withContext({ soft: true });
  expect.poll = () => {
    throw new Error('expect.poll в превью курса не поддерживается: используйте await vi.waitFor(…)');
  };
  expect.unreachable = (message) => {
    chai.assert.fail(`expected${message ? ` "${message}" ` : ' '}not to be reached`);
  };
  function assertions(expected) {
    const errorGen = () =>
      new Error(`expected number of assertions to be ${expected}, but got ${expect.getState().assertionCalls}`);
    expect.setState({ expectedAssertionsNumber: expected, expectedAssertionsNumberErrorGen: errorGen });
  }
  function hasAssertions() {
    const error = new Error('expected any number of assertion, but got none');
    expect.setState({ isExpectingAssertions: true, isExpectingAssertionsError: error });
  }
  chai.util.addMethod(expect, 'assertions', assertions);
  chai.util.addMethod(expect, 'hasAssertions', hasAssertions);
  expect.extend(customMatchers);
  return expect;
}

const globalExpect = createExpect();
Object.defineProperty(globalThis, GLOBAL_EXPECT, { value: globalExpect, writable: true, configurable: true });

// ---------- сбор тестов ----------

let nextId = 1;
const files = [];
let currentSuite = null;
// Набор над всеми файлами: хуки из настройки окружения (как setupFiles в Vitest) действуют на каждый тест
let globalSuite = null;

function createSuite(name, mode, parent, options = {}) {
  return {
    id: nextId++,
    type: 'suite',
    name,
    mode,
    parent,
    file: parent?.file ?? null,
    children: [],
    hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] },
    options,
  };
}

function fullName(task) {
  const names = [];
  for (let t = task; t && !t.isFile && t.parent; t = t.parent) names.unshift(t.name);
  return names.join(' > ');
}

function collectorSuite() {
  if (!currentSuite) throw new Error('describe/it можно вызывать только в файле теста (*.spec.ts)');
  return currentSuite;
}

/** Параметры после имени: (name, fn, timeout) или (name, options, fn) или (name, fn, options) */
function parseArgs(fnOrOptions, optionsOrFn) {
  if (typeof fnOrOptions === 'function') {
    const options = typeof optionsOrFn === 'number' ? { timeout: optionsOrFn } : (optionsOrFn ?? {});
    return { fn: fnOrOptions, options };
  }
  return { fn: optionsOrFn, options: fnOrOptions ?? {} };
}

function modeOf(options, base) {
  if (options.skip) return 'skip';
  if (options.only) return 'only';
  if (options.todo) return 'todo';
  return base;
}

function defineSuite(base, name, fnOrOptions, optionsOrFn) {
  const parent = collectorSuite();
  const { fn, options } = parseArgs(fnOrOptions, optionsOrFn);
  const suite = createSuite(formatName(name), fn ? modeOf(options, base) : 'todo', parent, options);
  parent.children.push(suite);
  if (fn) {
    currentSuite = suite;
    try {
      const result = fn();
      if (result && typeof result.then === 'function') {
        throw new Error('Функция describe должна быть синхронной: внутри — только описание тестов');
      }
    } finally {
      currentSuite = parent;
    }
  }
}

function defineTest(base, name, fnOrOptions, optionsOrFn) {
  const parent = collectorSuite();
  const { fn, options } = parseArgs(fnOrOptions, optionsOrFn);
  parent.children.push({
    id: nextId++,
    type: 'test',
    name: formatName(name),
    mode: fn ? modeOf(options, base) : 'todo',
    parent,
    file: parent.file,
    fn,
    options,
    fails: Boolean(options.fails),
    promises: undefined,
    context: null,
    // Где объявлен тест: на это место указывает ошибка тайм-аута (как в Vitest)
    location: new Error('location').stack,
  });
}

function formatName(name) {
  return typeof name === 'function' ? name.name || '<anonymous>' : String(name);
}

// Подстановки в имени теста each: %s %d %i %f %j %o %O %# %$ %%, $prop и $prop.path для объектов
function formatEachName(template, args, index) {
  let name = String(template);
  if (args.length === 1 && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    const object = args[0];
    name = name.replace(/\$([\w.]+)/g, (match, path) => {
      if (path === '#') return String(index);
      const value = path.split('.').reduce((v, key) => (v == null ? v : v[key]), object);
      return value === undefined && !(path.split('.')[0] in object) ? match : stringify(value);
    });
  }
  name = name.replace(/\$#/g, String(index));
  let i = 0;
  return name.replace(/%[sdifjoO#$%]/g, (token) => {
    if (token === '%%') return '%';
    if (token === '%#') return String(index);
    if (token === '%$') return String(index + 1);
    const value = args[i++];
    if (token === '%d' || token === '%i') return String(token === '%i' ? Math.trunc(Number(value)) : Number(value));
    if (token === '%f') return String(Number(value));
    if (token === '%j') return JSON.stringify(value);
    if (token === '%s') return typeof value === 'string' ? value : stringify(value);
    return stringify(value);
  });
}

function stringify(value) {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function each(define) {
  return (cases, ...rest) => {
    // Шаблонная строка-таблица (each`a | b`) в превью не поддерживаем
    if (!Array.isArray(cases) || rest.length) {
      throw new Error('В превью курса each принимает массив: it.each([[1, 2], [3, 4]])(…)');
    }
    return (name, fnOrOptions, optionsOrFn) => {
      const { fn, options } = parseArgs(fnOrOptions, optionsOrFn);
      cases.forEach((item, index) => {
        const args = Array.isArray(item) ? item : [item];
        const title = formatEachName(name, args, index);
        define(title, options, fn ? (...extra) => fn(...args, ...extra) : undefined);
      });
    };
  };
}

function makeApi(defineFn, kind) {
  const api = (name, a, b) => defineFn('run', name, a, b);
  api.skip = (name, a, b) => defineFn('skip', name, a, b);
  api.only = (name, a, b) => defineFn('only', name, a, b);
  api.todo = (name) => defineFn('todo', name);
  api.skipIf = (condition) => (condition ? api.skip : api);
  api.runIf = (condition) => (condition ? api : api.skip);
  api.each = each((name, options, fn) => defineFn('run', name, options, fn));
  api.for = (cases) => (name, fnOrOptions, optionsOrFn) => {
    const { fn, options } = parseArgs(fnOrOptions, optionsOrFn);
    cases.forEach((item, index) => {
      const title = formatEachName(name, Array.isArray(item) ? item : [item], index);
      defineFn('run', title, options, fn ? (context) => fn(item, context) : undefined);
    });
  };
  api.concurrent = api;
  api.sequential = api;
  if (kind === 'test') {
    api.fails = (name, a, b) => {
      const { fn, options } = parseArgs(a, b);
      defineFn('run', name, { ...options, fails: true }, fn);
    };
  }
  return api;
}

export const describe = makeApi(defineSuite, 'suite');
export const suite = describe;
export const it = makeApi(defineTest, 'test');
export const test = it;

function addHook(kind) {
  return (fn, timeout) => {
    collectorSuite().hooks[kind].push({ fn, timeout: timeout ?? HOOK_TIMEOUT });
  };
}
export const beforeAll = addHook('beforeAll');
export const afterAll = addHook('afterAll');
export const beforeEach = addHook('beforeEach');
export const afterEach = addHook('afterEach');

export function onTestFinished(fn) {
  if (!currentTest) throw new Error('onTestFinished можно вызывать только внутри теста');
  currentTest.onFinished.push(fn);
}
export function onTestFailed(fn) {
  if (!currentTest) throw new Error('onTestFailed можно вызывать только внутри теста');
  currentTest.onFailed.push(fn);
}

// ---------- выполнение ----------

class SkipError extends Error {}

function withTimeout(promiseOrValue, timeout, what, location) {
  if (!promiseOrValue || typeof promiseOrValue.then !== 'function') return promiseOrValue;
  if (!timeout || timeout <= 0) return promiseOrValue;
  let timer;
  const expired = new Promise((_, reject) => {
    timer = realSetTimeout(() => {
      const error = new Error(
        `${what} timed out in ${timeout}ms.\nIf this is a long-running ${what === 'Test' ? 'test' : 'hook'}, pass a timeout value as the last argument or configure it globally with "${what === 'Test' ? 'testTimeout' : 'hookTimeout'}".`,
      );
      if (location) error.stack = `${error.message}\n${location.split('\n').slice(1).join('\n')}`;
      reject(error);
    }, timeout);
  });
  return Promise.race([promiseOrValue, expired]).finally(() => realClearTimeout(timer));
}

function suitesOf(task) {
  const list = [];
  for (let s = task.parent; s; s = s.parent) list.unshift(s);
  return list;
}

function hasOnly(suite) {
  return suite.children.some((child) => child.mode === 'only' || (child.type === 'suite' && hasOnly(child)));
}

/** Режимы с учётом .only и пропущенных родителей: 'run' | 'skip' | 'todo' */
function resolveModes(suite, parentMode, onlyInFile, insideOnly) {
  for (const child of suite.children) {
    const isOnly = child.mode === 'only';
    let mode = child.mode === 'only' ? 'run' : child.mode;
    if (parentMode !== 'run') mode = parentMode === 'todo' ? 'todo' : 'skip';
    else if (onlyInFile && !insideOnly && !isOnly && !(child.type === 'suite' && hasOnly(child))) mode = 'skip';
    child.mode = mode;
    if (child.type === 'suite') resolveModes(child, mode, onlyInFile, insideOnly || isOnly);
  }
}

function serialize(task) {
  const base = { id: task.id, type: task.type, name: task.name, mode: task.mode };
  return task.type === 'suite' ? { ...base, children: task.children.map(serialize) } : base;
}

function formatError(error, formatStack) {
  if (error instanceof SkipError) return null;
  const processed = processError(error, { expand: false, printBasicPrototype: false, truncateThreshold: 0 });
  const message = stripAnsi(String(processed.message ?? error));
  return {
    name: processed.name ?? 'Error',
    message,
    diff: processed.diff ? stripAnsi(processed.diff) : undefined,
    stack: formatStack(String(error?.stack ?? '')),
  };
}

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
function stripAnsi(text) {
  return text.replace(ANSI, '');
}

async function callHook(hook, args, cleanups) {
  const result = await withTimeout(hook.fn(...args), hook.timeout, 'Hook');
  if (typeof result === 'function') cleanups.push(result);
}

async function runTest(test, report) {
  if (test.mode !== 'run') {
    report({ id: test.id, state: test.mode === 'todo' ? 'todo' : 'skip' });
    return;
  }
  const started = realNow();
  const errors = [];
  const suites = suitesOf(test);
  test.onFinished = [];
  test.onFailed = [];
  test.promises = undefined;
  const context = {
    task: { name: test.name, id: test.id },
    expect: createExpect(test),
    skip: (condition, note) => {
      if (condition === false) return;
      throw new SkipError(typeof condition === 'string' ? condition : note);
    },
    onTestFinished: (fn) => test.onFinished.push(fn),
    onTestFailed: (fn) => test.onFailed.push(fn),
  };
  context.expect.setState({ currentTestName: fullName(test) });
  test.context = context;
  currentTest = test;
  setState(
    {
      assertionCalls: 0,
      isExpectingAssertions: false,
      isExpectingAssertionsError: null,
      expectedAssertionsNumber: null,
      expectedAssertionsNumberErrorGen: null,
      currentTestName: fullName(test),
    },
    globalExpect,
  );

  const cleanups = [];
  let skipped = false;
  try {
    for (const suite of suites) {
      for (const hook of suite.hooks.beforeEach) await callHook(hook, [context, suite], cleanups);
    }
    await withTimeout(test.fn(context), test.options.timeout ?? TEST_TIMEOUT, 'Test', test.location);
    if (test.promises) await Promise.all(test.promises);
    // expect.assertions(n) и expect.hasAssertions() — у глобального expect и у expect из контекста
    for (const state of [getState(globalExpect), context.expect.getState()]) {
      if (state.expectedAssertionsNumber !== null && state.assertionCalls !== state.expectedAssertionsNumber) {
        throw state.expectedAssertionsNumberErrorGen();
      }
      if (state.isExpectingAssertions === true && state.assertionCalls === 0) throw state.isExpectingAssertionsError;
    }
  } catch (error) {
    if (error instanceof SkipError) skipped = true;
    else errors.push(error);
  }
  // afterEach — изнутри наружу и в обратном порядке регистрации, затем очистки из beforeEach
  for (const suite of [...suites].reverse()) {
    for (const hook of [...suite.hooks.afterEach].reverse()) {
      try {
        await callHook(hook, [context, suite], []);
      } catch (error) {
        errors.push(error);
      }
    }
  }
  for (const cleanup of cleanups.reverse()) {
    try {
      await cleanup();
    } catch (error) {
      errors.push(error);
    }
  }
  let failed = errors.length > 0;
  if (test.fails && !skipped) {
    if (failed) errors.length = 0;
    else errors.push(new Error('Expect test to fail'));
    failed = !failed;
  }
  for (const fn of failed ? [...test.onFailed, ...test.onFinished] : test.onFinished) {
    try {
      await fn(context);
    } catch (error) {
      errors.push(error);
      failed = true;
    }
  }
  currentTest = null;
  lastTestName = fullName(test);
  report({
    id: test.id,
    state: skipped ? 'skip' : failed ? 'fail' : 'pass',
    duration: Math.round(realNow() - started),
    errors: errors.map((e) => report.formatError(e)).filter(Boolean),
  });
}

function allTests(suite) {
  return suite.children.flatMap((child) => (child.type === 'suite' ? allTests(child) : [child]));
}

async function runSuite(suite, report) {
  const runnable = allTests(suite).some((t) => t.mode === 'run');
  if (!runnable) {
    for (const t of allTests(suite)) report({ id: t.id, state: t.mode === 'todo' ? 'todo' : 'skip' });
    return;
  }
  const cleanups = [];
  try {
    for (const hook of suite.hooks.beforeAll) await callHook(hook, [suite], cleanups);
  } catch (error) {
    // Упал beforeAll — как в Vitest: набор с ошибкой («Failed Suites»), его тесты пропущены
    report({ id: suite.id, state: 'fail', errors: [report.formatError(error)] });
    for (const t of allTests(suite)) report({ id: t.id, state: t.mode === 'todo' ? 'todo' : 'skip' });
    return;
  }
  for (const child of suite.children) {
    if (child.type === 'suite') await runSuite(child, report);
    else {
      await runTest(child, report);
      await yieldToBrowser();
    }
  }
  for (const hook of [...suite.hooks.afterAll].reverse()) {
    try {
      await callHook(hook, [suite], []);
    } catch (error) {
      report({ id: suite.id, state: 'fail', errors: [report.formatError(error)] });
    }
  }
  for (const cleanup of cleanups.reverse()) await cleanup();
}

/**
 * Собрать и выполнить файлы тестов.
 * specs — [{ file: 'cart/cart-store.spec.ts', load: () => import(url) }] в нужном порядке;
 * onEvent — события для отчёта: { type: 'collected', files } → { type: 'result', id, state, duration, errors } → { type: 'done' };
 * formatStack — переводит стек в имена .ts-файлов и строки исходника.
 */
export async function runSpecs(specs, { onEvent, formatStack = (s) => s }) {
  const started = realNow();
  const collectErrors = [];
  globalSuite ??= createSuite('', 'run', null);
  for (const spec of specs) {
    const root = createSuite(spec.file, 'run', globalSuite);
    root.isFile = true;
    root.file = spec.file;
    files.push(root);
    currentSuite = root;
    currentFile = spec.file;
    try {
      await spec.load();
    } catch (error) {
      root.collectError = formatError(error, formatStack);
      collectErrors.push(root.collectError);
    } finally {
      currentSuite = null;
    }
    resolveModes(root, 'run', hasOnly(root), false);
  }
  onEvent({
    type: 'collected',
    files: files.map((root) => ({ ...serialize(root), error: root.collectError ?? null })),
  });

  const report = (result) => onEvent({ type: 'result', ...result });
  report.formatError = (error) => formatError(error, formatStack);
  for (const root of files) {
    if (root.collectError) continue;
    currentFile = root.file;
    await runSuite(root, report);
  }
  // Подменённые таймеры не должны пережить прогон
  timers.useRealTimers();
  // Дать сработать отложенному (простой браузера, таймеры): их ошибки — тоже результат прогона
  await waitIdle();
  await yieldToBrowser();
  currentFile = '';
  onEvent({ type: 'done', duration: Math.round(realNow() - started) });
}

/**
 * Настройка окружения до файлов тестов (setupFiles): beforeEach/afterEach, вызванные внутри setup,
 * действуют на все тесты всех файлов — так CLI регистрирует очистку TestBed
 */
export async function setupGlobals(setup) {
  globalSuite ??= createSuite('', 'run', null);
  currentSuite = globalSuite;
  try {
    await setup();
  } finally {
    currentSuite = null;
  }
}

// ---------- vi ----------

class FakeTimers {
  constructor(global) {
    this._global = global;
    this._fakeTimers = withGlobal(global);
    this._clock = null;
    this._fakingTime = false;
    this._fakingDate = null;
    this._config = undefined;
  }
  _check() {
    if (!this._fakingTime) {
      throw new Error('Timers are not mocked. Try calling "vi.useFakeTimers()" first.');
    }
    return true;
  }
  useFakeTimers(config) {
    const fakeDate = this._fakingDate || Date.now();
    if (this._fakingDate) {
      this._clock.uninstall();
      this._fakingDate = null;
    }
    if (this._fakingTime) this._clock.uninstall();
    const options = { ...this._config, ...config };
    let { toFake, toNotFake } = options;
    if (toFake === undefined && toNotFake === undefined) {
      toFake = Object.keys(this._fakeTimers.timers).filter((t) => t !== 'nextTick' && t !== 'queueMicrotask');
    } else if (toFake === undefined && toNotFake !== undefined) {
      for (const t of ['nextTick', 'queueMicrotask']) if (!toNotFake.includes(t)) toNotFake = [...toNotFake, t];
    }
    this._clock = this._fakeTimers.install({
      now: fakeDate,
      ...options,
      ...(toFake && { toFake }),
      ...(toNotFake && { toNotFake }),
      ignoreMissingTimers: true,
    });
    this._fakingTime = true;
  }
  useRealTimers() {
    if (this._fakingDate) {
      this._clock.uninstall();
      this._fakingDate = null;
    }
    if (this._fakingTime) {
      this._clock.uninstall();
      this._fakingTime = false;
    }
  }
  isFakeTimers() {
    return this._fakingTime;
  }
  setSystemTime(now) {
    const date = typeof now === 'undefined' || now instanceof Date ? now : new Date(now);
    if (this._fakingTime) this._clock.setSystemTime(date);
    else {
      const next = date ?? new Date(this.getRealSystemTime());
      if (this._fakingDate) {
        this._fakingDate = next;
        this._clock.setSystemTime(next);
      } else {
        this._fakingDate = next;
        this._clock = this._fakeTimers.install({ now: next, toFake: ['Date'], ignoreMissingTimers: true });
      }
    }
  }
  getMockedSystemTime() {
    return this._fakingTime ? new Date(this._clock.now) : this._fakingDate;
  }
  getRealSystemTime() {
    return RealDate.now();
  }
}
const RealDate = globalThis.Date;
const timers = new FakeTimers(globalThis);

const notSupported = (name) => () => {
  throw new Error(
    `${name} в превью курса не поддерживается: модули здесь не подменить. В проекте Angular CLI (Vitest) он работает.`,
  );
};

const stubbedGlobals = new Map();

export const vi = {
  fn: spy.fn,
  spyOn: spy.spyOn,
  isMockFunction: spy.isMockFunction,
  mocked: (item) => item,
  clearAllMocks() {
    spy.clearAllMocks();
    return vi;
  },
  resetAllMocks() {
    spy.resetAllMocks();
    return vi;
  },
  restoreAllMocks() {
    spy.restoreAllMocks();
    return vi;
  },
  useFakeTimers(config) {
    timers.useFakeTimers(config);
    return vi;
  },
  useRealTimers() {
    timers.useRealTimers();
    return vi;
  },
  isFakeTimers: () => timers.isFakeTimers(),
  advanceTimersByTime(ms) {
    if (timers._check()) timers._clock.tick(ms);
    return vi;
  },
  async advanceTimersByTimeAsync(ms) {
    if (timers._check()) await timers._clock.tickAsync(ms);
    return vi;
  },
  advanceTimersToNextTimer(steps = 1) {
    if (timers._check()) {
      for (let i = steps; i > 0; i--) {
        timers._clock.next();
        timers._clock.tick(0);
        if (timers._clock.countTimers() === 0) break;
      }
    }
    return vi;
  },
  async advanceTimersToNextTimerAsync(steps = 1) {
    if (timers._check()) {
      for (let i = steps; i > 0; i--) {
        await timers._clock.nextAsync();
        timers._clock.tick(0);
        if (timers._clock.countTimers() === 0) break;
      }
    }
    return vi;
  },
  advanceTimersToNextFrame() {
    if (timers._check()) timers._clock.runToFrame();
    return vi;
  },
  runAllTimers() {
    if (timers._check()) timers._clock.runAll();
    return vi;
  },
  async runAllTimersAsync() {
    if (timers._check()) await timers._clock.runAllAsync();
    return vi;
  },
  runOnlyPendingTimers() {
    if (timers._check()) timers._clock.runToLast();
    return vi;
  },
  async runOnlyPendingTimersAsync() {
    if (timers._check()) await timers._clock.runToLastAsync();
    return vi;
  },
  runAllTicks() {
    if (timers._check()) timers._clock.runMicrotasks();
    return vi;
  },
  clearAllTimers() {
    if (timers._fakingTime) timers._clock.reset();
    return vi;
  },
  getTimerCount: () => (timers._check() ? timers._clock.countTimers() : 0),
  setSystemTime(time) {
    timers.setSystemTime(time);
    return vi;
  },
  getMockedSystemTime: () => timers.getMockedSystemTime(),
  getRealSystemTime: () => timers.getRealSystemTime(),
  /** Ждать, пока колбэк перестанет бросать (или вернёт значение без ошибки); на настоящих таймерах */
  waitFor(callback, options = {}) {
    const { timeout = 1000, interval = 50 } = typeof options === 'number' ? { timeout: options } : options;
    return new Promise((resolve, reject) => {
      let lastError;
      let done = false;
      const deadline = realSetTimeout(() => {
        done = true;
        reject(lastError ?? new Error(`Timed out in waitFor after ${timeout}ms`));
      }, timeout);
      const attempt = async () => {
        if (done) return;
        try {
          const result = await callback();
          done = true;
          realClearTimeout(deadline);
          resolve(result);
        } catch (error) {
          lastError = error;
          realSetTimeout(attempt, interval);
        }
      };
      attempt();
    });
  },
  waitUntil(callback, options = {}) {
    const { timeout = 1000, interval = 50 } = typeof options === 'number' ? { timeout: options } : options;
    return vi.waitFor(
      async () => {
        const result = await callback();
        if (!result) throw new Error(`Timed out in waitUntil after ${timeout}ms`);
        return result;
      },
      { timeout, interval },
    );
  },
  stubGlobal(name, value) {
    if (!stubbedGlobals.has(name)) {
      stubbedGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    }
    Object.defineProperty(globalThis, name, { value, writable: true, configurable: true, enumerable: true });
    return vi;
  },
  unstubAllGlobals() {
    for (const [name, original] of stubbedGlobals) {
      if (original) Object.defineProperty(globalThis, name, original);
      else delete globalThis[name];
    }
    stubbedGlobals.clear();
    return vi;
  },
  mock: notSupported('vi.mock'),
  doMock: notSupported('vi.doMock'),
  unmock: notSupported('vi.unmock'),
  importActual: notSupported('vi.importActual'),
  importMock: notSupported('vi.importMock'),
};
export const vitest = vi;
export const expect = globalExpect;
export const assert = chai.assert;
export { chai };

/** Где сейчас прогон: файл и полное имя теста — к какому месту отнести необработанную ошибку */
export function currentPlace() {
  return { file: currentFile, test: currentTest ? fullName(currentTest) : lastTestName };
}

/** Глобальные имена, как с globals: true в Vitest (так настраивает проект Angular CLI) */
export function installGlobals(target = globalThis) {
  Object.assign(target, {
    describe,
    suite,
    it,
    test,
    beforeAll,
    afterAll,
    beforeEach,
    afterEach,
    onTestFinished,
    onTestFailed,
    expect,
    assert,
    chai,
    vi,
    vitest,
  });
}
