import type { Check } from '@course/check';

// Проверка практикума: «В корзину» в карточке запускает обложку в полёт к ссылке на корзину.
// Обложка стартует с места картинки карточки, летит к корзине, после посадки исчезает;
// несколько щелчков — несколько обложек; при «меньше движения» полёта нет
const check: Check = async ({
  document,
  $,
  $$,
  text,
  click,
  settle,
  fail,
}) => {
  const win =
    document.defaultView ?? fail('Нет окна приложения.');
  const wait = (ms: number) =>
    new Promise((resolve) => win.setTimeout(resolve, ms));
  const center = (rect: DOMRect) => ({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  });
  const distance = (a: DOMRect, b: DOMRect) => {
    const p = center(a);
    const q = center(b);
    return Math.hypot(p.x - q.x, p.y - q.y);
  };
  const flying = () => $$<HTMLImageElement>('.flying-cover');
  // Ждём, пока полёты закончатся: обложки должны исчезнуть
  const waitLanded = async () => {
    for (let i = 0; i < 30 && flying().length > 0; i++) {
      await wait(100);
    }
    await settle();
  };

  await settle(300);
  const cards = $$('app-game-card');
  if (cards.length < 3) {
    fail('Каталог должен показать хотя бы три карточки игр.');
  }
  const cartLink =
    $('app-header a.cart') ??
    fail('В шапке нет ссылки на корзину (a.cart).');
  const addButton = (card: Element) =>
    $$('button', card).find((b) =>
      /В корзину/.test(b.textContent ?? ''),
    ) ?? fail('В карточке игры нет кнопки «В корзину».');

  // 1. Щелчок — обложка взлетает с места картинки карточки
  const card = cards[1];
  const cover =
    $<HTMLImageElement>('img.cover', card) ??
    fail('В карточке игры нет картинки обложки (img.cover).');
  const coverRect = cover.getBoundingClientRect();
  await click(addButton(card));
  if (!/В корзине:\s*1\b/.test(text(cartLink))) {
    fail(
      '«В корзину» в карточке должна по-прежнему класть игру в корзину: в шапке ожидали «В корзине: 1».',
    );
  }
  const flight =
    flying()[0] ??
    fail(
      'После «В корзину» не появилась летящая обложка: ожидали <img class="flying-cover"> в шапке.',
    );
  if (flying().length > 1) {
    fail(
      `После одного щелчка летят ${flying().length} обложки, а должна одна.`,
    );
  }
  if (
    flight.getAttribute('src') !== cover.getAttribute('src')
  ) {
    fail(
      `Летит не та обложка: ${flight.getAttribute('src')}, а в карточке — ${cover.getAttribute('src')}.`,
    );
  }
  if (flight.getAnimations().length === 0) {
    fail(
      'Обложка появилась, но не летит: запустите анимацию из кода (element.animate), когда обложка появилась — (animate.enter).',
    );
  }
  const startRect = flight.getBoundingClientRect();
  if (
    distance(startRect, coverRect) > 40 ||
    Math.abs(startRect.width - coverRect.width) > 40
  ) {
    fail(
      'Обложка должна взлетать с места картинки карточки и быть её размера: задайте ей left, top, width и height из getBoundingClientRect() картинки.',
    );
  }

  // 2. Летит к ссылке на корзину: центр обложки движется в сторону центра ссылки
  const cartRect = cartLink.getBoundingClientRect();
  await wait(400);
  const midRect = flight.getBoundingClientRect();
  const from = center(startRect);
  const moved = {
    x: center(midRect).x - from.x,
    y: center(midRect).y - from.y,
  };
  const toCart = {
    x: center(cartRect).x - from.x,
    y: center(cartRect).y - from.y,
  };
  // Косинус угла между «куда сдвинулась» и «где корзина»: 1 — точно туда
  const direction =
    (moved.x * toCart.x + moved.y * toCart.y) /
    (Math.hypot(moved.x, moved.y) *
      Math.hypot(toCart.x, toCart.y) || 1);
  if (
    flight.isConnected &&
    (direction < 0.95 ||
      distance(midRect, cartRect) >
        distance(startRect, cartRect) * 0.8)
  ) {
    fail(
      'Обложка летит, но не к корзине: через 0,4 с её центр должен заметно сдвинуться к центру ссылки на корзину в шапке.',
    );
  }

  // 3. Долетела — исчезла
  await waitLanded();
  if (flying().length > 0) {
    fail(
      'Обложка долетела, но осталась на странице. Когда анимация закончилась, уберите полёт из списка в FlyToCart.',
    );
  }

  // 4. Два щелчка подряд — две обложки в полёте
  await click(addButton(cards[0]));
  await click(addButton(cards[2]));
  if (flying().length !== 2) {
    fail(
      `Два щелчка «В корзину» подряд — в полёте должны быть две обложки, а их ${flying().length}. Храните полёты списком.`,
    );
  }
  await waitLanded();
  if (flying().length > 0) {
    fail(
      'После посадки двух обложек на странице остались летящие обложки.',
    );
  }

  // 5. «Меньше движения» — без полёта
  const matchMedia = win.matchMedia;
  win.matchMedia = (query: string) =>
    query.includes('prefers-reduced-motion')
      ? ({
          ...matchMedia.call(win, query),
          matches: true,
        } as MediaQueryList)
      : matchMedia.call(win, query);
  try {
    await click(addButton(cards[2]));
    await settle(100);
    if (flying().length > 0) {
      fail(
        'Покупатель попросил систему уменьшить движение (prefers-reduced-motion: reduce), а обложка всё равно летит. Проверьте настройку через matchMedia и не запускайте полёт.',
      );
    }
  } finally {
    win.matchMedia = matchMedia;
  }
  if (!/В корзине:\s*4\b/.test(text(cartLink))) {
    fail(
      'Без анимации игра всё равно должна попасть в корзину: в шапке ожидали «В корзине: 4».',
    );
  }
  return { pass: true };
};

export default check;
