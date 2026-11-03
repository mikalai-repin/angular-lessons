import type { Check } from '@course/check';

const CART_KEY = 'hod-konem:cart:v2';

// Проверка практикума: в обычном браузере корзина по-прежнему сохраняется в localStorage,
// а когда каждая операция хранилища бросает исключение — корзина, вход, оформление и выход работают без ошибок
const check: Check = async ({
  document,
  $,
  $$,
  text,
  click,
  fill,
  navigate,
  settle,
  fail,
  errors,
}) => {
  const win = (document.defaultView ??
    fail('Нет окна приложения.')) as Window & typeof globalThis;
  const pause = (ms: number) =>
    new Promise((resolve) => win.setTimeout(resolve, ms));
  const cartText = () => text('app-header .cart');

  // 1. Хранилище работает: «В корзину» сохраняет корзину, как раньше
  await navigate('/');
  for (let i = 0; i < 40 && $$('app-game-card').length < 2; i++)
    await pause(100);
  const cards = $$('app-game-card');
  if (cards.length < 2)
    fail(
      'На главной нет карточек игр: магазин должен работать как прежде.',
    );
  await click(
    $('.button', cards[0]) ??
      fail('В карточке нет кнопки «В корзину».'),
  );
  await settle(300);
  if (
    !(win.localStorage.getItem(CART_KEY) ?? '').includes(
      '"quantity"',
    )
  )
    fail(
      'Корзина больше не сохраняется в localStorage. Когда хранилище работает, обёртка должна передавать вызовы настоящему localStorage.',
    );

  // 2. Хранилище недоступно: каждая операция бросает, как в браузере с запретом данных сайтов
  const proto = win.Storage.prototype;
  const original = {
    getItem: proto.getItem,
    setItem: proto.setItem,
    removeItem: proto.removeItem,
  };
  const denied = () => {
    throw new win.DOMException(
      'Access is denied for this document.',
      'SecurityError',
    );
  };
  proto.getItem = denied;
  proto.setItem = denied;
  proto.removeItem = denied;
  const before = errors.length;
  const noNewErrors = (action: string) => {
    if (errors.length > before)
      fail(
        `${action}: исключение хранилища дошло до обработчика ошибок — «${errors[before]}». Обёртка должна ловить исключения каждой операции, а не только записи.`,
      );
  };

  try {
    // Корзина: setItem
    await click(
      $('.button', cards[1]) ??
        fail('В карточке нет кнопки «В корзину».'),
    );
    await settle(300);
    noNewErrors('«В корзину»');
    if (!cartText().includes('В корзине: 2'))
      fail(
        `После второго «В корзину» шапка показывает «${cartText()}», а должна — «В корзине: 2»: без хранилища корзина живёт в памяти.`,
      );

    // Вход: AuthStore записывает токены (setItem)
    await navigate('/login');
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
    // Кнопка «Выйти» в шапке — только у вошедшего
    for (let i = 0; i < 30 && !$('app-header .logout'); i++)
      await pause(100);
    noNewErrors('Вход');
    if (!$('app-header .logout'))
      fail(
        'Вход не удался: сервер ответил, но сохранить токены не получилось — и исключение прервало вход. Запись в хранилище не должна бросать.',
      );

    // Оформление: Checkout читает черновик комментария (getItem)
    await navigate('/checkout');
    await settle(300);
    noNewErrors('Оформление заказа');
    if (!$('app-checkout'))
      fail(
        'Страница оформления не открылась: она читает черновик из хранилища, и чтение не должно бросать.',
      );

    // Выход: AuthStore удаляет токены (removeItem)
    await click(
      $('app-header .logout') ??
        fail('В шапке вошедшего нет кнопки «Выйти».'),
    );
    for (let i = 0; i < 30 && $('app-header .logout'); i++)
      await pause(100);
    noNewErrors('Выход');
    if ($('app-header .logout'))
      fail(
        'Выход не удался: удаление токенов из хранилища не должно бросать.',
      );
  } finally {
    proto.getItem = original.getItem;
    proto.setItem = original.setItem;
    proto.removeItem = original.removeItem;
  }

  return { pass: true };
};

export default check;
