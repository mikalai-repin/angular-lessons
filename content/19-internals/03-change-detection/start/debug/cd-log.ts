// Журнал проверок с причинами: что разбудило планировщик и почему Angular обновил шаблон каждого компонента.
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

export function logChangeDetectionReasons(
  appRef: ApplicationRef,
) {
  const ng = (window as any).ng;
  const sources = new Set<string>();
  let before = new Map<object, Before>();
  let checked: string[] = [];
  // Компоненты, созданные в этой проверке: их первое обновление — часть создания
  const created = new WeakSet<object>();

  // Планировщик — один на приложение; оборачиваем его notify, чтобы видеть, кто его будит
  const scheduler = appRef.injector.get(
    ChangeDetectionScheduler,
  ) as any;
  const notify = scheduler.notify.bind(scheduler);
  scheduler.notify = (source: number) => {
    sources.add(SOURCES[source] ?? `источник ${source}`);
    notify(source);
  };

  ng.ɵsetProfiler((event: number, context: any) => {
    const component = context?.constructor?.ɵcmp
      ? context
      : null;
    if (event === CHANGE_DETECTION_START) {
      // Флаги снимаем в начале: по ходу проверки Angular их сбрасывает
      before = snapshot(appRef);
      checked = [];
    }
    if (event === TEMPLATE_CREATE_START && component)
      created.add(component);
    if (event === TEMPLATE_UPDATE_START && component) {
      const why = created.has(component)
        ? 'создан'
        : reason(
            componentView(component),
            before.get(component),
          );
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
    for (
      let child = view[CHILD_HEAD];
      child;
      child = child[NEXT]
    ) {
      // LContainer (место @if, @for, router-outlet) хранит свои представления с 10-й ячейки
      if (child[TVIEW] === true) {
        for (let i = 10; i < child.length; i++)
          visitView(child[i]);
      } else visitView(child);
    }
  };
  for (const ref of appRef.components) {
    const view = componentView(ref.instance);
    if (view) visitView(view);
  }
  return result;
}
