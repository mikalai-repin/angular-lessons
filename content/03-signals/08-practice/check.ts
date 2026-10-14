import type { Check } from '@course/check';

// Проверка практикума: «Уже в корзине», склад, итог и доставка, «Очистить корзину» — на «Острове сокровищ»
const check: Check = async ({ $, $$, text, click, fail }) => {
  const page = () => text('main');
  const inCartCount = () =>
    Number(
      text('.header .cart').match(/В корзине: (\d+)/)?.[1] ??
        NaN,
    );
  const button = (label: string) =>
    $$<HTMLButtonElement>('button').find(
      (b) => text(b) === label,
    ) ?? fail(`Не найдена кнопка «${label}».`);

  if (text('.card .title') !== 'Остров сокровищ')
    fail(
      'Проверка начинает с первой игры — «Острова сокровищ».',
    );
  const price = 1990;
  const inStock = 12;
  if (page().includes('Уже в корзине'))
    fail(
      'Игры ещё нет в корзине, а строка «Уже в корзине» видна.',
    );

  // 1. Уже в корзине и «Убрать»
  await click(button('В корзину'));
  if (!page().includes('Уже в корзине: 1 шт.'))
    fail(
      'После «В корзину» под кнопками нет «Уже в корзине: 1 шт.».',
    );
  if (!page().includes(`Итого: ${price} ₽`))
    fail(`В мини-корзине нет «Итого: ${price} ₽».`);
  if (!page().includes('До бесплатной доставки: 3010 ₽'))
    fail(
      'В мини-корзине нет «До бесплатной доставки: 3010 ₽».',
    );
  await click(button('Убрать'));
  if (page().includes('Уже в корзине') || inCartCount() !== 0)
    fail(
      '«Убрать» должна убрать игру из корзины и скрыть строку.',
    );

  // 2. Склад: не больше 12 штук с учётом корзины
  const plus =
    $<HTMLButtonElement>('.card button[aria-label="Больше"]') ??
    fail('Не найдена кнопка «+» (aria-label="Больше").');
  for (let i = 1; i < inStock; i++) await click(plus);
  await click(button('В корзину'));
  if (inCartCount() !== inStock)
    fail(
      `Не получилось положить в корзину все ${inStock} шт. со склада.`,
    );
  await click(plus);
  await click(button('В корзину'));
  if (inCartCount() !== inStock) {
    fail(
      `В корзине уже все ${inStock} шт., а добавить получилось ещё — учтите то, что уже в корзине.`,
    );
  }

  // 3. Доставка
  if (!page().includes(`Итого: ${price * inStock} ₽`))
    fail(`В мини-корзине нет «Итого: ${price * inStock} ₽».`);
  if (!page().includes('Доставка бесплатная'))
    fail(
      'Сумма больше порога, а «Доставка бесплатная» не видна.',
    );
  if (page().includes('До бесплатной доставки'))
    fail(
      'Сумма больше порога, а «До бесплатной доставки» всё ещё видна.',
    );

  // 4. Очистить
  await click(button('Очистить корзину'));
  if (inCartCount() !== 0 || page().includes('Итого'))
    fail(
      '«Очистить корзину» должна опустошить корзину и скрыть мини-корзину.',
    );
  return { pass: true };
};

export default check;
