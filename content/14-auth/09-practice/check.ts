import type { Check, CheckStorage } from '@course/check';

// Покупатель уже вошёл: учебный бэкенд принимает вечный токен token-user (Пользователь, роль user).
// В корзине — один «Остров сокровищ»: заказ на 1 990 ₽ (самовывоз)
export const storage: CheckStorage = {
  'hod-konem:token': 'token-user',
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

// Проверка практикума: «Мои заказы» с сервера, ссылка на них после заказа,
// «Выйти» уводит со страницы только для вошедших, «Войти» возвращает на исходную страницу
const check: Check = async ({
  $,
  $$,
  text,
  click,
  fill,
  navigate,
  settle,
  url,
  requests,
  fail,
}) => {
  const page = () => text('main');
  const header = () => text('app-header');
  const logoutButton = () =>
    $$('app-header button').find((b) =>
      /Выйти/.test(b.textContent ?? ''),
    ) ??
    fail('В шапке вошедшего покупателя нет кнопки «Выйти».');
  const loginLink = () =>
    $$('app-header a').find((a) =>
      /Войти/.test(a.textContent ?? ''),
    ) ??
    fail('В шапке не вошедшего покупателя нет ссылки «Войти».');
  // Вход через форму: e-mail и пароль учебного пользователя
  const logIn = async () => {
    if (!url().startsWith('/login')) {
      fail(`Ожидали страницу входа, а открыта ${url()}.`);
    }
    await fill(
      $('app-login input[type=email]') ??
        fail('На странице входа нет поля e-mail.'),
      'user@example.com',
    );
    await fill(
      $('app-login input[type=password]') ??
        fail('На странице входа нет поля пароля.'),
      'user',
    );
    await click(
      $$('app-login form button').find((b) =>
        /Войти/.test(b.textContent ?? ''),
      ) ?? fail('На странице входа нет кнопки «Войти».'),
    );
    await settle(300);
  };

  // 1. Заказов ещё нет: список пуст, есть ссылка в каталог. Запрос — с токеном
  await navigate('/account/orders');
  await settle(300);
  if (url() !== '/account/orders') {
    fail(
      `Вошедший покупатель открыл /account/orders, а оказался на ${url()}. Гард должен пускать вошедших.`,
    );
  }
  const list =
    requests.find(
      (r) => r.method === 'GET' && r.url === '/api/orders',
    ) ??
    fail(
      'Страница «Мои заказы» должна загрузить заказы с сервера: GET /api/orders.',
    );
  if (!list.headers['authorization']) {
    fail(
      'GET /api/orders ушёл без заголовка Authorization: сервер не узнает, чьи это заказы.',
    );
  }
  if (!/ничего не заказывали/.test(page())) {
    fail(
      'Заказов пока нет — страница должна сказать «Вы ещё ничего не заказывали».',
    );
  }
  if (!$('app-orders-page a[href$="/catalog"]')) {
    fail(
      'Под сообщением «Вы ещё ничего не заказывали» нужна ссылка в каталог.',
    );
  }

  // 2. Заказ после входа: ссылка «Мои заказы» и заказ в списке
  await navigate('/checkout');
  await fill(
    $('app-checkout input[autocomplete=name]') ??
      fail('На странице оформления нет поля «Имя».'),
    'Маша',
  );
  await fill(
    $('app-checkout input[type=tel]') ??
      fail('На странице оформления нет поля «Телефон».'),
    '+7 900 123-45-67',
  );
  await click(
    $$('app-checkout form button').find((b) =>
      /Оформ/.test(b.textContent ?? ''),
    ) ??
      fail(
        'На странице оформления нет кнопки «Оформить заказ».',
      ),
  );
  await settle(300);
  if (!/Заказ №\s*1 оформлен/.test(text('app-checkout'))) {
    fail('Заказ не оформился: ожидали «Заказ №1 оформлен».');
  }
  const ordersLink =
    $('app-checkout a[href$="/account/orders"]') ??
    fail(
      'После заказа вошедшему покупателю нужна ссылка «Мои заказы» (/account/orders).',
    );
  await click(ordersLink);
  await settle(300);
  if (!/№\s*1/.test(page()) || !page().includes('1 990')) {
    fail(
      'В «Моих заказах» должен появиться только что оформленный заказ: его номер (№1) и сумма (1 990 ₽).',
    );
  }
  if (!page().includes(String(new Date().getFullYear()))) {
    fail('У заказа в списке должна быть дата оформления.');
  }

  // 3. «Выйти» на странице только для вошедших: гард уводит на вход
  await click(logoutButton());
  await settle(300);
  if (url().startsWith('/account/orders')) {
    fail(
      'Покупатель вышел, а страница «Мои заказы» осталась на экране. Выход должен заново пройти по адресу, чтобы гард увёл со страницы.',
    );
  }
  if (!url().startsWith('/login')) {
    fail(
      `После выхода со страницы «Мои заказы» гард должен отправить на вход, а открыта ${url()}.`,
    );
  }
  // …а после входа — обратно
  await logIn();
  if (url() !== '/account/orders') {
    fail(
      `После входа покупатель должен вернуться на «Мои заказы», а оказался на ${url()}.`,
    );
  }

  // 4. «Выйти» на обычной странице — остаёмся на ней
  await navigate('/catalog?sort=rating');
  await click(logoutButton());
  await settle(300);
  if (url() !== '/catalog?sort=rating') {
    fail(
      `«Выйти» в каталоге должен оставить покупателя в каталоге (/catalog?sort=rating), а открыта ${url()}.`,
    );
  }
  if (!/Войти/.test(header())) {
    fail(
      'После выхода в шапке должна снова появиться ссылка «Войти».',
    );
  }

  // 5. «Войти» в шапке — и обратно на ту же страницу
  await click(loginLink());
  await logIn();
  if (url() !== '/catalog?sort=rating') {
    fail(
      `«Войти» в шапке должен вернуть покупателя туда, откуда он пришёл (/catalog?sort=rating), а открыта ${url()}. Передайте адрес страницы в returnUrl.`,
    );
  }
  if (!/Пользователь/.test(header())) {
    fail('После входа в шапке должно быть имя покупателя.');
  }
  return { pass: true };
};

export default check;
