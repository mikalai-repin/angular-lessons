import type { Check, CheckStorage } from '@course/check';

// Ключ избранного в localStorage — из кода магазина (core/favorites-effects.ts)
const FAVORITES_KEY = 'hod-konem:favorites:v1';

// В избранном три игры: 12 «Строители замков», 3 «Зельевары», 7 «Маяк». Входа нет
export const storage: CheckStorage = {
  [FAVORITES_KEY]: '[12,3,7]',
};

// Проверка варианта А: кнопки «Сравнить» и граница в три игры, счётчик в меню, таблица /compare
// с лучшими значениями и «Убрать», ссылка «Поделиться списком», страница /wishlist?ids=… без входа,
// мусор и 404 в ids, смена ids без перезапуска, своё избранное не меняется
const check: Check = async ({
  document,
  $,
  $$,
  text,
  click,
  navigate,
  url,
  settle,
  fail,
}) => {
  // Ссылка на сравнение — где угодно на странице; href в превью начинается с /app/
  const compareLink = () =>
    $$<HTMLAnchorElement>('a').find((a) =>
      /\/compare$/.test(
        (a.getAttribute('href') ?? '').replace(/\?.*/, ''),
      ),
    );
  const count = () =>
    Number(text(compareLink()).match(/\d+/)?.[0] ?? NaN);
  const main = () => text('main');

  // ---------- Сравнение: кнопки на карточках ----------
  await navigate('/catalog');
  await settle(300);
  const cards = $$('app-game-card');
  if (cards.length < 4) {
    fail('В каталоге меньше четырёх карточек игр — проверка не может начаться. Не ломает ли что-то каталог?');
  }
  const buttons = cards.slice(0, 4).map(
    (card) =>
      $<HTMLButtonElement>('.compare', card) ??
      fail('На карточке игры нет кнопки с классом compare («Сравнить»).'),
  );
  const titles = cards
    .slice(0, 3)
    .map((card) => text($('.title', card)));

  const link =
    compareLink() ??
    fail('На странице нет ссылки на /compare. Добавьте её в меню шапки: routerLink="/compare".');
  if (!/\d/.test(text(link))) {
    fail(`В тексте ссылки на сравнение нет числа: «${text(link)}». Покажите, сколько игр в сравнении: «Сравнение: 2».`);
  }

  for (const button of buttons.slice(0, 3)) {
    await click(button);
  }
  buttons.slice(0, 3).forEach((button, i) => {
    if (button.getAttribute('aria-pressed') !== 'true') {
      fail(`После щелчка «Сравнить» у игры «${titles[i]}» у кнопки нет aria-pressed="true": кнопка должна показывать, что игра в сравнении.`);
    }
  });
  if (count() !== 3) {
    fail(`Добавили к сравнению три игры, а ссылка на сравнение показывает «${text(compareLink())}». Счётчик должен читать общее состояние сравнения.`);
  }

  // Повторный щелчок убирает игру, ещё один — возвращает
  await click(buttons[0]);
  if (count() !== 2 || buttons[0].getAttribute('aria-pressed') === 'true') {
    fail('Повторный щелчок «Сравнить» должен убирать игру из сравнения: счётчик — 2, aria-pressed — не "true".');
  }
  await click(buttons[0]);

  // Граница: четвёртая кнопка выключена, а включённая в обход disabled ничего не добавляет
  if (!buttons[3].disabled) {
    fail('В сравнении уже три игры, а кнопка «Сравнить» четвёртой карточки не выключена (disabled).');
  }
  buttons[3].disabled = false;
  await click(buttons[3]);
  if (count() > 3) {
    fail('Кнопку «Сравнить» четвёртой игры включили в обход disabled — и игра добавилась. Границу в три игры нужно держать и в коде, где добавляют игру, а не только в disabled.');
  }

  // ---------- Страница /compare ----------
  await navigate('/compare');
  await settle(300);
  const table =
    $('table') ??
    fail('На странице /compare нет таблицы <table>. Есть ли маршрут compare в app.routes.ts?');
  for (const title of titles) {
    if (!text(table).includes(title)) {
      fail(`В таблице сравнения нет игры «${title}», хотя она в сравнении.`);
    }
  }
  const removeButtons = () =>
    $$('button').filter((b) => text(b) === 'Убрать');
  if (removeButtons().length !== 3) {
    fail(`В таблице ${removeButtons().length} кнопок «Убрать», а игр в сравнении три: у каждой игры — своя кнопка.`);
  }

  // Строка по подписи в первой ячейке; значения — остальные ячейки
  const row = (label: string) => {
    const tr =
      $$<HTMLTableRowElement>('tr', table).find((r) =>
        text(r.cells[0]).startsWith(label),
      ) ??
      fail(`В таблице нет строки «${label}»: подпись — в первой ячейке строки.`);
    return [...tr.cells].slice(1);
  };
  const toNumber = (cell: Element) =>
    Number(
      text(cell)
        .replace(/\s/g, '')
        .replace(',', '.')
        .match(/\d+(\.\d+)?/)?.[0] ?? NaN,
    );
  for (const label of ['Игроки', 'Время', 'Возраст']) {
    row(label);
  }
  const bestCheck = (label: string, pick: 'min' | 'max') => {
    const cells = row(label);
    const values = cells.map(toNumber);
    if (cells.length !== 3 || values.some(Number.isNaN)) {
      fail(`В строке «${label}» должно быть три ячейки с числами — по одной на игру.`);
    }
    const best = Math[pick](...values);
    cells.forEach((cell, i) => {
      const marked = cell.classList.contains('best');
      if (values[i] === best && !marked) {
        fail(`В строке «${label}» у ячейки ${text(cell)} нет класса best, а это ${pick === 'min' ? 'самая низкая цена' : 'самый высокий рейтинг'}.`);
      }
      if (values[i] !== best && marked) {
        fail(`В строке «${label}» класс best стоит у ячейки ${text(cell)}, а лучшее значение — другое.`);
      }
    });
  };
  bestCheck('Цена', 'min');
  bestCheck('Рейтинг', 'max');

  // «Убрать»: столбец исчезает, счётчик уменьшается; без игр — «Нечего сравнивать»
  await click(removeButtons()[0]);
  if (removeButtons().length !== 2 || count() !== 2) {
    fail('После «Убрать» в таблице должно остаться две игры, а в ссылке на сравнение — число 2.');
  }
  while (removeButtons().length > 0) {
    await click(removeButtons()[0]);
  }
  if ($('table') || !main().includes('Нечего сравнивать')) {
    fail('Когда в сравнении не осталось игр, вместо таблицы должна быть надпись «Нечего сравнивать».');
  }

  // ---------- Ссылка «Поделиться списком» ----------
  await navigate('/account/favorites');
  await settle(300);
  const share =
    $$<HTMLAnchorElement>('a').find(
      (a) => text(a) === 'Поделиться списком',
    ) ??
    fail('На странице избранного /account/favorites нет ссылки «Поделиться списком».');
  const href = share.getAttribute('href') ?? '';
  const query = new URLSearchParams(href.split('?')[1] ?? '');
  const shared = query
    .getAll('ids')
    .flatMap((value) => value.split(','))
    .map(Number);
  if (!/\/wishlist$/.test(href.split('?')[0])) {
    fail(`Ссылка «Поделиться списком» ведёт на ${href}, а должна — на /wishlist?ids=…`);
  }
  if ([...shared].sort((a, b) => a - b).join() !== '3,7,12') {
    fail(`В избранном игры 12, 3 и 7, а ссылка «Поделиться списком» — ${href}. Параметр ids — id игр из избранного через запятую.`);
  }

  // ---------- Страница /wishlist ----------
  const expectGames = (games: string[], hint: string) => {
    let last = -1;
    for (const title of games) {
      const at = main().indexOf(title);
      if (at === -1) {
        fail(`${hint} нет игры «${title}».`);
      }
      if (at < last) {
        fail(`${hint} игры идут не в том порядке, что в адресе: порядок id в ссылке — порядок карточек.`);
      }
      last = at;
    }
  };

  await click(share);
  await settle(300);
  if (url().startsWith('/login')) {
    fail('Ссылка на список желаний увела на страницу входа. Список открывают друзья без входа: у маршрута wishlist не должно быть гарда.');
  }
  if (!url().startsWith('/wishlist')) {
    fail(`Щелчок «Поделиться списком» открыл ${url()}, а не /wishlist. Есть ли маршрут wishlist в app.routes.ts?`);
  }
  expectGames(
    ['Строители замков', 'Зельевары', 'Маяк'],
    'На странице списка по ссылке из избранного (ids 12, 3, 7)',
  );

  // Другой список на уже открытой странице: мусор и игра 999 (её нет в каталоге) пропускаются
  await navigate('/wishlist?ids=5,abc,0,-1,999,2');
  await settle(300);
  if (main().includes('Строители замков')) {
    fail('Открыли /wishlist?ids=5,…,2, когда страница списка уже была открыта, а на ней прежний список. Компонент страницы переиспользуется: параметр ids нужно читать как сигнал (вход), а не один раз при создании.');
  }
  if (!main().includes('Тихая охота') && !main().includes('Драконья почта')) {
    fail('Страница /wishlist?ids=5,abc,0,-1,999,2 не показала ни одной игры. Мусор в ids нужно отбрасывать, а игру, которой нет в каталоге (ответ 404), — пропускать, а не считать ошибкой всего списка.');
  }
  expectGames(
    ['Тихая охота', 'Драконья почта'],
    'На странице /wishlist?ids=5,abc,0,-1,999,2',
  );

  await navigate('/wishlist?ids=abc');
  await settle(300);
  if (!main().includes('Список пуст')) {
    fail('На странице /wishlist?ids=abc нет ни одного верного id — должна быть надпись «Список пуст».');
  }

  // Чужой список не попадает в своё избранное: ни в Store (счётчик ♥ в шапке), ни в localStorage
  const favoritesLink = $$('a').find((a) =>
    /\/account\/favorites$/.test(a.getAttribute('href') ?? ''),
  );
  if (favoritesLink && !/(^|\D)3(\D|$)/.test(text(favoritesLink))) {
    fail(`После открытия чужих списков в шапке «${text(favoritesLink)}», а в избранном было три игры. Список из ссылки только показывают — в Store он не попадает.`);
  }
  const saved =
    document.defaultView?.localStorage.getItem(FAVORITES_KEY) ??
    '';
  if (saved.replace(/\s/g, '') !== '[12,3,7]') {
    fail(`После открытия чужих списков избранное изменилось: в localStorage ${saved || 'пусто'}. Список из ссылки только показывают — в Store и localStorage он не попадает.`);
  }

  return { pass: true };
};

export default check;
