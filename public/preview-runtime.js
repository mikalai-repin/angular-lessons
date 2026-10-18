// Среда выполнения кода ученика внутри iframe.
//
// Протокол с родительским окном (src/preview/Preview.tsx):
//   iframe → родитель: { type: 'ready' }
//   родитель → iframe: { type: 'run', files: { 'main.js': '<js>', … }, entry: 'main.js', styles: ['<css>'],
//                        url: '/catalog', backend: { latency, failRate } }
//   iframe → родитель: { type: 'console', level, text } | { type: 'error', text } | { type: 'url', url } | { type: 'title', title }
//                      | { type: 'network', entry: { id, method, url, status, ms, … } }
//   родитель → iframe: { type: 'navigate', url } | { type: 'history', delta } | { type: 'backend-config', config }
//   Проверка шага: в 'run' есть check — JS-модуль проверки (check.ts шага); после старта приложения
//   iframe → родитель: { type: 'check-result', pass, hint }
//
// Каждый запуск — новый iframe, поэтому здесь нет никакой очистки состояния.

import { init, parse } from '/vendor/es-module-lexer.js';
import { createBackend } from '/backend/backend.js';

const parentWindow = window.parent;
const SOURCE = 'angular-course-preview';
const send = (message) => {
  // Для проверки шага: ошибки — с начала запуска, консоль и запросы — с начала проверки (context.errors, logs, requests).
  // Массивы живые: проверка деструктурирует контекст сразу, а читает их после своих действий
  if (message.type === 'error' || (message.type === 'console' && message.level === 'error'))
    errorLog.push(message.text);
  if (message.type === 'console') checkLogs?.push(message.text);
  if (message.type === 'network' && message.entry.status !== 'pending') {
    const { method, url, status, requestHeaders } = message.entry;
    checkRequests?.push({ method, url, status, headers: requestHeaders ?? {} });
  }
  parentWindow.postMessage({ source: SOURCE, ...message }, '*');
};
const errorLog = [];
let checkLogs = null;
let checkRequests = null;

/** Приложение ученика живёт под /app/: так роутер не видит путь /preview.html (см. docs/architecture.md) */
const APP_BASE = '/app';

// ---------- Source map: номера строк в ошибках → строки .ts ----------

/** blob-URL → имя файла, чтобы в ошибках было видно «cart.ts:12», а не «blob:...» */
const blobNames = new Map();

/** Имя .ts-файла → разобранная source map: номера строк скомпилированного JS → строки исходника */
const sourceMaps = new Map();

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Разбирает поле mappings (Base64 VLQ) в массив строк: [[генКолонка, исхСтрока, исхКолонка], ...] */
function decodeMappings(mappings) {
  const lines = [];
  let sourceLine = 0;
  let sourceColumn = 0;
  for (const lineText of mappings.split(';')) {
    const segments = [];
    let generatedColumn = 0;
    for (const segmentText of lineText.split(',')) {
      if (!segmentText) continue;
      const values = [];
      let value = 0;
      let shift = 0;
      for (const char of segmentText) {
        const digit = BASE64.indexOf(char);
        value += (digit & 31) << shift;
        if (digit & 32) {
          shift += 5;
        } else {
          values.push(value & 1 ? -(value >>> 1) : value >>> 1);
          value = 0;
          shift = 0;
        }
      }
      generatedColumn += values[0];
      if (values.length >= 4) {
        sourceLine += values[2];
        sourceColumn += values[3];
        segments.push([generatedColumn, sourceLine, sourceColumn]);
      }
    }
    lines.push(segments);
  }
  return lines;
}

function readInlineSourceMap(code) {
  const match = /\/\/# sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)/.exec(code);
  if (!match) return null;
  try {
    const bytes = Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0));
    const map = JSON.parse(new TextDecoder().decode(bytes));
    return decodeMappings(map.mappings);
  } catch {
    return null;
  }
}

function mapPosition(file, line, column) {
  const segments = sourceMaps.get(file)?.[line - 1];
  if (!segments?.length) return null;
  let best = segments[0];
  for (const segment of segments) {
    if (segment[0] <= column - 1) best = segment;
    else break;
  }
  return { line: best[1] + 1, column: best[2] + 1 };
}

function prettify(text) {
  let result = String(text);
  for (const [url, name] of blobNames) result = result.split(url).join(name);
  // Пути к файлам Angular в стеке длинные и ученику не нужны
  result = result.replace(new RegExp(`${location.origin}/vendor/angular/`, 'g'), '@angular/');
  return result.replace(/([\w./-]+\.ts):(\d+):(\d+)/g, (whole, file, line, column) => {
    const original = mapPosition(file, Number(line), Number(column));
    return original ? `${file}:${original.line}:${original.column}` : whole;
  });
}

// ---------- Консоль ----------

/** Сигналы Angular — функции со скрытым символом SIGNAL; показываем их значение, не вызывая (вызов создал бы зависимость) */
function signalNode(value) {
  const symbol = Object.getOwnPropertySymbols(value).find((s) => s.description === 'SIGNAL');
  return symbol ? value[symbol] : null;
}

function formatValue(value, depth = 0) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  const type = typeof value;
  if (type === 'string') return depth === 0 ? value : JSON.stringify(value);
  if (type === 'number' || type === 'boolean' || type === 'bigint') return String(value);
  if (type === 'function') {
    const node = signalNode(value);
    if (node) {
      // kind узла: signal, computed, linkedSignal, input…; у computed вместо значения бывают
      // служебные символы: UNSET (ещё ни разу не читали) и ERRORED (вычисление бросило исключение)
      const kind = node.kind && node.kind !== 'unknown' ? node.kind : 'computation' in node ? 'computed' : 'signal';
      const special = { UNSET: 'ещё не вычислен', ERRORED: 'ошибка' }[
        typeof node.value === 'symbol' && node.value.description
      ];
      return `${kind}(${special ?? (depth >= 2 ? '…' : formatValue(node.value, depth + 1))})`;
    }
    return `ƒ ${value.name || 'anonymous'}()`;
  }
  if (type === 'symbol') return value.toString();
  if (value instanceof Error) return prettify(value.stack || `${value.name}: ${value.message}`);
  if (value instanceof Node) {
    if (value instanceof Element) return `<${value.tagName.toLowerCase()}${value.id ? '#' + value.id : ''}>`;
    return value.nodeName;
  }

  const name = value.constructor?.name;
  if (Array.isArray(value)) {
    if (depth >= 2) return `Array(${value.length})`;
    const items = value.slice(0, 20).map((item) => formatValue(item, depth + 1));
    if (value.length > 20) items.push(`… ещё ${value.length - 20}`);
    return `[${items.join(', ')}]`;
  }
  // Объекты Angular (компоненты, инжекторы, ElementRef) огромные и с циклическими ссылками — только имя класса
  if (name && name !== 'Object') {
    if (value instanceof Map) return `Map(${value.size})`;
    if (value instanceof Set) return `Set(${value.size})`;
    if (value instanceof Date) return value.toISOString();
    return `${name} {…}`;
  }
  if (depth >= 2) return '{…}';
  const keys = Object.keys(value);
  const entries = keys.slice(0, 20).map((key) => `${key}: ${formatValue(value[key], depth + 1)}`);
  if (keys.length > 20) entries.push(`… ещё ${keys.length - 20}`);
  return `{ ${entries.join(', ')} }`;
}

for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
  const original = console[level].bind(console);
  console[level] = (...args) => {
    // Сначала форматируем, потом вызываем настоящую консоль: браузер с открытыми DevTools вызывает
    // toString() у аргументов-функций, а toString() у computed из @angular/core вычисляет его значение
    let text = null;
    try {
      text = args.map((arg) => formatValue(arg)).join(' ');
    } catch {
      // Ошибка форматирования не должна ломать код ученика
    }
    original(...args);
    if (text !== null) send({ type: 'console', level, text });
  };
}

// Необработанные ошибки. Наш слушатель срабатывает раньше слушателей Angular: если приложение подключило
// provideBrowserGlobalErrorListeners(), Angular сам выведет ошибку через ErrorHandler («ERROR Error: …»)
// и вызовет preventDefault(). Поэтому решение откладываем до конца обработки события — как браузер,
// который не пишет «Uncaught» для обработанных ошибок
window.addEventListener('error', (event) => {
  setTimeout(() => {
    if (!event.defaultPrevented) send({ type: 'error', text: prettify(event.error?.stack || event.message) });
  });
});

window.addEventListener('unhandledrejection', (event) => {
  setTimeout(() => {
    if (event.defaultPrevented) return;
    const reason = event.reason;
    send({ type: 'error', text: prettify(reason?.stack || String(reason)) });
  });
});

// ---------- Адрес приложения (роутинг внутри iframe) ----------

function appUrl() {
  const path = location.pathname.startsWith(APP_BASE) ? location.pathname.slice(APP_BASE.length) : location.pathname;
  return (path || '/') + location.search + location.hash;
}

let lastReportedUrl = null;
function reportUrl() {
  const url = appUrl();
  if (url === lastReportedUrl) return;
  lastReportedUrl = url;
  send({ type: 'url', url });
}

// Роутер Angular меняет адрес через pushState/replaceState: оборачиваем их, чтобы показывать адрес в адресной строке
for (const method of ['pushState', 'replaceState']) {
  const original = history[method].bind(history);
  history[method] = (...args) => {
    original(...args);
    reportUrl();
  };
}
window.addEventListener('popstate', reportUrl);

// Заголовок вкладки (document.title): его меняет Title / TitleStrategy роутера — показываем над адресной строкой
let lastReportedTitle = null;
function reportTitle() {
  if (document.title === lastReportedTitle) return;
  lastReportedTitle = document.title;
  send({ type: 'title', title: document.title });
}
new MutationObserver(reportTitle).observe(document.head, { subtree: true, childList: true, characterData: true });
reportTitle();

/** Переход по адресу из адресной строки: как будто пользователь сменил URL, а роутер узнал об этом из popstate */
function navigate(url) {
  const target = url.startsWith('/') ? url : `/${url}`;
  history.pushState(null, '', APP_BASE + target);
  window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
}

// ---------- Учебный бэкенд ----------

const originalFetch = window.fetch.bind(window);
const backend = createBackend({
  originalFetch,
  report: (entry) => send({ type: 'network', entry }),
});

// Запросы на /api/… обслуживает учебный бэкенд, остальные — настоящий fetch.
// HttpClient в Angular 22 по умолчанию работает через fetch (FetchBackend), httpResource — через HttpClient
window.fetch = (input, init) => {
  const request = new Request(input, init);
  const url = new URL(request.url);
  if (url.origin === location.origin && url.pathname.startsWith('/api/')) return backend.handle(request);
  return originalFetch(input, init);
};

// ---------- Модули ----------

function resolveFile(files, fromFile, specifier) {
  const baseParts = fromFile.split('/').slice(0, -1);
  for (const part of specifier.split('/')) {
    if (part === '.' || part === '') continue;
    if (part === '..') baseParts.pop();
    else baseParts.push(part);
  }
  const path = baseParts.join('/');
  for (const candidate of [path, `${path}.js`, `${path}/index.js`]) {
    if (candidate in files) return candidate;
  }
  return null;
}

/**
 * Превращает набор файлов в blob-модули. Относительные импорты (`./cart`), в том числе динамические
 * (`loadComponent: () => import('./admin')`), заменяются на blob-URL зависимостей, а «голые» (`@angular/core`)
 * резолвит import map.
 */
function linkModules(files, entry) {
  const urls = new Map();
  const visiting = new Set();

  function build(file, chain) {
    if (urls.has(file)) return urls.get(file);
    if (visiting.has(file)) {
      const names = [...chain, file].map((name) => name.replace(/\.js$/, '.ts'));
      throw new Error(
        `Циклический импорт: ${names.join(' → ')}. Превью курса не поддерживает циклические зависимости между файлами.`,
      );
    }
    visiting.add(file);

    const code = files[file];
    const [imports] = parse(code, file);
    const replacements = [];

    for (const imp of imports) {
      const spec = imp.specifier;
      if (!spec || !(spec.startsWith('./') || spec.startsWith('../'))) continue;
      const target = resolveFile(files, file, spec);
      if (!target) throw new Error(`${file.replace(/\.js$/, '.ts')}: не найден файл для импорта "${spec}"`);
      const url = build(target, [...chain, file]);
      // У статического импорта start/end — без кавычек, у динамического — с кавычками
      const text = imp.type === 'dynamic' ? JSON.stringify(url) : url;
      replacements.push({ start: imp.start, end: imp.end, text });
    }

    let linked = code;
    for (const r of replacements.sort((a, b) => b.start - a.start)) {
      linked = linked.slice(0, r.start) + r.text + linked.slice(r.end);
    }

    // Модуль называется именем исходника (cart.ts) — так его видно в стеке и в DevTools
    const lines = readInlineSourceMap(code);
    const displayName = file.replace(/\.js$/, '.ts');
    if (lines) sourceMaps.set(displayName, lines);

    const url = URL.createObjectURL(new Blob([`${linked}\n//# sourceURL=${displayName}`], { type: 'text/javascript' }));
    blobNames.set(url, displayName);
    visiting.delete(file);
    urls.set(file, url);
    return url;
  }

  return build(entry, []);
}

/**
 * @defer в JIT: компилятор не выносит зависимости блока в отдельный файл (их функция загрузки — null), блок
 * «загружается» за микрозадачу, и @loading, @error, prefetch не видны. Сборка AOT грузит их чанком по сети.
 * Платформа создаётся заранее с перехватчиком загрузки (DEFER_BLOCK_DEPENDENCY_INTERCEPTOR — отладочный токен
 * Angular, работает в режиме разработки): каждый блок «качает» чанк через учебный бэкенд — с задержкой и ошибкой
 * из вкладки «Сеть». bootstrapApplication ученика переиспользует эту платформу. Номер чанка — порядок первой загрузки.
 */
async function createPlatformWithDeferChunks() {
  const core = await import('@angular/core');
  const { platformBrowser } = await import('@angular/platform-browser');
  let nextChunk = 1;
  const interceptor = {
    intercept: (dependenciesFn) => () => {
      const loaded = backend.chunk(`/chunk-defer-${nextChunk++}.js`);
      // В JIT зависимостей нет (null): блок отрисуется с тем, что уже есть в imports компонента
      return [loaded.then(() => ({})), ...(dependenciesFn?.() ?? [])];
    },
  };
  platformBrowser([{ provide: core.ɵDEFER_BLOCK_DEPENDENCY_INTERCEPTOR, useValue: interceptor }]);
}

function applyStyles(styles) {
  for (const css of styles ?? []) {
    const style = document.createElement('style');
    style.dataset.course = 'global';
    style.textContent = css;
    document.head.append(style);
  }
}

window.addEventListener('message', async (event) => {
  const data = event.data;
  if (event.source !== parentWindow) return;

  if (data?.type === 'navigate') return navigate(data.url);
  if (data?.type === 'history') return history.go(data.delta);
  if (data?.type === 'backend-config') return backend.configure(data.config);
  if (data?.type !== 'run') return;

  // Проверка шага — на чистых данных магазина: сохранённая корзина ученика не должна влиять на результат
  const restoreStorage = data.check ? isolateStorage() : () => {};
  // Модуль проверки загружаем до запуска приложения: его export storage — данные localStorage, с которыми
  // приложение стартует (сохранённая корзина и т. п.)
  const checkModule = data.check ? loadCheck(data.check) : null;
  if (checkModule)
    await checkModule.then(
      (module) => fillStorage(module.storage),
      () => {},
    );
  try {
    backend.configure(data.backend ?? {});
    // Адрес до запуска: роутер прочитает его при старте. <base href> — база для роутера (APP_BASE_HREF)
    const base = document.createElement('base');
    base.href = `${APP_BASE}/`;
    document.head.prepend(base);
    history.replaceState(null, '', APP_BASE + (data.url || '/'));
    applyStyles(data.styles);

    // Сборка не дала точку входа (ошибка уже в консоли с меткой «Сборка») — запускать нечего
    if (!(data.entry in data.files)) return;
    await init();
    const entryUrl = linkModules(data.files, data.entry);
    // JIT-компилятор шаблонов должен быть загружен до кода приложения
    await import('@angular/compiler');
    await createPlatformWithDeferChunks();
    await import(entryUrl);
  } catch (error) {
    send({ type: 'error', text: prettify(error?.stack || String(error)) });
  }
  if (data.check) {
    const result = await runCheck(checkModule);
    restoreStorage();
    send({ type: 'check-result', ...result });
  }
});

/** Ключи платформы (прогресс, тема) — в том же localStorage: iframe превью на том же origin */
const PLATFORM_KEY = /^angular-course/;

/** Убирает из localStorage данные приложения ученика; возвращает функцию, которая вернёт их как было */
function isolateStorage() {
  const appKeys = () => Object.keys(localStorage).filter((key) => !PLATFORM_KEY.test(key));
  try {
    const saved = appKeys().map((key) => [key, localStorage.getItem(key)]);
    for (const [key] of saved) localStorage.removeItem(key);
    return () => {
      for (const key of appKeys()) localStorage.removeItem(key);
      for (const [key, value] of saved) localStorage.setItem(key, value);
    };
  } catch {
    return () => {};
  }
}

// ---------- Проверка шага (check.ts) ----------

const CHECK_TIMEOUT = 15000;
const BOOT_TIMEOUT = 5000;

/** Неудача, объявленная проверкой через context.fail(hint) */
class CheckFailure extends Error {}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ApplicationRef приложения ученика: корневой компонент находим через отладочный API ng (есть только в
 * режиме разработки — превью всегда в нём). bootstrapApplication асинхронный, поэтому ждём его
 */
async function waitForApp() {
  const { ApplicationRef } = await import('@angular/core');
  const started = Date.now();
  while (Date.now() - started < BOOT_TIMEOUT) {
    for (const element of document.body.querySelectorAll('*')) {
      const component = window.ng?.getComponent?.(element);
      if (component) return window.ng.getInjector(element).get(ApplicationRef);
    }
    await delay(50);
  }
  return null;
}

async function loadCheck(code) {
  const url = URL.createObjectURL(new Blob([`${code}\n//# sourceURL=check.ts`], { type: 'text/javascript' }));
  try {
    return await import(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function fillStorage(entries) {
  try {
    for (const [key, value] of Object.entries(entries ?? {})) localStorage.setItem(key, value);
  } catch {
    // localStorage недоступен — проверка увидит приложение без сохранённых данных
  }
}

async function runCheck(checkModule) {
  try {
    const appRef = await waitForApp();
    if (!appRef) return { pass: false, hint: 'Приложение не запустилось: посмотрите ошибки в консоли.' };

    /** Angular закончил обновление экрана (зонлесс: задачи отрисовки и запросы — PendingTasks), браузер — кадр */
    const settle = async (ms = 0) => {
      await nextFrame();
      await appRef.whenStable();
      await nextFrame();
      if (ms) await delay(ms);
    };
    const element = (target) => {
      const found = typeof target === 'string' ? document.querySelector(target) : target;
      if (!found) throw new CheckFailure(`На странице нет элемента «${target}».`);
      return found;
    };
    checkLogs = [];
    checkRequests = [];
    const context = {
      document,
      url: appUrl,
      settle,
      navigate: async (target) => {
        navigate(target);
        await settle();
      },
      $: (selector, root = document) => root.querySelector(selector),
      $$: (selector, root = document) => [...root.querySelectorAll(selector)],
      text: (target) => {
        const found = typeof target === 'string' ? document.querySelector(target) : target;
        return (found?.innerText ?? found?.textContent ?? '').replace(/\s+/g, ' ').trim();
      },
      visible: (target) => {
        const found = typeof target === 'string' ? document.querySelector(target) : target;
        return Boolean(found?.getClientRects().length) && getComputedStyle(found).visibility !== 'hidden';
      },
      click: async (target) => {
        element(target).click();
        await settle();
      },
      fill: async (target, value) => {
        const field = element(target);
        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        await settle();
      },
      setChecked: async (target, checked) => {
        const box = element(target);
        if (box.checked !== checked) box.click();
        await settle();
      },
      fail: (hint) => {
        throw new CheckFailure(hint);
      },
      requests: checkRequests,
      logs: checkLogs,
      errors: errorLog,
    };

    await settle();
    const { default: check } = await checkModule;
    const result = await Promise.race([
      Promise.resolve().then(() => check(context)),
      delay(CHECK_TIMEOUT).then(() => ({ pass: false, hint: 'Проверка не закончилась за 15 секунд.' })),
    ]);
    if (!result?.pass) return { pass: false, hint: result?.hint ?? 'Проверка не прошла.' };
    return { pass: true };
  } catch (error) {
    if (error instanceof CheckFailure) return { pass: false, hint: error.message };
    send({ type: 'console', level: 'warn', text: `Проверка упала: ${prettify(error?.stack || String(error))}` });
    return { pass: false, hint: `Проверка упала с ошибкой: ${error?.message ?? error}` };
  }
}

send({ type: 'ready' });
