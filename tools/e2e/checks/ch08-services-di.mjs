// Проверка главы 8 в интерфейсе платформы: проходит шаги кнопкой «Далее», в каждом нажимает «Решение»
// и проверяет приложение в превью — общая корзина (шапка, карточки, окно «Подробнее»), таймер на injectNow,
// демо-корзина через useClass, настройки из SHOP_CONFIG, вкладки через токен TABS, ленивая аналитика,
// избранное и журнал поиска зависимостей по Alt+щелчку.
// node tools/e2e/checks/ch08-services-di.mjs
import { BASE_URL, launch, wait } from '../lib.mjs';

const failures = [];
const expect = (ok, message) => {
  console.log(`${ok ? '✓' : '✗'} ${message}`);
  if (!ok) failures.push(message);
};

const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
page.on('dialog', (d) => d.accept());
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE_URL}/services-di/why-di`, { waitUntil: 'networkidle0' });
await wait(3000);

// После перезапуска старый iframe может ещё числиться в списке — берём последний
const frame = () => page.frames().filter((f) => f.url().includes('/app')).at(-1);
const consoleText = () => page.$$eval('.console-line', (els) => els.map((e) => e.textContent ?? '').join('\n'));
const title = () => page.$eval('.lesson-title-row h1', (e) => e.textContent);
// Текст без неразрывных пробелов и лишних переводов строк: «1 990 ₽» пайпы пишут через U+00A0
const clean = (s) => s.replace(/\u00a0|\u202f/g, ' ').replace(/\s+/g, ' ').trim();
const text = async (selector) => clean(await frame().$eval(selector, (e) => e.textContent));
const header = () => text('app-header');
const card = (name) =>
  frame().evaluateHandle(
    (name) => [...document.querySelectorAll('app-game-card')].find((c) => c.textContent.includes(name)),
    name,
  );
const cardText = async (name, selector) =>
  clean(await (await card(name)).evaluate((c, selector) => c.querySelector(selector)?.textContent ?? '', selector));
const clickInCard = async (name, selector) => {
  const button = await (await card(name)).$(selector);
  await button.click();
  await wait(400);
};
const openGame = async (name) => {
  await clickInCard(name, '.title-button');
  await wait(400);
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
  // Строки журнала di-log.ts упоминают NG0201 намеренно — их не считаем
  const log = (await consoleText())
    .split('\n')
    .filter((line) => !line.includes('NullInjector —'))
    .join('\n');
  expect(!/ERROR|NG0\d+|Error:|Cannot find/.test(log), `${step}: консоль без ошибок`);
}

// 1. Зачем DI: глобальный экземпляр корзины
expect((await title()) === 'Зачем внедрение зависимостей', 'шаг 1 открыт');
expect((await header()).includes('В корзине: 0 · 0 ₽'), 'шаг 1: в старте шапка — компонент Header со входами');
await showSolution();
await clickInCard('Драконья почта', '.button');
expect((await header()).includes('В корзине: 1 · 1 290 ₽'), `шаг 1: шапка из cartStore (${await header()})`);
expect((await cardText('Драконья почта', '.in-cart')) === 'В корзине: 1 шт.', 'шаг 1: карточка — «В корзине: 1 шт.»');
expect((await consoleText()).includes('Корзина: Драконья почта × 1'), 'шаг 1: эффект в App пишет журнал');
await checkConsoleClean('шаг 1');

// 2. Первый сервис: окно «Подробнее» кладёт в ту же корзину
await nextStep();
expect((await title()) === 'Первый сервис', 'шаг 2 открыт');
await showSolution();
await openGame('Драконья почта');
await frame().$eval('dialog .button', (b) => b.click());
await wait(400);
expect((await header()).includes('В корзине: 1 · 1 290 ₽'), 'шаг 2: «В корзину» в окне обновило шапку');
expect((await text('dialog .in-cart')) === 'В корзине: 1 шт.', 'шаг 2: в окне — «В корзине: 1 шт.»');
expect((await cardText('Драконья почта', '.in-cart')) === 'В корзине: 1 шт.', 'шаг 2: и в карточке под окном');
expect((await text('.mini-cart')).includes('Драконья почта'), 'шаг 2: строка в мини-корзине');
await page.keyboard.press('Escape');
await wait(400);
await checkConsoleClean('шаг 2');

// 3. Контекст внедрения: таймер на injectNow
await nextStep();
expect((await title()) === 'Контекст внедрения', 'шаг 3 открыт');
await showSolution();
await openGame('Остров сокровищ');
const t1 = await text('app-countdown');
await wait(1600);
const t2 = await text('app-countdown');
expect(/^Скидка действует ещё \d\d:\d\d:\d\d$/.test(t1) && t1 !== t2, `шаг 3: таймер идёт (${t1} → ${t2})`);
await page.keyboard.press('Escape');
await wait(400);
await checkConsoleClean('шаг 3');

// 4. Провайдеры: демо-корзина
await nextStep();
expect((await title()) === 'Провайдеры', 'шаг 4 открыт');
await showSolution();
expect((await header()).includes('В корзине: 3 · 4 870 ₽'), `шаг 4: демо-корзина в шапке (${await header()})`);
expect((await text('.mini-cart')).includes('До бесплатной доставки: 130 ₽'), 'шаг 4: до бесплатной доставки 130 ₽');
expect((await cardText('Остров сокровищ', '.in-cart')) === 'В корзине: 2 шт.', 'шаг 4: «Остров» — 2 шт.');
expect((await cardText('Тихая охота', '.in-cart')) === 'В корзине: 1 шт.', 'шаг 4: «Тихая охота» — 1 шт.');
expect(
  (await consoleText()).includes('Корзина: Остров сокровищ × 2, Тихая охота × 1'),
  'шаг 4: эффект унаследован демо-корзиной',
);
await checkConsoleClean('шаг 4');

// 5. Токены: настройки и валюта
await nextStep();
expect((await title()) === 'Токены', 'шаг 5 открыт');
await showSolution();
expect((await text('.mini-cart')).includes('До бесплатной доставки: 130 ₽'), 'шаг 5: порог доставки из SHOP_CONFIG');
expect((await frame().$$eval('app-game-card', (els) => els.length)) === 6, 'шаг 5: порция каталога — 6 карточек');
expect((await cardText('Ночной экспресс', '.stock')) === 'Осталось 3 шт.', 'шаг 5: «осталось мало» из SHOP_CONFIG');
expect((await cardText('Ночной экспресс', '.stickers')).includes('Хит'), 'шаг 5: «Хит» из SHOP_CONFIG');
expect((await cardText('Остров сокровищ', '.price')) === '1 990 ₽ 2 490 ₽', 'шаг 5: цена через DEFAULT_CURRENCY_CODE');
await checkConsoleClean('шаг 5');

// 6. Иерархия: вкладки находят Tabs через токен
await nextStep();
expect((await title()) === 'Иерархия инжекторов', 'шаг 6 открыт');
await showSolution();
await openGame('Остров сокровищ');
const hidden = () => frame().$$eval('dialog app-tab', (els) => els.map((e) => e.hidden));
expect(JSON.stringify(await hidden()) === '[false,true]', 'шаг 6: видна первая вкладка');
await frame().evaluate(() => document.querySelectorAll('.tab')[1].click());
await wait(400);
expect(JSON.stringify(await hidden()) === '[true,false]', 'шаг 6: после щелчка видна вторая');
await page.keyboard.press('Escape');
await wait(400);
await checkConsoleClean('шаг 6');

// 7. Ленивые сервисы: аналитика
await nextStep();
expect((await title()) === 'Ленивые сервисы', 'шаг 7 открыт');
await showSolution();
await wait(1000);
let log = await consoleText();
expect(log.includes('Аналитика: модуль загружен'), 'шаг 7: модуль загружен заранее (onIdle)');
expect(!log.includes('Аналитика: экземпляр создан'), 'шаг 7: экземпляра до щелчка нет');
await clickInCard('Драконья почта', '.button');
await wait(400);
log = await consoleText();
expect(log.includes('Аналитика: экземпляр создан'), 'шаг 7: экземпляр создан при первом вызове');
expect(log.includes('Аналитика: В корзину — Драконья почта'), 'шаг 7: событие аналитики');
await checkConsoleClean('шаг 7');

// 8. Практикум: избранное
await nextStep();
expect((await title()) === 'Практикум: избранное', 'шаг 8 открыт');
await showSolution();
expect((await text('app-header .favorites')) === '♥ 0', 'шаг 8: в шапке ♥ 0');
await clickInCard('Остров сокровищ', '.favorite');
await clickInCard('Драконья почта', '.favorite');
expect((await text('app-header .favorites')) === '♥ 2', 'шаг 8: ♥ 2');
expect((await cardText('Остров сокровищ', '.favorite')) === '♥', 'шаг 8: сердечко заполнилось');
expect(
  (await (await card('Остров сокровищ')).$eval('.favorite', (b) => b.getAttribute('aria-pressed'))) === 'true',
  'шаг 8: aria-pressed',
);
await clickInCard('Драконья почта', '.favorite');
expect((await text('app-header .favorites')) === '♥ 1', 'шаг 8: повторный щелчок — ♥ 1');
expect((await header()).includes('В корзине: 3 · 4 870 ₽'), 'шаг 8: сердечко не кладёт в корзину');
// Отфильтровать «Остров» и вернуть: карточка пересоздана, а избранное живёт в сервисе
const search = await frame().$('.search');
await search.type('кот');
await wait(400);
expect((await card('Остров сокровищ')) && !(await (await card('Остров сокровищ')).jsonValue()), 'шаг 8: карточка «Острова» скрыта поиском');
await search.click({ clickCount: 3 });
await page.keyboard.press('Backspace');
await wait(500);
expect((await cardText('Остров сокровищ', '.favorite')) === '♥', 'шаг 8: после возврата сердечко на месте');
await checkConsoleClean('шаг 8');

// 9. Под капотом: журнал поиска по Alt+щелчку
await nextStep();
expect((await title()) === 'Под капотом: как ищется зависимость', 'шаг 9 открыт');
const buy = await (await card('Драконья почта')).$('.button');
await page.keyboard.down('Alt');
await buy.click();
await page.keyboard.up('Alt');
await wait(500);
log = await consoleText();
expect(log.includes('Путь поиска для GameCard:'), 'шаг 9: журнал для GameCard');
expect(log.includes('5. NullInjector'), 'шаг 9: путь заканчивается NullInjector');
expect(log.includes('CartStore ← инжектор окружения root'), 'шаг 9: CartStore — из корневого инжектора');
expect((await header()).includes('В корзине: 3 · 4 870 ₽'), 'шаг 9: Alt+щелчок не нажал «В корзину»');
await openGame('Остров сокровищ');
const desc = await frame().$('dialog .description');
await page.keyboard.down('Alt');
await desc.click();
await page.keyboard.up('Alt');
await wait(500);
log = await consoleText();
expect(log.includes('Tab получил: InjectionToken TABS ← <app-tabs>'), 'шаг 9: Tab получил TABS от <app-tabs>');
await checkConsoleClean('шаг 9');

expect(pageErrors.length === 0, `ошибок страницы нет ${JSON.stringify(pageErrors)}`);
await browser.close();
console.log(failures.length ? `\nПровалено: ${failures.length}` : '\nВсё прошло');
process.exit(failures.length ? 1 : 0);
