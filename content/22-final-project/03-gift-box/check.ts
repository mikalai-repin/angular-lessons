import type { Check, CheckStorage } from '@course/check';

// Покупатель вошёл (учебный вечный токен): заказ запишется на него, и проверка найдёт его в GET /api/orders.
// В корзине одна игра: оформление набора не должно её трогать
const TOKEN = 'token-user';
export const storage: CheckStorage = {
  'hod-konem:token': TOKEN,
  'hod-konem:cart:v2': JSON.stringify([
    {
      game: {
        id: 1,
        slug: 'treasure-island',
        title: 'Остров сокровищ',
        cover: '/assets/covers/treasure-island.svg',
        price: 1990,
        oldPrice: 2490,
        category: 'family',
        players: { min: 2, max: 5 },
        playTime: 45,
        age: 8,
        rating: 4.6,
        inStock: 12,
        description: 'Игра о поиске сокровищ.',
        tags: ['пираты'],
      },
      quantity: 1,
    },
  ]),
};

// Проверка варианта Б: ссылка в меню, /gift → /gift/games, гарды шагов, кнопки pick и правило 2–4 игр,
// «Кому» и длина открытки, упаковка, «Назад», набор переживает уход со страницы, «Итого»,
// 409 — сообщение сервера, заказ на сервере (игры по одной, сумма, открытка), корзина цела, набор сброшен
const check: Check = async ({
  document,
  $,
  $$,
  text,
  click,
  fill,
  navigate,
  url,
  settle,
  fail,
}) => {
  const main = () => text('main');
  const path = () => url().replace(/\?.*/, '');
  // Кнопка или ссылка по началу текста: «Далее», «Оформить набор»; «← Назад» — по вхождению
  const action = (label: string) =>
    $$('button, a').find((el) =>
      label === 'Назад'
        ? text(el).includes(label)
        : text(el).startsWith(label),
    );
  const press = async (label: string, where: string) => {
    const el =
      action(label) ??
      fail(`На шаге ${where} нет кнопки «${label}».`);
    await click(el);
    await settle(200);
  };

  // ---------- Шаг 1: игры ----------
  // Кнопка pick игры: поднимаемся от кнопки, пока в элементе одна кнопка pick, — это строка игры
  const row = (button: Element) => {
    let el: Element = button;
    while (
      el.parentElement &&
      el.parentElement.querySelectorAll('.pick').length === 1
    ) {
      el = el.parentElement;
    }
    return el;
  };
  const pickFor = (title: string) =>
    $$<HTMLButtonElement>('.pick').find((button) =>
      text(row(button)).includes(title),
    );
  const pick = (title: string) =>
    pickFor(title) ??
    fail(`На шаге 1 нет игры «${title}» с кнопкой pick. В списке должны быть хотя бы игры первой страницы каталога (/api/games).`);
  const pressed = (button: Element) =>
    button.getAttribute('aria-pressed') === 'true';
  const chosen = () =>
    $$('.pick').filter((button) => pressed(button)).length;
  const COUNT_ERROR = 'Выберите от 2 до 4 игр';

  const giftLink = $$<HTMLAnchorElement>('header a').find((a) =>
    /\/gift(\/games)?$/.test(a.getAttribute('href') ?? ''),
  );
  if (!giftLink || !text(giftLink).includes('Подарок')) {
    fail('В меню шапки нет ссылки «Подарок» на /gift.');
  }

  await navigate('/gift');
  await settle(300);
  if (path() !== '/gift/games') {
    fail(`Адрес /gift открыл ${url()}, а должен вести на первый шаг — /gift/games. Есть ли маршрут gift в app.routes.ts и переадресация на games?`);
  }
  if ($$('.pick').length === 0) {
    fail('На шаге 1 (/gift/games) нет игр с кнопками pick («В набор»).');
  }

  // Набор пуст — дальше нельзя, а дальний шаг по адресу не открыть
  await navigate('/gift/confirm');
  await settle(300);
  if (path() !== '/gift/games') {
    fail(`С пустым набором адрес /gift/confirm открыл ${url()}. Гард шага должен вернуть на /gift/games: дальше готового шага не попасть даже по ссылке.`);
  }
  await navigate('/gift/design');
  await settle(300);
  if (path() !== '/gift/games') {
    fail(`С пустым набором адрес /gift/design открыл ${url()}. Гард шага должен вернуть на /gift/games.`);
  }

  await press('Далее', '1');
  if (path() !== '/gift/games') {
    fail('С пустым набором «Далее» перевёл на следующий шаг. В наборе — от 2 до 4 игр.');
  }
  if (!main().includes(COUNT_ERROR)) {
    fail(`С пустым набором после «Далее» на странице нет ошибки «${COUNT_ERROR}».`);
  }

  await click(pick('Остров сокровищ'));
  if (!pressed(pick('Остров сокровищ'))) {
    fail('После щелчка pick у игры «Остров сокровищ» у кнопки нет aria-pressed="true": кнопка должна показывать, что игра в наборе.');
  }
  await press('Далее', '1');
  if (path() !== '/gift/games' || !main().includes(COUNT_ERROR)) {
    fail(`С одной игрой в наборе «Далее» должен оставить на шаге 1 и показать «${COUNT_ERROR}».`);
  }

  // Игры нет на складе — в набор её не положить, даже если включить кнопку в обход disabled
  const lighthouse = pickFor('Маяк');
  if (lighthouse) {
    if (!lighthouse.disabled) {
      fail('«Маяка» нет на складе, а его кнопка pick не выключена (disabled).');
    }
    lighthouse.disabled = false;
    await click(lighthouse);
    if (pressed(pickFor('Маяк') ?? lighthouse)) {
      fail('Кнопку pick «Маяка» (его нет на складе) включили в обход disabled — и игра попала в набор. Правило нужно держать и в коде, который кладёт игру.');
    }
  }

  for (const title of [
    'Ночной экспресс',
    'Тихая охота',
    'Драконья почта',
  ]) {
    await click(pick(title));
  }
  if (chosen() !== 4) {
    fail(`Выбрали четыре игры, а кнопок pick с aria-pressed="true" — ${chosen()}.`);
  }
  // Пятая игра: кнопку можно выключить, но правило держится в любом случае
  const fifth = pick('Зельевары');
  fifth.disabled = false;
  await click(fifth);
  if (chosen() > 4) {
    await press('Далее', '1');
    if (path() !== '/gift/games' || !main().includes(COUNT_ERROR)) {
      fail(`С пятью играми в наборе «Далее» должен оставить на шаге 1 и показать «${COUNT_ERROR}».`);
    }
    await click(pick('Зельевары'));
  }
  await click(pick('Драконья почта'));
  if (pressed(pick('Драконья почта')) || chosen() !== 3) {
    fail('Повторный щелчок pick должен убирать игру из набора: aria-pressed — не "true".');
  }
  await press('Далее', '1');
  if (path() === '/gift/games' && !main().includes(COUNT_ERROR)) {
    fail('С тремя играми в наборе «Далее» вернул на /gift/games без ошибки: похоже, переход был, а гард шага 2 не пустил. Гард видит другой набор? Гарды берут сервисы из инжектора маршрутов, а не из providers компонента: набор должен быть один на всё приложение.');
  }
  if (path() !== '/gift/design') {
    fail(`С тремя играми в наборе «Далее» открыл ${url()}, а не шаг 2 — /gift/design.`);
  }

  // ---------- Шаг 2: упаковка и открытка ----------
  // Поле по подписи: подпись — label вокруг поля или label с for
  const field = (label: string) => {
    const tag = $$<HTMLLabelElement>('label').find((l) =>
      text(l).startsWith(label),
    );
    const input =
      tag?.control ??
      tag?.querySelector<HTMLInputElement>('input, textarea');
    return (input ??
      fail(`На шаге нет поля «${label}» с подписью <label>.`)) as HTMLInputElement;
  };
  const radio = (title: string) =>
    $$<HTMLInputElement>('input[type=radio]').find((input) =>
      text(input.closest('label') ?? input.labels?.[0]).includes(
        title,
      ),
    ) ?? fail(`На шаге 2 нет переключателя упаковки «${title}».`);

  if (!radio('Крафт').checked) {
    fail('На шаге 2 по умолчанию должна быть выбрана упаковка «Крафт».');
  }
  radio('Праздничная');
  radio('Деревянный ящик');

  await navigate('/gift/confirm');
  await settle(300);
  if (path() !== '/gift/design') {
    fail(`Без «Кому» адрес /gift/confirm открыл ${url()}. Гард шага 3 должен вернуть на /gift/design, пока шаг 2 не заполнен.`);
  }

  await press('Далее', '2');
  if (path() !== '/gift/design' || !main().includes('Кому подарок?')) {
    fail('С пустым полем «Кому» «Далее» должен оставить на шаге 2 и показать «Кому подарок?».');
  }
  await fill(field('Кому'), 'Бабушке');
  await fill(field('Текст открытки'), 'а'.repeat(201));
  await press('Далее', '2');
  if (
    path() !== '/gift/design' ||
    !main().includes('Не больше 200 символов')
  ) {
    fail('С открыткой в 201 символ «Далее» должен оставить на шаге 2 и показать «Не больше 200 символов». Атрибута maxlength мало: правило — в схеме формы.');
  }
  await fill(field('Текст открытки'), 'С днём рождения!');
  await click(radio('Праздничная'));

  await press('Назад', '2');
  if (path() !== '/gift/games') {
    fail(`«Назад» на шаге 2 открыл ${url()}, а не /gift/games.`);
  }
  if (chosen() !== 2 && chosen() !== 3) {
    fail('После «Назад» на шаге 1 игры набора больше не отмечены. Набор должен жить дольше страницы шага.');
  }
  if (
    !pressed(pick('Ночной экспресс')) ||
    !pressed(pick('Тихая охота'))
  ) {
    fail('После «Назад» на шаге 1 отмечены не те игры, что были в наборе.');
  }

  // Ушли из мастера и вернулись — набор на месте
  await navigate('/catalog');
  await settle(300);
  await navigate('/gift/design');
  await settle(300);
  if (path() !== '/gift/design') {
    fail('Ушли из мастера в каталог и вернулись на /gift/design — а гард не пустил: набор пропал. Набор должен жить в сервисе, а не в компоненте шага.');
  }
  if (field('Кому').value !== 'Бабушке') {
    fail('Ушли из мастера в каталог и вернулись — поле «Кому» пустое. Набор (и упаковка с открыткой) должен жить в сервисе, а не в компоненте шага.');
  }
  if (!radio('Праздничная').checked) {
    fail('Ушли из мастера и вернулись — выбранная упаковка «Праздничная» сбросилась.');
  }
  await press('Далее', '2');
  if (path() !== '/gift/confirm') {
    fail(`С заполненным шагом 2 «Далее» открыл ${url()}, а не шаг 3 — /gift/confirm.`);
  }

  // ---------- Шаг 3: проверка и оформление ----------
  const total = () => {
    const at = main().indexOf('Итого');
    return at === -1
      ? NaN
      : Number(
          main()
            .slice(at)
            .match(/\d[\d\s]*/)?.[0]
            .replace(/\s/g, '') ?? NaN,
        );
  };
  const expectSummary = (games: string[], sum: number) => {
    for (const title of games) {
      if (!main().includes(title)) {
        fail(`На шаге 3 в составе набора нет игры «${title}».`);
      }
    }
    if (!main().includes('Праздничная') || !main().includes('Бабушке')) {
      fail('На шаге 3 должны быть видны упаковка («Праздничная») и кому подарок («Бабушке»).');
    }
    if (total() !== sum) {
      fail(`На шаге 3 «Итого» — ${Number.isNaN(total()) ? 'не найдено' : total()}, а должно быть ${sum}: цены игр набора плюс упаковка «Праздничная» (290 ₽).`);
    }
  };
  expectSummary(
    ['Остров сокровищ', 'Ночной экспресс', 'Тихая охота'],
    1990 + 3190 + 890 + 290,
  );
  await fill(field('Имя'), 'Анна');
  await fill(field('Телефон'), '+7 900 123-45-67');

  // Пока покупатель думал, «Ночной экспресс» раскупили: сервер ответит 409
  const api = document.defaultView?.fetch ?? fetch;
  await api('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ gameId: 4, quantity: 3 }] }),
  });
  await press('Оформить набор', '3');
  await settle(300);
  if (/Набор №\s*\d+/.test(main())) {
    fail('«Ночной экспресс» закончился на складе, а сервер принял набор. Проверьте, что уходит в POST /api/orders: каждая игра — позиция { gameId, quantity: 1 }.');
  }
  if (!main().includes('на складе только 0')) {
    fail('Сервер ответил на заказ 409 — «Ночной экспресс» закончился. На странице должно быть сообщение сервера («…на складе только 0»).');
  }
  if (path() !== '/gift/confirm' || !main().includes('Тихая охота')) {
    fail('После ошибки сервера набор должен остаться на шаге 3 со всем, что выбрано.');
  }

  // Убираем раскупленную игру и оформляем ещё раз
  await navigate('/gift/games');
  await settle(300);
  await click(pick('Ночной экспресс'));
  if (pressed(pick('Ночной экспресс'))) {
    fail('«Ночной экспресс» закончился на складе, а убрать его из набора на шаге 1 не получилось. Выключать кнопку pick нужно только у игры, которой нет на складе и нет в наборе.');
  }
  await press('Далее', '1');
  await press('Далее', '2');
  if (path() !== '/gift/confirm') {
    fail(`После правки набора «Далее» на шагах 1 и 2 открыл ${url()}, а не /gift/confirm.`);
  }
  expectSummary(['Остров сокровищ', 'Тихая охота'], 1990 + 890 + 290);
  if (field('Имя').value !== 'Анна') {
    fail('Вернулись на шаг 3 — поле «Имя» пустое. Контакты — тоже часть набора.');
  }
  await press('Оформить набор', '3');
  await settle(300);
  const id = Number(main().match(/Набор №\s*(\d+)\s*оформлен/)?.[1]);
  if (!id) {
    fail('После «Оформить набор» на странице нет «Набор №… оформлен» с номером заказа от сервера.');
  }

  // Заказ на сервере: по одной штуке каждой игры, сумма с упаковкой, открытка
  const response = await api('/api/orders', {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const orders = (await response.json()) as {
    id: number;
    items?: { gameId: number; quantity: number }[];
    total?: number;
  }[];
  const order =
    orders.find((item) => item.id === id) ??
    fail(`Заказа №${id} нет среди заказов покупателя. Отправляйте набор через HttpClient: токен к запросу добавляет интерцептор.`);
  const items = (order.items ?? [])
    .map((item) => `${item.gameId}×${item.quantity}`)
    .sort()
    .join(', ');
  if (items !== '1×1, 5×1') {
    fail(`В заказе №${id} items — [${items}], а в наборе по одной штуке игр 1 и 5: items: [{ gameId, quantity: 1 }, …].`);
  }
  if (order.total !== 3170) {
    fail(`В заказе №${id} total — ${order.total}, а набор стоит 3170: игры плюс упаковка.`);
  }
  const saved = JSON.stringify(order);
  if (!saved.includes('Бабушке') || !saved.includes('С днём рождения!')) {
    fail(`В заказе №${id} нет данных открытки: кому («Бабушке») и текста («С днём рождения!»).`);
  }

  // Корзина — отдельная история: набор её не трогает
  if (!/В корзине: 1\b/.test(text('.cart'))) {
    fail(`После оформления набора в шапке «${text('.cart')}», а в корзине была одна игра. Набор — отдельный заказ: корзину он не очищает.`);
  }

  // Новый набор — с чистого листа
  await navigate('/gift/games');
  await settle(300);
  if (chosen() !== 0) {
    fail('После оформления набор не сбросился: на шаге 1 игры всё ещё отмечены.');
  }
  await navigate('/gift/confirm');
  await settle(300);
  if (path() !== '/gift/games') {
    fail('После оформления набор не сбросился: адрес /gift/confirm по-прежнему открывается.');
  }

  return { pass: true };
};

export default check;
