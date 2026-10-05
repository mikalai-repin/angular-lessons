// Проверка главы 10 в интерфейсе платформы: проходит шаги кнопкой «Далее», в каждом нажимает «Решение»
// и проверяет магазин в превью — адресную строку, переходы по ссылкам без перезапуска, страницу игры,
// фильтры в query-параметрах (⟳ и история), вложенный и ленивый кабинет, гарды оформления заказа,
// заголовок вкладки, 404 и переадресации, хлебные крошки и журнал навигации.
// node tools/e2e/checks/ch10-routing.mjs
import { BASE_URL, launch, wait } from '../lib.mjs';

const failures = [];
const expect = (ok, message) => {
  console.log(`${ok ? '✓' : '✗'} ${message}`);
  if (!ok) failures.push(message);
};

const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
// Диалоги: «Решение» в платформе спрашивает подтверждение, гард шага 7 — confirm() в превью
let dialogText = '';
let dismissDialog = false;
page.on('dialog', async (d) => {
  dialogText = d.message();
  await (dismissDialog ? d.dismiss() : d.accept());
});
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE_URL}/routing/routes`, { waitUntil: 'networkidle0' });
await wait(3000);

// После перезапуска старый iframe может ещё числиться в списке — берём последний
const frame = () =>
  page
    .frames()
    .filter((f) => f.url().includes('/app'))
    .at(-1);
const consoleText = () => page.$$eval('.console-line', (els) => els.map((e) => e.textContent ?? '').join('\n'));
const title = () => page.$eval('.lesson-title-row h1', (e) => e.textContent);
const clean = (s) => s.replace(/ | /g, ' ').replace(/\s+/g, ' ').trim();
const mainText = async () => clean(await frame().$eval('main', (e) => e.innerText));
const address = () => page.$eval('.address-input', (e) => e.value);
const tabTitle = () => page.$eval('.preview-tab-title', (e) => e.textContent);
// Ввод адреса в адресной строке превью: приложение запускается заново с этого адреса
const go = async (url) => {
  await page.click('.address-input', { clickCount: 3 });
  await page.type('.address-input', `${url}\n`);
  await wait(2500);
};
const click = async (selector) => {
  const el = await frame().$(selector);
  await el.click();
  await wait(600);
};
const clickText = async (text) => {
  const [el] = await frame().$$(`xpath/.//a[normalize-space(.)="${text}"] | .//button[normalize-space(.)="${text}"]`);
  await el.click();
  await wait(600);
};
// Щелчок, который откроет confirm(): окно блокирует событие мыши Puppeteer, поэтому щёлкаем из страницы асинхронно
const clickAsync = async (selector) => {
  await frame().$eval(selector, (el) => setTimeout(() => el.click()));
  await wait(800);
};
const addToCart = async () => {
  await click('app-game-card .actions .button');
};

async function showSolution() {
  const button = await page.$('.lesson-footer-middle .button');
  if (button && (await button.evaluate((e) => e.textContent)) === 'Решение') {
    await button.click();
    await wait(3500);
  }
}

async function nextStep() {
  await page.click('.lesson-footer .button.primary');
  await wait(3500);
}

async function checkConsoleClean(step) {
  expect(!/ERROR|NG0\d+|Error:|Cannot find|TS\d+/.test(await consoleText()), `${step}: консоль без ошибок`);
}

// 1. Маршруты
expect((await title()) === 'Маршруты', 'шаг 1 открыт');
expect((await mainText()).startsWith('Каталог'), 'шаг 1: в старте под шапкой — каталог');
await showSolution();
expect((await mainText()).startsWith('Настольные игры для всей семьи'), 'шаг 1: на / — главная');
await go('/catalog');
expect((await mainText()).startsWith('Каталог'), 'шаг 1: /catalog — каталог');
await go('/cart');
expect((await mainText()).startsWith('Корзина Корзина пуста.'), `шаг 1: /cart — корзина (${await mainText()})`);
await go('/');
await checkConsoleClean('шаг 1');

// 2. Ссылки: переходы без перезапуска
await nextStep();
expect((await title()) === 'Ссылки', 'шаг 2 открыт');
await showSolution();
const analytics = async () => (await consoleText()).split('Аналитика: модуль загружен').length - 1;
const before = await analytics();
await clickText('Весь каталог');
expect((await address()) === '/catalog', 'шаг 2: «Весь каталог» → /catalog');
expect(
  await frame().$eval(
    '.nav a[href$="/catalog"]',
    (a) => a.classList.contains('active') && a.getAttribute('aria-current') === 'page',
  ),
  'шаг 2: «Каталог» в меню активен, aria-current="page"',
);
expect(
  !(await frame().$eval('.nav a[href$="/app/"]', (a) => a.classList.contains('active'))),
  'шаг 2: «Главная» не активна (exact)',
);
await click('header a.cart');
expect((await address()) === '/cart', 'шаг 2: сводка корзины → /cart');
expect((await analytics()) === before, 'шаг 2: переходы по ссылкам не перезапускают приложение');
await page.click('.icon-button[title="Назад"]');
await wait(600);
expect((await address()) === '/catalog', 'шаг 2: ← в превью — назад по истории');
await checkConsoleClean('шаг 2');

// 3. Параметры: страница игры
await nextStep();
expect((await title()) === 'Параметры маршрута', 'шаг 3 открыт');
await showSolution();
await go('/catalog');
const express = await frame().evaluateHandle(() =>
  [...document.querySelectorAll('app-game-card a.title-link')].find((a) => a.textContent.includes('Ночной экспресс')),
);
await express.click();
await wait(800);
expect((await address()) === '/games/4', `шаг 3: название в карточке → /games/4 (${await address()})`);
expect((await mainText()).includes('Ночной экспресс'), 'шаг 3: страница игры');
expect(!!(await frame().$('app-tabs')), 'шаг 3: вкладки на странице игры');
await go('/games/99');
expect((await mainText()).includes('Игра не найдена'), 'шаг 3: /games/99 — «Игра не найдена»');
await checkConsoleClean('шаг 3');

// 4. Query-параметры
await nextStep();
expect((await title()) === 'Query-параметры', 'шаг 4 открыт');
await showSolution();
await go('/catalog');
await (await frame().$('.search')).type('кот');
await wait(600);
expect(
  decodeURIComponent(await address()) === '/catalog?q=кот',
  `шаг 4: поиск в адресе (${decodeURIComponent(await address())})`,
);
await click('.filters input[type=checkbox]');
expect(decodeURIComponent(await address()) === '/catalog?q=кот&inStock=true', 'шаг 4: флажок в адресе');
await page.click('button[title="Перезагрузить приложение с текущего адреса"]');
await wait(2500);
expect(
  (await frame().$eval('.search', (i) => i.value)) === 'кот' &&
    (await frame().$eval('.filters input[type=checkbox]', (i) => i.checked)),
  'шаг 4: после ⟳ фильтры на месте',
);
expect((await mainText()).includes('Космические коты'), 'шаг 4: выдача по фильтрам');
await go('/');
await click('a[href*="sort=rating"]');
expect((await address()) === '/catalog?sort=rating', 'шаг 4: «Все по рейтингу →» — /catalog?sort=rating');
expect(
  await frame().$eval('.nav a[href$="/catalog"]', (a) => a.classList.contains('active')),
  'шаг 4: «Каталог» активен и с query-параметрами',
);
await checkConsoleClean('шаг 4');

// 5. Вложенные маршруты
await nextStep();
expect((await title()) === 'Вложенные маршруты', 'шаг 5 открыт');
await showSolution();
await go('/account');
expect((await address()) === '/account/favorites', 'шаг 5: /account → /account/favorites');
await clickText('Заказы');
expect((await address()) === '/account/orders', 'шаг 5: «Заказы» → /account/orders');
expect(
  (await mainText()).includes('Личный кабинет') && (await mainText()).includes('Здесь появятся ваши заказы'),
  'шаг 5: каркас и раздел',
);
await checkConsoleClean('шаг 5');

// 6. Ленивая загрузка
await nextStep();
expect((await title()) === 'Ленивая загрузка', 'шаг 6 открыт');
await showSolution();
await go('/');
expect(!(await consoleText()).includes('Кабинет: модуль загружен'), 'шаг 6: на главной модуль кабинета не загружен');
await click('header a.favorites');
expect((await consoleText()).includes('Кабинет: модуль загружен'), 'шаг 6: переход в кабинет загрузил модуль');
await checkConsoleClean('шаг 6');

// 7. Гарды
await nextStep();
expect((await title()) === 'Гарды', 'шаг 7 открыт');
await showSolution();
await go('/checkout');
expect((await address()) === '/cart', 'шаг 7: пустая корзина — /checkout переадресует на /cart');
await go('/catalog');
await addToCart();
await click('header a.cart');
await clickText('Оформить заказ');
expect((await address()) === '/checkout', 'шаг 7: «Оформить заказ» → /checkout');
await (await frame().$('textarea')).type('Позвонить заранее');
dismissDialog = true;
await clickAsync('.nav a[href$="/catalog"]');
expect(dialogText.startsWith('Комментарий к заказу не сохранится'), 'шаг 7: уход с комментарием — вопрос');
expect((await address()) === '/checkout', 'шаг 7: «Отмена» — остались на /checkout');
dismissDialog = false;
await clickAsync('.nav a[href$="/catalog"]');
expect((await address()) === '/catalog', 'шаг 7: «ОК» — ушли');
await checkConsoleClean('шаг 7');

// 8. Заголовки
await nextStep();
expect((await title()) === 'Заголовки и резолверы', 'шаг 8 открыт');
await showSolution();
await go('/catalog');
expect((await tabTitle()) === 'Каталог — Ход конём', `шаг 8: заголовок каталога (${await tabTitle()})`);
await go('/games/1');
expect((await tabTitle()) === 'Остров сокровищ — Ход конём', 'шаг 8: заголовок игры из резолвера');
await go('/account/orders');
expect((await tabTitle()) === 'Мои заказы — Ход конём', 'шаг 8: заголовок дочернего маршрута');
await checkConsoleClean('шаг 8');

// 9. 404 и переадресации
await nextStep();
expect((await title()) === '404, переадресации и переходы', 'шаг 9 открыт');
await showSolution();
await go('/nope');
expect((await mainText()).startsWith('Нет такой страницы'), 'шаг 9: /nope — «Нет такой страницы»');
expect((await tabTitle()) === 'Страница не найдена — Ход конём', 'шаг 9: заголовок 404');
await go('/game/3');
expect((await address()) === '/games/3' && (await mainText()).includes('Зельевары'), 'шаг 9: /game/3 → /games/3');
await go('/games');
expect((await address()) === '/catalog', 'шаг 9: /games → /catalog');
await checkConsoleClean('шаг 9');

// 10. Хлебные крошки
await nextStep();
expect((await title()) === 'Практикум: хлебные крошки', 'шаг 10 открыт');
await showSolution();
// Разделитель «›» нарисован через ::after и в innerText не попадает — склеиваем крошки сами
const crumbs = async () =>
  (await frame().$$eval('.breadcrumbs > *', (els) => els.map((e) => e.textContent.trim()))).join(' › ');
await go('/account/favorites');
expect((await crumbs()) === 'Главная › Кабинет › Избранное', `шаг 10: крошки кабинета (${await crumbs()})`);
await clickText('Заказы');
expect((await crumbs()) === 'Главная › Кабинет › Заказы', `шаг 10: крошки после перехода (${await crumbs()})`);
await go('/games/4');
expect((await crumbs()) === 'Главная › Ночной экспресс', `шаг 10: крошка игры из резолвера (${await crumbs()})`);
await go('/');
expect((await crumbs()) === '', 'шаг 10: на главной крошек нет');
await checkConsoleClean('шаг 10');

// 11. Под капотом: журнал навигации
await nextStep();
expect((await title()) === 'Под капотом: как роутер находит страницу', 'шаг 11 открыт');
await click('.nav a[href$="/catalog"]');
const log = await consoleText();
expect(log.includes("NavigationStart(id: 2, url: '/catalog')"), 'шаг 11: журнал — NavigationStart');
expect(log.includes("'catalog' → Catalog"), 'шаг 11: журнал — дерево маршрутов');
await checkConsoleClean('шаг 11');

await page.evaluate(() => localStorage.clear());
expect(pageErrors.length === 0, `ошибок страницы нет ${JSON.stringify(pageErrors)}`);
await browser.close();
console.log(failures.length ? `\nПровалено: ${failures.length}` : '\nВсё прошло');
process.exit(failures.length ? 1 : 0);
