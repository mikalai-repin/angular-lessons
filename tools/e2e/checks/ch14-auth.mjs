// Проверка главы 14 в интерфейсе платформы: проходит шаги кнопкой «Далее», в каждом нажимает «Решение»
// и проверяет вход в превью вместе с консолью и вкладкой «Сеть»: «Войти» в шапке, вход и выход, сессию после
// перезапуска (GET /api/me с токеном), токен в запросах (отзыв от имени покупателя), 401 после истечения
// токена (шаг 5: tokenTtl 30 с), гард с returnUrl, роли и админку, обновление токена (шаг 8: tokenTtl 20 с:
// два 401 — одно обновление), «Мои заказы» и выход с них. Идёт около двух минут: ждёт истечения токенов.
// node tools/e2e/checks/ch14-auth.mjs
import { clean, openCourse, wait } from '../lib.mjs';

const { page, expect, frame, title, showSolution, nextStep, checkConsoleClean, finish } =
  await openCourse('/auth/how-login-works');

const header = async () => clean(await frame().$eval('app-header', (e) => e.innerText));
const mainText = async () => clean(await frame().$eval('main', (e) => e.innerText));
const address = () => page.$eval('.address-input', (e) => e.value);
// Ввод адреса в адресной строке превью: приложение запускается заново с этого адреса
const go = async (url) => {
  await page.click('.address-input', { clickCount: 3 });
  await page.type('.address-input', `${url}\n`);
  await wait(2000);
};
const restart = async () => {
  await page.click('button[title="Перезагрузить приложение с текущего адреса"]');
  await wait(2500);
};
// Вкладка «Сеть»: щелчок из страницы (page.click по координатам после ⟳ промахивается)
const showNetwork = () => page.$$eval('.panel-tab', (els) => els.find((e) => e.textContent.startsWith('Сеть')).click());
const requests = async () => {
  await showNetwork();
  await wait(200);
  return page.$$eval('.network-row', (rows) =>
    rows.map((r) => [...r.querySelectorAll('td')].map((td) => td.textContent).join(' ')),
  );
};
// Подробности запроса во вкладке «Сеть»: заголовки, тело, ответ
const requestDetails = async (match) => {
  await showNetwork();
  await wait(200);
  await page.$$eval('.network-row', (rows, m) => rows.find((r) => r.textContent.includes(m)).click(), match);
  await wait(200);
  const text = await page.$eval('.network-details', (e) => e.textContent);
  await page.$$eval('.network-row', (rows, m) => rows.find((r) => r.textContent.includes(m)).click(), match);
  return text;
};
const clickLink = (container, text) =>
  frame().$$eval(`${container} a`, (els, t) => els.find((a) => a.textContent.includes(t)).click(), text);
const clickButton = (container, text) =>
  frame().$$eval(`${container} button`, (els, t) => els.find((b) => b.textContent.includes(t)).click(), text);
const clearAndType = async (selector, text) => {
  await frame().click(selector, { clickCount: 3 });
  await frame().type(selector, text, { delay: 10 });
};
// Вход через форму на /login: тестовые данные или администратор
const logIn = async (admin = false) => {
  if (admin) {
    await clearAndType('app-login input[type=email]', 'admin@example.com');
    await clearAndType('app-login input[type=password]', 'admin');
  } else {
    await clickButton('app-login', 'Заполнить');
  }
  await clickButton('app-login form', 'Войти');
  await wait(1000);
};
const logOut = async () => {
  await clickButton('app-header', 'Выйти');
  await wait(700);
};

// 1. Как устроен вход: «Войти» в шапке
expect((await title()) === 'Как устроен вход', 'шаг 1 открыт');
await showSolution();
expect((await header()).includes('Войти'), 'шаг 1: в шапке «Войти»');
await clickLink('app-header', 'Войти');
await wait(500);
expect((await address()) === '/login', 'шаг 1: «Войти» ведёт на /login');
await checkConsoleClean('шаг 1');

// 2. Вход и выход
await nextStep();
expect((await title()) === 'Вход и выход', 'шаг 2 открыт');
await showSolution();
await clearAndType('app-login input[type=email]', 'user@example.com');
await clearAndType('app-login input[type=password]', 'wrong');
await clickButton('app-login form', 'Войти');
await wait(800);
expect(
  (await mainText()).includes('Неверный e-mail или пароль') && (await header()).includes('Войти'),
  'шаг 2: неверный пароль — ошибка у формы, в шапке «Войти»',
);
await logIn();
expect((await address()) === '/', 'шаг 2: после входа — главная');
expect((await header()).includes('Пользователь') && (await header()).includes('Выйти'), 'шаг 2: имя и «Выйти» в шапке');
await logOut();
expect((await header()).includes('Войти'), 'шаг 2: после выхода — «Войти»');
await checkConsoleClean('шаг 2');

// 3. Сессия после перезагрузки
await nextStep();
expect((await title()) === 'Сессия после перезагрузки', 'шаг 3 открыт');
await showSolution();
await go('/login');
await logIn();
await restart();
expect((await header()).includes('Пользователь'), 'шаг 3: после ⟳ покупатель по-прежнему вошёл');
const afterRestart = await requests();
expect(afterRestart[0]?.startsWith('GET /api/me 200'), `шаг 3: первый запрос — GET /api/me (${afterRestart[0]})`);
expect(
  (await requestDetails('/api/me')).includes('authorization: Bearer eyJ'),
  'шаг 3: у GET /api/me заголовок Authorization',
);
await checkConsoleClean('шаг 3');

// 4. Токен в запросах: отзыв от имени покупателя
await nextStep();
expect((await title()) === 'Токен в запросах', 'шаг 4 открыт');
await showSolution();
expect((await header()).includes('Пользователь'), 'шаг 4: вход сохранился с прошлого шага');
await go('/games/2');
await clickButton('app-tabs', 'Отзывы');
await frame().type('app-game-page textarea', 'Проверка главы 14');
await clickButton('app-game-page form', 'Отправить');
await wait(1000);
const review = await frame().$$eval('app-game-page .review', (els) =>
  els.map((e) => e.innerText).find((t) => t.includes('Проверка главы 14')),
);
expect(review?.includes('Пользователь'), `шаг 4: отзыв подписан именем (${review})`);
expect(
  (await requestDetails('/reviews')).includes('authorization: Bearer'),
  'шаг 4: POST отзыва — с заголовком Authorization',
);
await checkConsoleClean('шаг 4');

// 5. Ответ 401: токен на 30 секунд
await nextStep();
expect((await title()) === 'Ответ 401', 'шаг 5 открыт');
await showSolution();
await logOut();
await go('/login');
await logIn();
expect((await header()).includes('Пользователь'), 'шаг 5: вошли с 30-секундным токеном');
await wait(31000);
await clickLink('app-header nav', 'Каталог');
await wait(1500);
expect((await address()) === '/login', `шаг 5: после истечения токена — страница входа (${await address()})`);
expect((await header()).includes('Войти'), 'шаг 5: в шапке «Войти»');
expect(
  (await requests()).some((r) => r.startsWith('GET /api/games') && r.includes('401')),
  'шаг 5: в «Сети» — 401 на каталог',
);
await checkConsoleClean('шаг 5');

// 6. Гард входа и возврат
await nextStep();
expect((await title()) === 'Гард входа и возврат', 'шаг 6 открыт');
await showSolution();
expect(
  (await address()) === '/login?returnUrl=%2Faccount%2Forders',
  `шаг 6: гость на /account/orders — на вход с returnUrl (${await address()})`,
);
await logIn();
expect((await address()) === '/account/orders', 'шаг 6: после входа — обратно на заказы');
await checkConsoleClean('шаг 6');

// 7. Роли: админка только для администратора
await nextStep();
expect((await title()) === 'Роли', 'шаг 7 открыт');
await showSolution();
expect(!(await header()).includes('Админка'), 'шаг 7: у покупателя нет ссылки «Админка»');
await go('/admin');
expect((await mainText()).includes('Нет такой страницы'), 'шаг 7: покупателю /admin — 404');
await logOut();
await go('/login');
await logIn(true);
expect(
  (await header()).includes('Администратор') && (await header()).includes('Админка'),
  'шаг 7: администратор видит «Админку»',
);
await clickLink('app-header nav', 'Админка');
await wait(1000);
expect((await mainText()).includes('Игр в каталоге: 40'), 'шаг 7: сводка админки с сервера');
await checkConsoleClean('шаг 7');

// 8. Обновление токена: токен на 20 секунд, два 401 — одно обновление
await nextStep();
expect((await title()) === 'Обновление токена', 'шаг 8 открыт');
await showSolution();
await logOut();
await go('/login');
await logIn();
await clickLink('app-header nav', 'Каталог');
await wait(1000);
await wait(21000);
await clickLink('app-header nav', 'Главная');
await wait(2500);
const refreshRequests = (await requests()).filter((r) => r.startsWith('POST /api/refresh'));
expect(
  refreshRequests.length === 1 && refreshRequests[0].includes('200'),
  `шаг 8: одно обновление токена (${refreshRequests})`,
);
expect(
  (await requests()).filter((r) => r.startsWith('GET /api/games') && r.includes('401')).length === 2,
  'шаг 8: два запроса главной получили 401',
);
expect((await header()).includes('Пользователь'), 'шаг 8: покупатель остался вошедшим');
expect((await frame().$$eval('app-game-card', (e) => e.length)) > 0, 'шаг 8: подборки загрузились');
await checkConsoleClean('шаг 8');

// 9. Практикум: «Мои заказы» и выход с них
await nextStep();
expect((await title()) === 'Практикум: личный кабинет', 'шаг 9 открыт');
await showSolution();
expect((await mainText()).includes('Вы ещё ничего не заказывали'), 'шаг 9: заказов нет');
await logOut();
expect((await address()).startsWith('/login?returnUrl=%2Faccount%2Forders'), 'шаг 9: «Выйти» на заказах — на вход');
await checkConsoleClean('шаг 9');

// 10. Безопасность сессии (без решения)
await nextStep();
expect((await title()) === 'Безопасность сессии', 'шаг 10 открыт');
await checkConsoleClean('шаг 10');

await finish();
