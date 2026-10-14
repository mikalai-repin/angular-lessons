import type { Check, CheckStorage } from '@course/check';

// Сохранённые данные, с которыми стартует приложение: в корзине «Ночной экспресс» × 99 (на складе 3)
// и «Маяк» (его нет на складе), в избранном «Зельевары» и игра, которой нет в каталоге
export const storage: CheckStorage = {
  'hod-konem:cart:v1': JSON.stringify([
    { id: 4, quantity: 99 },
    { id: 7, quantity: 1 },
  ]),
  'hod-konem:favorites:v1': JSON.stringify([3, 999]),
};

// Проверка практикума: правила склада в CartStore, карточке и окне «Подробнее»; избранное в localStorage.
// Границы setQuantity через интерфейс не проверить: «−» и «+» в мини-корзине и так держит Quantity
const check: Check = async ({ $, $$, text, click, fail }) => {
  const cartCount = () =>
    Number(
      text('.header .cart').match(/В корзине: (\d+)/)?.[1] ??
        NaN,
    );
  const card = (title: string) =>
    $$('app-game-card').find((c) =>
      text($('.title-button', c) ?? c).includes(title),
    ) ?? fail(`В каталоге не найдена карточка «${title}».`);
  const addButton = (root: Element) =>
    $$<HTMLButtonElement>('button', root).find(
      (b) => text(b) === 'В корзину',
    ) ?? fail('Не найдена кнопка «В корзину».');
  /** Щелчок даже по неактивной кнопке: правило должно держаться в хранилище, а не только на disabled */
  const forceClick = async (button: HTMLButtonElement) => {
    button.disabled = false;
    await click(button);
  };

  // loadCart и загрузка избранного
  const rows = $$(
    'app-mini-cart .cart-row, app-mini-cart app-quantity',
  );
  if (cartCount() !== 3) {
    fail(
      `В сохранённой корзине «Ночной экспресс» × 99 и «Маяк». После запуска в корзине должно быть 3 шт., а не ${cartCount()}: loadCart уменьшает количество до остатка и отбрасывает игры, которых нет.`,
    );
  }
  if (text('app-mini-cart').includes('Маяк'))
    fail(
      '«Маяка» нет на складе, а loadCart оставил его в корзине.',
    );
  if (!rows.length)
    fail(
      'Не найдена мини-корзина с позициями (<app-mini-cart>).',
    );
  if (!/♥\s*1\b/.test(text('.header .favorites'))) {
    fail(
      'В сохранённом избранном [3, 999]: игры 999 нет в каталоге, поэтому после запуска в шапке должно быть «♥ 1».',
    );
  }

  // Все 3 шт. в корзине: карточка
  const train = card('Ночной экспресс');
  if (!text(train).includes('Все 3 шт. в корзине'))
    fail(
      'В корзине все 3 «Ночных экспресса», а в карточке нет «Все 3 шт. в корзине».',
    );
  const trainAdd = addButton(train);
  if (!trainAdd.disabled)
    fail(
      'Все 3 шт. уже в корзине, а «В корзину» в карточке активна.',
    );
  await forceClick(trainAdd);
  if (cartCount() !== 3)
    fail(
      'add(game) положил в корзину больше, чем есть на складе.',
    );

  // Окно «Подробнее»
  await click(
    $('.title-button', train) ??
      fail('В карточке нет кнопки с названием игры.'),
  );
  const details =
    $('app-game-details') ??
    fail(
      'По щелчку на название не открылось окно «Подробнее».',
    );
  if (!addButton(details).disabled)
    fail(
      'Все 3 шт. в корзине, а «В корзину» в окне «Подробнее» активна.',
    );

  // Избранное сохраняется
  const potions = card('Зельевары');
  const heart =
    $<HTMLButtonElement>('button.favorite', potions) ??
    fail('В карточке нет сердечка (button.favorite).');
  await click(heart);
  const saved: unknown = JSON.parse(
    localStorage.getItem('hod-konem:favorites:v1') ?? 'null',
  );
  if (!Array.isArray(saved) || saved.includes(3)) {
    fail(
      '«Зельевары» убрали из избранного, а в localStorage под ключом hod-konem:favorites:v1 это не записалось.',
    );
  }
  await click(heart);
  const again: unknown = JSON.parse(
    localStorage.getItem('hod-konem:favorites:v1') ?? 'null',
  );
  if (!Array.isArray(again) || !again.includes(3))
    fail(
      'Избранное в localStorage не обновилось после щелчка по сердечку.',
    );
  return { pass: true };
};

export default check;
