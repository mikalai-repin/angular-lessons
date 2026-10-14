import type { Check } from '@course/check';

// Проверка практикума: «− N +» в строке корзины — компонент Quantity с границами от 1 до остатка на складе
const check: Check = async ({ $, $$, text, click, fail }) => {
  const number = (s: string) =>
    Number(s.match(/\d[\d\s]*/)?.[0].replace(/\s/g, '') ?? NaN);

  // Игра с небольшим остатком: «Осталось N шт.» — до N можно дойти щелчками
  const card =
    $$('app-game-card').find((c) =>
      /Осталось [2-9] шт/.test(text(c)),
    ) ??
    fail(
      'Не найдена карточка с «Осталось N шт.» — в каталоге должны быть все игры.',
    );
  const inStock = number(text($('.stock', card)));
  const price = number(text($('.price', card)));
  const add =
    $$('button', card).find((b) => text(b) === 'В корзину') ??
    fail('В карточке нет кнопки «В корзину».');
  await click(add);

  const row =
    $('.cart-row') ??
    fail('После «В корзину» в корзине не появилась строка.');
  const quantity =
    $('app-quantity', row) ??
    fail('В строке корзины нет компонента <app-quantity>.');
  const outside = $$('button', row).filter(
    (b) =>
      !quantity.contains(b) && ['−', '+'].includes(text(b)),
  );
  if (outside.length)
    fail(
      'В строке корзины остались старые кнопки «−» и «+» — их заменяет <app-quantity>.',
    );

  const buttons = $$<HTMLButtonElement>('button', quantity);
  if (buttons.length !== 2)
    fail('В <app-quantity> должно быть две кнопки: «−» и «+».');
  const [minus, plus] = buttons;
  const value = () =>
    number(text(quantity).replace(/[−+]/g, ''));
  const sum = () => number(text($('.cart-row-sum', row)));

  if (value() !== 1)
    fail(
      'Сразу после «В корзину» <app-quantity> должен показывать 1.',
    );
  if (!minus.disabled)
    fail(
      'При количестве 1 кнопка «−» должна быть неактивной: минимум в корзине — 1.',
    );

  await click(plus);
  if (value() !== 2)
    fail(
      'После «+» число в <app-quantity> не стало 2. Сообщает ли компонент о новом значении?',
    );
  if (sum() !== price * 2)
    fail(
      'После «+» сумма строки корзины не пересчиталась — App не получил новое количество.',
    );
  if (minus.disabled)
    fail('При количестве 2 кнопка «−» должна быть активной.');

  for (let i = 2; i < inStock; i++) await click(plus);
  if (value() !== inStock)
    fail(
      `Щелчками «+» не удаётся дойти до остатка на складе (${inStock}).`,
    );
  if (!plus.disabled)
    fail(
      'Когда количество равно остатку на складе, кнопка «+» должна быть неактивной.',
    );
  plus.disabled = false; // на случай, если граница держится только на disabled
  await click(plus);
  if (value() !== inStock)
    fail(
      'Количество вышло за остаток на складе: значение должно ограничиваться и в коде.',
    );

  for (let i = inStock; i > 1; i--) await click(minus);
  if (value() !== 1 || !minus.disabled)
    fail(
      'Кнопкой «−» количество должно опускаться до 1, не ниже.',
    );
  if (sum() !== price)
    fail(
      'Сумма строки корзины не совпадает с ценой игры при количестве 1.',
    );
  return { pass: true };
};

export default check;
