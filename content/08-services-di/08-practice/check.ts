import type { Check } from '@course/check';

// Проверка практикума: сердечко в карточках, счётчик избранного в шапке — общий сервис FavoritesStore
const check: Check = async ({ $, $$, text, click, fail }) => {
  const header = () =>
    text(
      $('.header .favorites') ??
        fail(
          'В шапке нет счётчика избранного <span class="favorites">.',
        ),
    );
  const cards = $$('app-game-card');
  if (cards.length < 2)
    fail('В каталоге меньше двух карточек.');
  const heart = (card: Element) =>
    $<HTMLButtonElement>('.actions button.favorite', card) ??
    $$<HTMLButtonElement>('.actions button', card).find((b) =>
      ['♡', '♥'].includes(text(b)),
    ) ??
    fail(
      'В карточке нет кнопки-сердечка в ряду <div class="actions">.',
    );
  const [first, second] = [heart(cards[0]), heart(cards[1])];

  /** Кнопка в состоянии «в избранном» или «не в избранном» — с точки зрения глаз и экранного диктора */
  const expectState = (
    button: HTMLButtonElement,
    on: boolean,
  ) => {
    const state = on ? 'в избранном' : 'не в избранном';
    if (text(button) !== (on ? '♥' : '♡'))
      fail(
        `Игра ${state}, а на кнопке «${text(button)}» вместо «${on ? '♥' : '♡'}».`,
      );
    if (button.classList.contains('active') !== on) {
      fail(
        `Игра ${state}, а класс active у сердечка ${on ? 'не появился' : 'остался'}.`,
      );
    }
    if (button.getAttribute('aria-pressed') !== String(on)) {
      fail(
        `Игра ${state}: у сердечка должен быть aria-pressed="${on}".`,
      );
    }
    const label = on ? 'Убрать из избранного' : 'В избранное';
    if (button.getAttribute('aria-label') !== label)
      fail(
        `Игра ${state}: у сердечка должен быть aria-label «${label}».`,
      );
  };

  if (!/♥\s*0/.test(header()))
    fail('В начале в шапке должно быть «♥ 0».');
  expectState(first, false);

  await click(first);
  expectState(first, true);
  expectState(second, false);
  if (!/♥\s*1/.test(header()))
    fail(
      'Одну игру добавили в избранное, а в шапке не «♥ 1». Общий ли у шапки и карточек сервис?',
    );

  await click(second);
  if (!/♥\s*2/.test(header()))
    fail('Две игры в избранном, а в шапке не «♥ 2».');

  await click(first);
  expectState(first, false);
  expectState(second, true);
  if (!/♥\s*1/.test(header()))
    fail(
      'Игру убрали из избранного, а счётчик в шапке не уменьшился.',
    );
  return { pass: true };
};

export default check;
