import type { Check } from '@course/check';

// Номер события профайлера Angular 22 «начало обновления шаблона» (ProfilerEvent.TemplateUpdateStart)
const TEMPLATE_UPDATE_START = 2;

// Проверка практикума: в простое Angular не проверяет ничего, «В корзину» обновляет одну карточку и шапку,
// а корзина по-прежнему работает (счётчик в шапке, «В корзине: 1 шт.» у карточки)
const check: Check = async ({
  document,
  $,
  $$,
  text,
  click,
  navigate,
  settle,
  fail,
}) => {
  const win = (document.defaultView ??
    fail('Нет окна приложения.')) as Window & { ng?: any };
  const ng =
    win.ng ??
    fail(
      'Нет отладочных функций Angular (ng): приложение не запустилось?',
    );
  const pause = (ms: number) =>
    new Promise((resolve) => win.setTimeout(resolve, ms));

  // Сколько раз Angular обновил шаблон каждого компонента — тем же профайлером, что журнал проверок
  const updates = new Map<string, number>();
  const count = (name: string) => updates.get(name) ?? 0;
  const summary = () =>
    [...updates].map(([name, n]) => `${name} ×${n}`).join(', ');
  const removeProfiler: () => void = ng.ɵsetProfiler(
    (event: number, context: any) => {
      if (
        event !== TEMPLATE_UPDATE_START ||
        !context?.constructor?.ɵcmp
      )
        return;
      const name = context.constructor.name;
      updates.set(name, count(name) + 1);
    },
  );

  try {
    await navigate('/');
    // Главная загружает хиты с сервера: ждём карточки
    for (
      let i = 0;
      i < 40 && $$('app-game-card').length < 4;
      i++
    )
      await pause(100);
    const cards = $$('app-game-card');
    if (cards.length < 4)
      fail(
        'На главной нет карточек игр: магазин должен работать как прежде.',
      );
    await settle(300);

    // 1. Магазин стоит без дела — проверок быть не должно
    updates.clear();
    await pause(2500);
    if (updates.size > 0)
      fail(
        `Магазин ничего не делает, а Angular обновляет шаблоны: ${summary()}. Посмотрите в журнале проверок, кто будит планировщик в простое, и найдите этот код.`,
      );

    // 2. «В корзину» у первой карточки: обновляется она и то, что показывает корзину, — не все карточки
    const first = cards[0];
    const button =
      $('.button', first) ??
      fail('В карточке нет кнопки «В корзину».');
    updates.clear();
    await click(button);
    await settle(300);
    const cardUpdates = count('GameCard');
    if (cardUpdates === 0)
      fail(
        'После «В корзину» карточка не обновилась: на ней не появилось «В корзине: 1 шт.».',
      );
    if (cardUpdates > 1) {
      const eager =
        ng.getComponent(first)?.constructor?.ɵcmp?.onPush ===
        false;
      fail(
        eager
          ? `После «В корзину» обновились шаблоны ${cardUpdates} карточек, хотя изменилась одна. Посмотрите в журнале, по какой причине обновлены остальные, и какая настройка карточки за это отвечает.`
          : `После «В корзину» обновились шаблоны ${cardUpdates} карточек, а изменилась одна. Причина в журнале — «сигнал»: шаблоны остальных карточек читают то, что получает новую версию при любом изменении корзины. Что читает шаблон карточки и что возвращает её computed?`,
      );
    }

    // 3. Корзина работает: шапка и карточка показывают новую игру
    if (!text('app-header').includes('В корзине: 1'))
      fail(
        'В шапке не видно «В корзине: 1»: корзина должна работать как прежде.',
      );
    if (!text(first).includes('В корзине: 1 шт.'))
      fail(
        'У карточки нет строки «В корзине: 1 шт.»: карточка должна показывать, сколько игр в корзине.',
      );
  } finally {
    removeProfiler();
  }
  return { pass: true };
};

export default check;
