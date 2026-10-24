// Проверка главы 17 в интерфейсе платформы: проходит шаги кнопкой «Далее», в каждом нажимает «Решение»
// и работает с админкой в превью вошедшим администратором: макет и меню, сортировка по заголовкам, поиск
// и страницы, форма редактирования (PUT, ошибка 400 сервера), журнал сервиса раздела, кэш после сохранения,
// окно подтверждения удаления и гард несохранённой формы, новая игра с загрузкой обложки.
// node tools/e2e/checks/ch17-admin.mjs
import { writeFileSync } from 'node:fs';
import { clean, openCourse, OUT, wait } from '../lib.mjs';

// Поиск меняет адрес на каждую букву, и роутер с withViewTransitions в dev-режиме сам пишет в консоль
// «AbortError: Transition was skipped», если новый переход начался раньше, чем браузер запустил анимацию
// прошлого (createViewTransition в @angular/router: console.error в .ready.catch). Так и в каталоге магазина
const ignoreConsole = (line) => line.includes('Transition was skipped');
const { page, expect, frame, title, count, showSolution, nextStep, checkConsoleClean, finish } = await openCourse(
  '/admin/admin-section',
  { ignoreConsole },
);

const mainText = async () => clean(await frame().$eval('main', (e) => e.innerText));
const address = () => page.$eval('.address-input', (e) => e.value);
// Ввод адреса в адресной строке превью: приложение (и учебный бэкенд) запускается заново с этого адреса
const go = async (url) => {
  await page.click('.address-input', { clickCount: 3 });
  await page.type('.address-input', `${url}\n`);
  await wait(2000);
};
const clickIn = (selector) => frame().$eval(selector, (el) => el.click());
const clickText = (container, tag, text) =>
  frame().$$eval(`${container} ${tag}`, (els, t) => els.find((e) => e.textContent.includes(t)).click(), text);
const typeInto = async (selector, text, delay = 30) => {
  await frame().click(selector, { clickCount: 3 });
  await frame().type(selector, text, { delay });
};
const rows = async () =>
  (await frame().$$eval('app-games-table tbody tr', (trs) => trs.map((tr) => tr.innerText))).map(clean);
const dialogText = () => frame().evaluate(() => document.querySelector('dialog[open]')?.textContent.trim() ?? '');
const priceField = 'app-game-fields input[type=number]';
// Сохранить игру с новой ценой на странице редактирования
const savePrice = async (price) => {
  await typeInto(priceField, price);
  await clickText('app-game-edit form', 'button', 'Сохранить');
  await wait(900);
};
// Найти игру поиском в таблице и открыть её — переходом внутри приложения, без перезапуска
const openFromTable = async (name) => {
  await typeInto('app-games-table .search', name, 150);
  await wait(900);
  await clickText('app-games-table tbody', 'a', name);
  await wait(1200);
};

// 1. Раздел админки: вход администратором, макет, меню, таблица
expect((await title()) === 'Раздел админки', 'шаг 1 открыт');
await showSolution();
expect((await mainText()).includes('Нет такой страницы'), 'шаг 1: гостю админки нет — 404');
await go('/login');
await typeInto('app-login input[type=email]', 'admin@example.com');
await typeInto('app-login input[type=password]', 'admin');
await clickText('app-login form', 'button', 'Войти');
await wait(1000);
await go('/admin');
expect((await mainText()).includes('Сводка Игры'), 'шаг 1: меню «Сводка · Игры» в макете');
expect((await mainText()).includes('Игр в каталоге: 40'), 'шаг 1: сводка внутри макета');
await clickText('app-admin-layout nav', 'a', 'Игры');
await wait(800);
expect((await address()) === '/admin/games', 'шаг 1: «Игры» — /admin/games');
expect((await count('app-games-table tbody tr')) === 10, 'шаг 1: в таблице 10 строк');
const active = await frame().$$eval('.sections a.active', (a) => a.map((x) => x.textContent.trim()));
expect(JSON.stringify(active) === '["Игры"]', `шаг 1: активен только пункт «Игры» (${active})`);
await checkConsoleClean('шаг 1');

// 2. Сортировка
await nextStep();
expect((await title()) === 'Сортировка', 'шаг 2 открыт');
await showSolution();
expect((await rows())[0].startsWith('Весёлая ферма'), 'шаг 2: по умолчанию — по названию');
await clickText('app-games-table thead', 'button', 'Цена');
await wait(800);
expect((await address()) === '/admin/games?sort=price', 'шаг 2: «Цена» — ?sort=price');
expect((await rows())[0].startsWith('Домино'), 'шаг 2: дешёвые сначала');
await clickText('app-games-table thead', 'button', 'Цена');
await wait(800);
expect((await rows())[0].startsWith('Механический город'), 'шаг 2: второй щелчок — дорогие сначала');
const sorts = await frame().$$eval('th', (ths) => ths.map((t) => t.getAttribute('aria-sort')));
expect(JSON.stringify(sorts) === '[null,"descending",null]', `шаг 2: aria-sort только у «Цены» (${sorts})`);
await checkConsoleClean('шаг 2');

// 3. Поиск и страницы
await nextStep();
expect((await title()) === 'Поиск и страницы', 'шаг 3 открыт');
await showSolution();
expect((await count('.pages button')) === 4, 'шаг 3: четыре страницы');
await clickText('.pages', 'button', '3');
await wait(800);
expect((await address()) === '/admin/games?page=3', 'шаг 3: страница 3 в адресе');
expect((await rows())[0].startsWith('Мост через реку'), 'шаг 3: третья страница с «Моста через реку»');
await typeInto('app-games-table .search', 'ка', 150);
await wait(1000);
expect((await mainText()).includes('Найдено игр: 12'), 'шаг 3: поиск «ка» — 12 игр');
expect((await count('.pages button')) === 2, 'шаг 3: после поиска две страницы');
expect(!(await address()).includes('page='), 'шаг 3: поиск убрал страницу из адреса');
await checkConsoleClean('шаг 3');

// 4. Форма редактирования
await nextStep();
expect((await title()) === 'Форма редактирования', 'шаг 4 открыт');
await showSolution();
await wait(500);
const values = await frame().$$eval('app-game-fields input, app-game-fields select', (els) => els.map((e) => e.value));
expect(
  JSON.stringify(values.slice(0, 5)) === '["Ночной экспресс","strategy","3190","3590","3"]',
  `шаг 4: форма заполнена игрой с сервера (${values.slice(0, 5)})`,
);
const crumbs = clean(await frame().$eval('app-breadcrumbs', (e) => e.innerText));
expect(
  crumbs.includes('Админка') && crumbs.endsWith('Ночной экспресс'),
  `шаг 4: крошки «… Админка › Игры › Ночной экспресс» (${crumbs})`,
);
await typeInto(priceField, '2990.5');
await clickText('app-game-edit form', 'button', 'Сохранить');
await wait(900);
expect((await mainText()).includes('Цена — целое число рублей больше нуля'), 'шаг 4: ошибка 400 сервера у формы');
await savePrice('2990');
expect((await address()) === '/admin/games', 'шаг 4: после сохранения — таблица');
await checkConsoleClean('шаг 4');

// 5. Сервис раздела: журнал
await nextStep();
expect((await title()) === 'Сервис раздела', 'шаг 5 открыт');
await showSolution();
await wait(500);
await savePrice('2990');
await clickText('app-admin-layout nav', 'a', 'Сводка');
await wait(800);
expect((await mainText()).includes('Изменена игра «Ночной экспресс»'), 'шаг 5: запись в журнале на сводке');
await checkConsoleClean('шаг 5');

// 6. Изменения и кэш: после сохранения игра открывается с новой ценой
await nextStep();
expect((await title()) === 'Изменения и кэш', 'шаг 6 открыт');
await showSolution();
await wait(500);
await savePrice('2990');
await openFromTable('Ночной экспресс');
expect(
  (await frame().$eval(priceField, (e) => e.value)) === '2990',
  'шаг 6: после сохранения — новая цена, не из кэша',
);
await checkConsoleClean('шаг 6');

// 7. Подтверждение удаления и гард
await nextStep();
expect((await title()) === 'Подтверждение удаления', 'шаг 7 открыт');
await showSolution();
await clickIn('app-games-table tbody tr:first-child .link-button');
await wait(400);
expect((await dialogText()).startsWith('Удалить «Весёлая ферма» из каталога?'), 'шаг 7: окно с вопросом');
await frame().$eval('dialog[open] .link-button', (b) => b.click());
await wait(400);
expect((await count('app-confirm-dialog')) === 0, 'шаг 7: после «Отмены» окна в DOM нет');
expect((await rows())[0].startsWith('Весёлая ферма'), 'шаг 7: «Отмена» — игра на месте');
await clickIn('app-games-table tbody tr:first-child .link-button');
await wait(400);
await frame().$eval('dialog[open] .button', (b) => b.click());
await wait(900);
expect((await mainText()).includes('Найдено игр: 39'), 'шаг 7: «Удалить» — игр 39');
await clickIn('app-games-table tbody tr:first-child a');
await wait(1000);
await typeInto('app-game-fields input', 'Новое название');
// Окно гарда задерживает переход: щелчок по ссылке — из страницы, без ожидания
await frame().$eval('app-game-edit .back-link', (a) => setTimeout(() => a.click()));
await wait(600);
expect((await dialogText()).startsWith('Изменения не сохранятся'), 'шаг 7: гард спрашивает в окне');
await frame().$eval('dialog[open] .link-button', (b) => b.click());
await wait(500);
expect((await address()).startsWith('/admin/games/'), 'шаг 7: «Отмена» — остались на странице игры');
await checkConsoleClean('шаг 7');

// 8. Практикум: новая игра с обложкой
await nextStep();
expect((await title()) === 'Практикум: новая игра', 'шаг 8 открыт');
await showSolution();
writeFileSync(
  `${OUT}/ch17-cover.svg`,
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#2a7"/></svg>',
);
const file = await frame().$('app-cover-upload input[type=file]');
await file.uploadFile(`${OUT}/ch17-cover.svg`);
await wait(900);
const preview = await frame().$eval('app-cover-upload img', (i) => [i.getAttribute('src'), i.naturalWidth]);
expect(preview[0].startsWith('blob:') && preview[1] === 300, `шаг 8: превью загруженной обложки (${preview})`);
await typeInto('app-game-fields input:not([type])', 'Северный ветер');
await typeInto(priceField, '1500');
await clickText('app-game-new form', 'button', 'Добавить');
await wait(1200);
expect(
  decodeURIComponent(await address()) === '/admin/games?q=Северный ветер',
  'шаг 8: после «Добавить» — таблица с поиском',
);
expect((await rows())[0]?.startsWith('Северный ветер'), 'шаг 8: новая игра в таблице');
await checkConsoleClean('шаг 8');

await finish();
