# Генератор кода шагов главы 19 «Под капотом Angular».
# Запуск: python3 tools/authoring/ch19-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 19.
#         python3 tools/authoring/ch19-gen.py dump <папка> — полные снимки шагов в <папка>/<шаг>/<start|solution>
#         (для опытов: tools/e2e/run-dir.mjs и exp.mjs принимают такую папку).
# Старт главы — решение практикума главы 18 (09-practice; шаг 10 без кода). Магазин не меняется: глава смотрит
# на него изнутри — код шаблонов (вкладка «Шаблон»), представления (журнал по Alt + щелчку), проверки с причинами,
# zone.js, примитивы сигналов, AOT. Практикум — найти и убрать лишние проверки.
# Шаги — полные снимки: каждый строится правками (edit) поверх результата предыдущего шага.
# Код форматирует write_steps (как кнопка «Формат» в редакторе). После запуска: npm run validate.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, shutil, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import PROJECT, format_snapshots, read_dir, rep, step_dir, write_steps

ROOT = f'{PROJECT}/content/19-internals'
BASE = read_dir(step_dir(f'{PROJECT}/content/18-ngrx/09-practice/solution'))


def edit(files, name, *pairs):
    """Копия снимка, в которой файл name изменён заменами (старое, новое)."""
    out = dict(files)
    text = out[name]
    for old, new in pairs:
        text = rep(text, old, new)
    out[name] = text
    return out


def put(files, **named):
    """Копия снимка с новыми или заменёнными файлами: put(S, **{'core/x.ts': '…'})."""
    out = dict(files)
    out.update(named)
    return out


def drop(files, *names):
    """Копия снимка без файлов names."""
    out = dict(files)
    for name in names:
        del out[name]
    return out


# ---------- 19.1 Код шаблона: вкладка «Шаблон», кода нет ----------

S1 = BASE

# ---------- 19.2 Представления: LView и TView ----------

VIEW_LOG = """// Alt + щелчок по элементу превью: в консоли — представление (LView), в котором Angular создал элемент,
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
      printView(element, context.lView as any[], context.nodeIndex);
    },
    // Фаза перехвата: журнал срабатывает раньше обработчиков Angular
    true,
  );
}

function printView(element: Element, lView: any[], index: number) {
  const tView = lView[TVIEW];
  const tNode = tView.data[index];
  const { bindingStartIndex: bindings, expandoStartIndex: expando } = tView;
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
  const same = [...document.querySelectorAll('*')].filter((el) => {
    const c = getLContext(el);
    return (
      c?.lView &&
      (c.lView as any[])[TVIEW] === tView &&
      c.nodeIndex === index
    );
  }).length;
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
  for (let i = from; i < to; i++) items.push(`${i}: ${show(lView[i])}`);
  return items.join(', ');
}

// Ячейка узла: DOM-узел, LContainer (место @if/@for), LView дочернего компонента или экземпляр пайпа
function slot(item: any): string {
  if (Array.isArray(item)) {
    if (item[TVIEW] === true) return `LContainer[${item.length - 10}]`;
    return `LView ${name(item[CONTEXT])}`;
  }
  if (item instanceof Element) return tag(item);
  if (item instanceof Text)
    return JSON.stringify(item.textContent?.trim().slice(0, 14));
  if (item instanceof Comment) return `<!--${item.textContent}-->`;
  return value(item);
}

function value(item: any): string {
  if (typeof item === 'symbol') return item.description ?? 'symbol';
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
"""

MAIN_2_START = """import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { logViewOnAltClick } from './debug/view-log';

bootstrapApplication(App, appConfig)
  // TODO: когда приложение запустится, включите журнал представлений — logViewOnAltClick()
  .catch((err) => console.error(err));
"""

MAIN_2 = """import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { logViewOnAltClick } from './debug/view-log';

bootstrapApplication(App, appConfig)
  // Alt + щелчок по элементу — его представление в консоли
  .then(() => logViewOnAltClick())
  .catch((err) => console.error(err));
"""

S2_START = put(S1, **{'debug/view-log.ts': VIEW_LOG, 'main.ts': MAIN_2_START})
S2 = put(S2_START, **{'main.ts': MAIN_2})

# ---------- 19.3 Обнаружение изменений изнутри ----------

CD_LOG = """// Журнал проверок с причинами: что разбудило планировщик и почему Angular обновил шаблон каждого компонента.
// Подключается к профайлеру Angular (как журнал главы 6) и к планировщику проверок — оба внутренние (ɵ)
// и работают только в режиме разработки. Только для изучения.
import {
  ApplicationRef,
  ɵChangeDetectionScheduler as ChangeDetectionScheduler,
  ɵgetLContext as getLContext,
} from '@angular/core';

// Ячейки LView и флаги — из исходников @angular/core 22.2
const NEXT = 4;
const TVIEW = 1;
const FLAGS = 2;
const CONTEXT = 8;
const CHILD_HEAD = 12;
const TEMPLATE_CONSUMER = 24;
const CHECK_ALWAYS = 16;
const DIRTY = 64;
const REFRESH_VIEW = 1024;

// Кто сообщил планировщику (NotificationSource)
const SOURCES: Record<number, string> = {
  0: 'сигнал',
  1: 'вход',
  4: 'markForCheck',
  5: 'событие',
  7: 'afterRender',
  8: 'новое представление',
  9: 'удалено представление',
  11: 'задача завершена',
  12: 'корневой эффект',
  13: 'эффект компонента',
};

// Номера событий профайлера (ProfilerEvent)
const TEMPLATE_CREATE_START = 0;
const TEMPLATE_UPDATE_START = 2;
const CHANGE_DETECTION_START = 12;
const CHANGE_DETECTION_END = 13;

// Что было у представления перед проверкой: флаги и «грязный» ли потребитель-шаблон
interface Before {
  flags: number;
  signal: boolean;
}

export function logChangeDetectionReasons(appRef: ApplicationRef) {
  const ng = (window as any).ng;
  const sources = new Set<string>();
  let before = new Map<object, Before>();
  let checked: string[] = [];
  // Компоненты, созданные в этой проверке: их первое обновление — часть создания
  const created = new WeakSet<object>();

  // Планировщик — один на приложение; оборачиваем его notify, чтобы видеть, кто его будит
  const scheduler = appRef.injector.get(ChangeDetectionScheduler) as any;
  const notify = scheduler.notify.bind(scheduler);
  scheduler.notify = (source: number) => {
    sources.add(SOURCES[source] ?? `источник ${source}`);
    notify(source);
  };

  ng.ɵsetProfiler((event: number, context: any) => {
    const component = context?.constructor?.ɵcmp ? context : null;
    if (event === CHANGE_DETECTION_START) {
      // Флаги снимаем в начале: по ходу проверки Angular их сбрасывает
      before = snapshot(appRef);
      checked = [];
    }
    if (event === TEMPLATE_CREATE_START && component) created.add(component);
    if (event === TEMPLATE_UPDATE_START && component) {
      const why = created.has(component)
        ? 'создан'
        : reason(componentView(component), before.get(component));
      created.delete(component);
      checked.push(`${component.constructor.name} (${why})`);
    }
    if (event === CHANGE_DETECTION_END) {
      const what = [...sources].join(', ') || '—';
      console.log(
        `Проверка [${what}]: ${checked.join(', ') || 'шаблоны не обновлялись'}`,
      );
      sources.clear();
    }
  });
}

// Почему шаблон обновился: флаги до проверки, Eager, грязный потребитель-шаблон или пометка по ходу проверки
function reason(view: any[] | null, was?: Before): string {
  if (!view) return '?';
  if (was && was.flags & REFRESH_VIEW) return 'RefreshView';
  if (view[FLAGS] & CHECK_ALWAYS) return 'Eager';
  if (was?.signal) return 'сигнал';
  if (view[FLAGS] & DIRTY) return 'Dirty';
  return '?';
}

// LView компонента: экземпляр помнит представление родителя и номер своего узла в нём
function componentView(component: object): any[] | null {
  const context = getLContext(component);
  return context?.lView
    ? (context.lView as any[])[context.nodeIndex]
    : null;
}

// Обход дерева представлений от корневых компонентов: первый ребёнок — CHILD_HEAD, следующий — NEXT
function snapshot(appRef: ApplicationRef): Map<object, Before> {
  const result = new Map<object, Before>();
  const visitView = (view: any[]) => {
    const owner = view[CONTEXT];
    if (view[TVIEW].type === 1)
      result.set(owner, {
        flags: view[FLAGS],
        signal: Boolean(view[TEMPLATE_CONSUMER]?.dirty),
      });
    for (let child = view[CHILD_HEAD]; child; child = child[NEXT]) {
      // LContainer (место @if, @for, router-outlet) хранит свои представления с 10-й ячейки
      if (child[TVIEW] === true) {
        for (let i = 10; i < child.length; i++) visitView(child[i]);
      } else visitView(child);
    }
  };
  for (const ref of appRef.components) {
    const view = componentView(ref.instance);
    if (view) visitView(view);
  }
  return result;
}
"""

MAIN_3_START = """import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { logChangeDetectionReasons } from './debug/cd-log';
import { logViewOnAltClick } from './debug/view-log';

bootstrapApplication(App, appConfig)
  .then((appRef) => {
    // Alt + щелчок по элементу — его представление в консоли
    logViewOnAltClick();
    // TODO: журнал проверок с причинами — logChangeDetectionReasons(appRef)
  })
  .catch((err) => console.error(err));
"""

MAIN_3 = """import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { logChangeDetectionReasons } from './debug/cd-log';
import { logViewOnAltClick } from './debug/view-log';

bootstrapApplication(App, appConfig)
  .then((appRef) => {
    // Alt + щелчок по элементу — его представление в консоли
    logViewOnAltClick();
    // Каждая проверка приложения: что её запросило и почему обновлён каждый шаблон
    logChangeDetectionReasons(appRef);
  })
  .catch((err) => console.error(err));
"""

S3_START = put(S2, **{'debug/cd-log.ts': CD_LOG, 'main.ts': MAIN_3_START})
S3 = put(S3_START, **{'main.ts': MAIN_3})

# ---------- 19.4 zone.js ----------

S4 = edit(
    S3,
    'main.ts',
    (
        "import { bootstrapApplication } from '@angular/platform-browser';",
        "// zone.js — первым: он подменяет setTimeout, Promise, addEventListener до того, как ими кто-то воспользуется\n"
        "import 'zone.js';\n"
        "import { bootstrapApplication } from '@angular/platform-browser';",
    ),
)
S4 = edit(
    S4,
    'app.config.ts',
    ('  provideBrowserGlobalErrorListeners,\n', '  provideBrowserGlobalErrorListeners,\n  provideZoneChangeDetection,\n'),
    (
        '    provideBrowserGlobalErrorListeners(),\n',
        '    provideBrowserGlobalErrorListeners(),\n'
        '    // Проверки по zone.js — как в приложениях до Angular 20: после любого события, таймера, ответа сервера\n'
        '    provideZoneChangeDetection(),\n',
    ),
)

# ---------- 19.5 Сигналы изнутри ----------

SIGNAL_LAB_HEAD = """// Лаборатория: сигналы из примитивов Angular — тех самых, из которых сделаны signal, computed и effect.
// @angular/core/primitives/signals — пакет для авторов фреймворков и библиотек; в приложении пишут signal,
// computed и effect. Только для изучения.
import {
  SIGNAL,
  createComputed,
  createSignal,
  createWatch,
} from '@angular/core/primitives/signals';

"""

WATCH_START = """// Наш «эффект»: выполняет fn сразу и снова — когда изменилось то, что fn прочитала
function watch(fn: () => void) {
  // TODO: createWatch(fn, schedule, false) — schedule получает наблюдателя: выполните его run() микрозадачей
  // (queueMicrotask). Первый запуск — тоже через schedule: вызовите notify() у результата createWatch
}
"""

WATCH = """// Наш «эффект». Что выполнять и когда перезапускать, решает узел createWatch;
// когда именно выполнить — функция schedule: у нас микрозадачей
function watch(fn: () => void) {
  const handle = createWatch(
    fn,
    (watcher) => queueMicrotask(() => watcher.run()),
    false,
  );
  // Первый запуск — тоже через schedule
  handle.notify();
}
"""

SIGNAL_LAB_BODY = """
const pause = () => new Promise((resolve) => setTimeout(resolve));

export async function runSignalLab() {
  // createSignal возвращает три функции: чтение, запись, обновление
  const [price, setPrice] = createSignal(1990);
  const [quantity, setQuantity] = createSignal(1);
  let runs = 0;
  const total = createComputed(() => {
    runs++;
    return price() * quantity();
  });

  // У функции-сигнала узел — в свойстве SIGNAL. Версия растёт, только когда значение изменилось
  const versions = () =>
    `версии: price ${price[SIGNAL].version}, quantity ${quantity[SIGNAL].version}, total ${total[SIGNAL].version}`;

  watch(() =>
    console.log(
      `Итог ${total()}; вычислений total: ${runs}; ${versions()}`,
    ),
  );
  await pause();

  console.log('— Две записи подряд');
  setQuantity(2);
  setQuantity(3);
  await pause();

  console.log('— Запись того же значения');
  setPrice(1990);
  await pause();

  console.log('— Другие значения, тот же итог');
  setPrice(2985);
  setQuantity(2);
  await pause();
  console.log(`Вычислений total: ${runs}; ${versions()}`);
}
"""

MAIN_5 = """import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';
import { logChangeDetectionReasons } from './debug/cd-log';
import { runSignalLab } from './debug/signal-lab';
import { logViewOnAltClick } from './debug/view-log';

// Лаборатория сигналов: печатает в консоль, как живут узлы
runSignalLab();

bootstrapApplication(App, appConfig)
  .then((appRef) => {
    // Alt + щелчок по элементу — его представление в консоли
    logViewOnAltClick();
    // Каждая проверка приложения: что её запросило и почему обновлён каждый шаблон
    logChangeDetectionReasons(appRef);
  })
  .catch((err) => console.error(err));
"""

# Старт: магазин снова без zone.js (как до шага 4), лаборатория с заготовкой watch
S5_START = put(
    S3,
    **{
        'debug/signal-lab.ts': SIGNAL_LAB_HEAD + WATCH_START + SIGNAL_LAB_BODY,
        'main.ts': MAIN_5,
    },
)
S5 = put(S5_START, **{'debug/signal-lab.ts': SIGNAL_LAB_HEAD + WATCH + SIGNAL_LAB_BODY})

# ---------- 19.6 JIT и AOT: кода нет ----------

S6 = S5

# ---------- 19.7 Практикум: лишние проверки ----------

# Три «закладки» в магазине: карточка с Eager, шапка с markForCheck по таймеру, computed с новым объектом
S7_START = edit(
    put(S5, **{'main.ts': MAIN_3}),
    'shared/game-card/game-card.ts',
    (
        "import {\n  Component,\n",
        "import {\n  ChangeDetectionStrategy,\n  Component,\n",
    ),
    (
        "  templateUrl: './game-card.html',\n",
        "  templateUrl: './game-card.html',\n"
        "  // Карточка проверяется всякий раз, когда проверяется список, — так надёжнее\n"
        "  changeDetection: ChangeDetectionStrategy.Eager,\n",
    ),
    (
        """  // Сколько штук этой игры уже в корзине и сколько ещё можно добавить
  protected readonly inCart = computed(() =>
    this.cart.quantityOf(this.game()),
  );
  protected readonly available = computed(() =>
    this.cart.available(this.game()),
  );
""",
        """  // Всё, что карточке нужно знать о корзине, — одним объектом:
  // сколько штук этой игры уже в корзине и сколько ещё можно добавить
  protected readonly stock = computed(() => ({
    inCart: this.cart.quantityOf(this.game()),
    available: this.cart.available(this.game()),
  }));
""",
    ),
)
S7_START = edit(
    S7_START,
    'shared/game-card/game-card.html',
    ('} @else if (available() === 0) {', '} @else if (stock().available === 0) {'),
    ('[disabled]="available() === 0"', '[disabled]="stock().available === 0"'),
    ('@if (inCart() > 0) {', '@if (stock().inCart > 0) {'),
    ('В корзине: {{ inCart() }} шт.', 'В корзине: {{ stock().inCart }} шт.'),
)
S7_START = edit(
    S7_START,
    'layout/header/header.ts',
    (
        "import { Component, computed, inject } from '@angular/core';",
        "import {\n  ChangeDetectorRef,\n  Component,\n  computed,\n  inject,\n} from '@angular/core';",
    ),
    (
        '  private readonly router = inject(Router);\n',
        """  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);

  constructor() {
    // Сводку корзины — обновлять раз в секунду, на всякий случай
    setInterval(() => this.changeDetector.markForCheck(), 1000);
  }
""",
    ),
)
# Решение — магазин без закладок: те же файлы, что до них
S7 = put(
    S7_START,
    **{
        name: S5[name]
        for name in ('shared/game-card/game-card.ts', 'shared/game-card/game-card.html', 'layout/header/header.ts')
    },
)


steps = {
    '01-template-code': {'start': S1},
    '02-views': {'start': S2_START, 'solution': S2},
    '03-change-detection': {'start': S3_START, 'solution': S3},
    '04-zone': {'start': S3, 'solution': S4},
    '05-signals-inside': {'start': S5_START, 'solution': S5},
    '06-jit-aot': {'start': S6},
    '07-practice': {'start': S7_START, 'solution': S7},
}


def dump(target):
    """Полные снимки шагов (отформатированные) — в target/<шаг>/<start|solution>/ для опытов."""
    kinds = [(step, kind, spec[kind]) for step, spec in steps.items() for kind in ('start', 'solution') if spec.get(kind) is not None]
    for (step, kind, _), files in zip(kinds, format_snapshots([files for _, _, files in kinds])):
        path = os.path.join(target, step, kind)
        shutil.rmtree(path, ignore_errors=True)
        for name, code in files.items():
            full = os.path.join(path, name)
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, 'w') as f:
                f.write(code)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'dump':
        dump(sys.argv[2])
    else:
        write_steps(ROOT, steps, base='18-ngrx/09-practice')
    print('ok')
