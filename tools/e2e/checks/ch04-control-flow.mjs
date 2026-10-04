// Проверка главы 4 в интерфейсе платформы: проходит шаги кнопкой «Далее», в каждом нажимает «Решение»
// и проверяет приложение в превью — блоки @if/@for/@switch, корзину, поиск, фильтры, сортировку.
// В конце подкладывает в сохранённый прогресс код эксперимента шага «Под капотом» (наблюдатель за DOM).
// node tools/e2e/checks/ch04-control-flow.mjs
import { BASE_URL, launch, OUT, readDir, wait } from '../lib.mjs';

const CONTENT = new URL('../../../content', import.meta.url).pathname;
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
await page.goto(`${BASE_URL}/control-flow/if`, { waitUntil: 'networkidle0' });
await wait(3000);

// После перезапуска старый iframe может ещё числиться в списке — берём последний
const frame = () => page.frames().filter((f) => f.url().includes('/app')).at(-1);
const appText = async () => (await frame().evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
const header = () => frame().$eval('.cart', (e) => e.textContent.trim());
const consoleText = () => page.$$eval('.console-line', (els) => els.map((e) => e.textContent ?? '').join('\n'));
const title = () => page.$eval('.lesson-title-row h1', (e) => e.textContent);
const count = (selector) => frame().$$eval(selector, (els) => els.length);
const texts = (selector) => frame().$$eval(selector, (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
const click = async (selector, times = 1, ms = 200) => {
  for (let i = 0; i < times; i++) {
    await frame().click(selector);
    await wait(ms);
  }
};
// Кнопка «В корзину» плитки с данным названием
const addTile = async (name, times = 1) => {
  for (let i = 0; i < times; i++) {
    await frame().evaluate((name) => {
      const tile = [...document.querySelectorAll('.tile')].find((t) => t.querySelector('.tile-title').textContent.includes(name));
      tile.querySelector('.button').click();
    }, name);
    await wait(200);
  }
};
const tile = (name) =>
  frame().evaluate((name) => {
    const t = [...document.querySelectorAll('.tile')].find((t) => t.querySelector('.tile-title').textContent.includes(name));
    return { text: t.innerText.replace(/\s+/g, ' '), disabled: t.querySelector('.button').disabled };
  }, name);
const type = async (text) => {
  await frame().click('.search', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  if (text) await frame().type('.search', text);
  await wait(300);
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
  const text = await consoleText();
  expect(!/ERROR|NG0\d+|Error:/.test(text), `${step}: консоль без ошибок`);
}

// 1. @if
await showSolution();
expect((await title()) === '@if', 'шаг 1 открыт');
expect((await texts('.stock'))[0] === 'В наличии', 'шаг 1: «В наличии» у «Острова сокровищ»');
expect((await count('.in-cart')) === 0 && (await count('.mini-cart')) === 0, 'шаг 1: «Уже в корзине» и мини-корзины нет в DOM');
await click('.actions .button');
expect((await count('.in-cart')) === 1 && (await count('.mini-cart')) === 1, 'шаг 1: после добавления оба блока появились');
await click('button[aria-label="Следующая игра"]', 3);
expect((await texts('.stock'))[0] === 'Осталось 3 шт.', 'шаг 1: «Ночной экспресс» — «Осталось 3 шт.»');
await click('button[aria-label="Следующая игра"]', 3);
expect((await texts('.stock'))[0] === 'Нет в наличии', 'шаг 1: «Маяк» — «Нет в наличии»');
await checkConsoleClean('шаг 1');

// 2. @for
await nextStep();
expect((await title()) === '@for', 'шаг 2 открыт кнопкой «Далее»');
await showSolution();
expect((await count('.tile')) === 12, 'шаг 2: 12 плиток');
await addTile('Ночной экспресс', 3);
let t = await tile('Ночной экспресс');
expect(t.text.includes('В корзине: 3 шт.') && t.disabled, 'шаг 2: три «Ночных экспресса» — кнопка погасла');
expect((await tile('Маяк')).disabled, 'шаг 2: у «Маяка» кнопка неактивна');
expect((await header()) === 'В корзине: 3 · 9570 ₽', 'шаг 2: шапка');
await checkConsoleClean('шаг 2');

// 3. Переменные @for
await nextStep();
await showSolution();
await addTile('Остров сокровищ', 2);
await addTile('Ночной экспресс');
let rows = await texts('.cart-row-title');
expect(rows.join('|') === '1. Остров сокровищ|2. Ночной экспресс', `шаг 3: нумерация ${rows.join('|')}`);
expect((await texts('.cart-row-sum')).join('|') === '3980 ₽|3190 ₽', 'шаг 3: суммы строк');
const zebra = () =>
  frame().$$eval('.cart-row', (els) => els.map((e) => [e.classList.contains('even'), e.matches('.cart-row:nth-of-type(odd)')]));
expect(JSON.stringify(await zebra()) === '[[true,true],[false,false]]', 'шаг 3: $even совпадает с :nth-of-type(odd)');
expect(
  await frame().$eval('.cart-row:nth-of-type(2) button[aria-label="Убрать одну"]', (e) => e.disabled),
  'шаг 3: «−» неактивна на 1',
);
await click('.cart-row:nth-of-type(2) button[aria-label="Добавить ещё"]', 2);
expect(
  await frame().$eval('.cart-row:nth-of-type(2) button[aria-label="Добавить ещё"]', (e) => e.disabled),
  'шаг 3: «+» гаснет на складе 3',
);
await click('.cart-row button[aria-label="Убрать из корзины"]');
rows = await texts('.cart-row-title');
expect(rows.join('|') === '1. Ночной экспресс' && JSON.stringify(await zebra()) === '[[true,true]]', 'шаг 3: после «×» перенумерация и «зебра»');
await checkConsoleClean('шаг 3');

// 4. @empty
await nextStep();
await showSolution();
await type('шах');
expect((await texts('.tile-title')).join('|') === 'Шахматы «Классика»', 'шаг 4: «шах» — одна плитка');
await type('классика');
expect((await count('.tile')) === 3, 'шаг 4: «классика» — три игры по тегу');
await type('монополия');
expect((await appText()).includes('Ничего не найдено по запросу «монополия»'), 'шаг 4: @empty');
await type('');
expect((await count('.tile')) === 12, 'шаг 4: пустой запрос — все игры');
await checkConsoleClean('шаг 4');

// 5. @switch
await nextStep();
await showSolution();
const badges = await texts('.category');
expect(
  badges[0] === 'Семейная' && badges[2] === 'Стратегия' && badges[4] === 'Детская' && badges[6] === 'Кооперативная',
  `шаг 5: бейджи ${badges.slice(0, 7).join(', ')}`,
);
await checkConsoleClean('шаг 5');

// 6. ng-container и ng-template (без решения): старт — решение шага 5
await nextStep();
expect((await title()) === 'ng-container и ng-template', 'шаг 6 открыт');
expect((await count('.category')) === 12, 'шаг 6: старт — решение шага 5');

// 7. Практикум
await nextStep();
expect((await title()) === 'Практикум: витрина', 'шаг 7 открыт');
await showSolution();
await click('.filters input');
expect((await count('.tile')) === 11 && !(await appText()).includes('Маяк'), 'шаг 7: «Только в наличии» — 11 плиток');
await click('.filters input');
await frame().select('.filters select', 'cheap');
await wait(300);
let titles = await texts('.tile-title');
expect(titles[0] === 'Тихая охота' && titles.at(-1) === 'Го', `шаг 7: дешёвые — ${titles[0]} … ${titles.at(-1)}`);
await frame().select('.filters select', 'rating');
await wait(300);
expect((await texts('.tile-title'))[0] === 'Шахматы «Классика»', 'шаг 7: по рейтингу — шахматы первые');
await frame().select('.filters select', 'default');
await wait(300);
expect((await texts('.tile-title'))[0] === 'Остров сокровищ', 'шаг 7: по умолчанию — исходный порядок');
await addTile('Остров сокровищ');
await type('маяк');
await click('.filters input');
expect((await appText()).includes('Ничего не найдено'), 'шаг 7: «маяк» + только в наличии — пусто');
await frame().select('.filters select', 'expensive');
await wait(200);
await click('.empty .link-button');
const state = await frame().evaluate(() => ({
  query: document.querySelector('.search').value,
  checked: document.querySelector('.filters input').checked,
  sort: document.querySelector('.filters select').value,
}));
expect(
  (await count('.tile')) === 12 && state.query === '' && !state.checked && state.sort === 'default',
  `шаг 7: «Сбросить фильтры» сбрасывает и экран ${JSON.stringify(state)}`,
);
expect((await header()) === 'В корзине: 1 · 1990 ₽', 'шаг 7: корзина не тронута фильтрами');
await checkConsoleClean('шаг 7');
await page.screenshot({ path: `${OUT}/ch04-practice.png` });

// 8. Под капотом
await nextStep();
expect((await title()) === 'Под капотом: как работает track', 'шаг 8 открыт');
expect((await count('.filters select')) === 1, 'шаг 8: старт — решение практикума');

// Эксперимент из текста шага 8: наблюдатель за DOM, сортировка с track game.id
const files = readDir(`${CONTENT}/04-control-flow/08-track/start`);
files['main.ts'] = files['main.ts']
  .replace("import { appConfig } from './app.config';\n", "import { appConfig } from './app.config';\nimport { watchCatalog } from './dom-watch';\n")
  .replace('bootstrapApplication(App, appConfig).catch', 'bootstrapApplication(App, appConfig)\n  .then(() => watchCatalog())\n  .catch');
await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
await page.evaluate((code) => localStorage.setItem('angular-course:v1', JSON.stringify({ steps: { 'control-flow/track': { code } } })), files);
await page.goto(`${BASE_URL}/control-flow/track`, { waitUntil: 'networkidle0' });
await wait(4000);
await frame().select('.filters select', 'cheap');
await wait(500);
expect(
  (await consoleText()).includes('Плитки: создано 0, перемещено 8, удалено 0; текстов переписано: 0'),
  'шаг 8: сортировка с track game.id — 8 перемещений, без пересоздания',
);

expect(pageErrors.length === 0, `ошибок страницы нет ${JSON.stringify(pageErrors)}`);
await browser.close();
console.log(failures.length ? `\nПровалено: ${failures.length}` : '\nВсё прошло');
process.exit(failures.length ? 1 : 0);
