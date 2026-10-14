import type { Check } from '@course/check';

// Проверка практикума: карточка игры GAMES[0] целиком из объекта game
const check: Check = async ({
  $,
  text,
  visible,
  click,
  fail,
  logs,
}) => {
  const card =
    $('.card') ?? fail('Не найдена карточка игры (.card).');
  const cardText = text(card);

  if (text($('.title', card)) !== 'Остров сокровищ')
    fail(
      'В заголовке карточки не «Остров сокровищ» — игра GAMES[0].',
    );
  if (!cardText.includes('Игроков: 2–5 · 45 мин · 8+')) {
    fail(
      'Нет строки характеристик «Игроков: 2–5 · 45 мин · 8+» (или в ней лишние пробелы, или дефис вместо тире «–»).',
    );
  }

  // У «Острова сокровищ» есть oldPrice: старая цена и бейдж видны
  const oldPrice = $('.old-price', card);
  if (!visible(oldPrice) || !text(oldPrice).includes('2490'))
    fail('У игры есть старая цена 2490 ₽, но её не видно.');
  if (!visible($('.badge', card)))
    fail('У игры есть скидка, но бейдж скидки не виден.');

  const button =
    $<HTMLButtonElement>('button', card) ??
    fail('В карточке нет кнопки.');
  if (text(button) !== 'В корзину' || button.disabled)
    fail(
      'Игра есть в наличии: на кнопке должно быть «В корзину», и она активна.',
    );
  await click(button);
  if (!logs.some((line) => line.includes('Остров сокровищ'))) {
    fail(
      'После «В корзину» в консоли нет названия игры — addToCart должен брать его из game.',
    );
  }
  return { pass: true };
};

export default check;
