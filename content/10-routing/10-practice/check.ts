import type { Check } from '@course/check';

// Проверка практикума: хлебные крошки на разных страницах — подписи, адреса ссылок, aria-current, место в каркасе
const check: Check = async ({
  $,
  $$,
  text,
  navigate,
  click,
  url,
  fail,
}) => {
  const host = () => $('app-breadcrumbs');
  /** Крошки на экране: подпись, адрес (у ссылок) и признак текущей страницы */
  const crumbs = () =>
    $$('a, span[aria-current]', host() ?? undefined).map(
      (el) => ({
        label: text(el),
        href:
          el instanceof HTMLAnchorElement
            ? new URL(el.href).pathname.replace(/^\/app/, '') ||
              '/'
            : null,
        current: el.getAttribute('aria-current') === 'page',
      }),
    );
  const show = (list: ReturnType<typeof crumbs>) =>
    list.map((c) => c.label).join(' › ') || 'ничего';

  /** На странице page ожидаются ссылки links (подпись → адрес) и текущая крошка current */
  const expectCrumbs = async (
    page: string,
    links: [string, string][],
    current: string,
  ) => {
    await navigate(page);
    const actual = crumbs();
    const expected = [
      ...links.map(([label]) => label),
      current,
    ].join(' › ');
    if (show(actual) !== expected)
      fail(
        `На ${page} ожидались крошки «${expected}», а на экране «${show(actual)}».`,
      );
    links.forEach(([label, href], i) => {
      if (actual[i].href !== href)
        fail(
          `На ${page} крошка «${label}» должна вести на ${href}, а ведёт на ${actual[i].href ?? '— (это не ссылка)'}.`,
        );
    });
    const last = actual.at(-1);
    if (!last?.current || last.href !== null) {
      fail(
        `На ${page} последняя крошка «${current}» — текущая страница: не ссылка, а <span aria-current="page">.`,
      );
    }
  };

  const outlet =
    $('router-outlet') ??
    fail('В каркасе нет <router-outlet>.');
  const breadcrumbs =
    host() ?? fail('В каркасе нет <app-breadcrumbs>.');
  if (
    !(
      breadcrumbs.compareDocumentPosition(outlet) &
      Node.DOCUMENT_POSITION_FOLLOWING
    )
  ) {
    fail(
      '<app-breadcrumbs /> должен стоять над <router-outlet /> в app.html.',
    );
  }

  await expectCrumbs(
    '/account/favorites',
    [
      ['Главная', '/'],
      ['Кабинет', '/account'],
    ],
    'Избранное',
  );
  await expectCrumbs(
    '/account/orders',
    [
      ['Главная', '/'],
      ['Кабинет', '/account'],
    ],
    'Заказы',
  );
  await expectCrumbs('/catalog', [['Главная', '/']], 'Каталог');
  await expectCrumbs('/cart', [['Главная', '/']], 'Корзина');
  await expectCrumbs(
    '/games/4',
    [['Главная', '/']],
    'Ночной экспресс',
  );

  for (const page of ['/', '/no-such-page']) {
    await navigate(page);
    if (crumbs().length)
      fail(
        `На ${page} крошек быть не должно (только «Главная»), а на экране «${show(crumbs())}».`,
      );
  }

  // Ссылка-крошка ведёт куда обещает
  await navigate('/account/orders');
  const home =
    $$('a', host() ?? undefined).find(
      (a) => text(a) === 'Кабинет',
    ) ?? fail('На /account/orders нет ссылки «Кабинет».');
  await click(home);
  if (!url().startsWith('/account'))
    fail(
      `Щелчок по крошке «Кабинет» привёл на ${url()}, а не в кабинет.`,
    );
  return { pass: true };
};

export default check;
