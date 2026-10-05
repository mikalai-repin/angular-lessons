// Проверка главы 3 в интерфейсе платформы: проходит шаги кнопкой «Далее», в каждом нажимает «Решение»
// и проверяет приложение в превью — счётчик, переключатель, корзину, эффекты, консоль.
// В конце подкладывает в сохранённый прогресс код экспериментов: вывод сигналов в консоль и граф сигналов.
// node tools/e2e/checks/ch03-signals.mjs
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
await page.goto(`${BASE_URL}/signals/problem`, { waitUntil: 'networkidle0' });
await wait(3000);

// После перезапуска старый iframe может ещё числиться в списке — берём последний
const frame = () =>
  page
    .frames()
    .filter((f) => f.url().includes('/app'))
    .at(-1);
const appText = async () => (await frame().evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
const header = () => frame().$eval('.cart', (e) => e.textContent.trim());
const consoleText = () => page.$$eval('.console-line', (els) => els.map((e) => e.textContent ?? '').join('\n'));
const title = () => page.$eval('.lesson-title-row h1', (e) => e.textContent);
const click = async (selector, times = 1, ms = 200) => {
  for (let i = 0; i < times; i++) {
    await frame().click(selector);
    await wait(ms);
  }
};
const next = (times = 1) => click('button[aria-label="Следующая игра"]', times);
const add = () => click('.card .button, .actions .button');

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

// 1. Проблема: счётчик отстаёт на одно нажатие
await showSolution();
expect((await title()) === 'Проблема', 'шаг 1 открыт');
await click('.card .button', 1, 1000);
expect((await header()) === 'В корзине: 0', 'шаг 1: через секунду после клика в шапке всё ещё 0');
expect((await consoleText()).includes('В корзине: 1'), 'шаг 1: в консоли «В корзине: 1»');
await click('.card .button', 1, 100);
expect((await header()) === 'В корзине: 1', 'шаг 1: второй клик показывает 1');
await checkConsoleClean('шаг 1');

// 2. signal: счётчик обновляется сразу
await nextStep();
expect((await title()) === 'signal', 'шаг 2 открыт кнопкой «Далее»');
await showSolution();
await click('.card .button', 2);
expect((await header()) === 'В корзине: 2', 'шаг 2: счётчик-сигнал');
await checkConsoleClean('шаг 2');

// 3. computed: переключатель игр
await nextStep();
await showSolution();
await next();
let text = await appText();
expect(text.includes('2 из 12') && text.includes('Драконья почта'), 'шаг 3: «›» показывает вторую игру');
await next(5);
expect(
  (await frame().$eval('.card', (e) => e.classList.contains('sold-out'))) &&
    (await frame().$eval('.card .button', (e) => e.disabled)),
  'шаг 3: седьмая игра («Маяк») — sold-out и неактивная кнопка',
);
await click('button[aria-label="Предыдущая игра"]', 7);
expect((await appText()).includes('12 из 12'), 'шаг 3: «‹» с первой игры переходит к последней');
await checkConsoleClean('шаг 3');

// 4. Неизменяемые данные: корзина из позиций
await nextStep();
await showSolution();
expect(await frame().$eval('.mini-cart', (e) => e.hidden), 'шаг 4: пустая мини-корзина скрыта');
await add();
await add();
await next();
await add();
expect((await header()) === 'В корзине: 3 · 5270 ₽', `шаг 4: шапка «${await header()}»`);
expect((await appText()).includes('Остров сокровищ × 2, Драконья почта × 1'), 'шаг 4: список позиций в мини-корзине');
await checkConsoleClean('шаг 4');

// 5. effect: строка в консоли на каждое изменение корзины, смена игры — без строк
await nextStep();
await showSolution();
expect((await consoleText()).includes('Корзина: пусто'), 'шаг 5: эффект выполнился при запуске');
await next(2);
await add();
text = await consoleText();
expect((text.match(/Корзина:/g) ?? []).length === 2, 'шаг 5: смена игры не запускает эффект, добавление — запускает');
expect(text.includes('Корзина: Зельевары × 1'), 'шаг 5: эффект видит новый список');
await checkConsoleClean('шаг 5');

// 6. untracked: название игры в сообщении, но смена игры эффект не запускает
await nextStep();
await showSolution();
await next(2);
await add();
await next();
text = await consoleText();
expect((text.match(/Корзина:/g) ?? []).length === 2, 'шаг 6: смена игры не запускает эффект');
expect(
  text.includes('Корзина: Зельевары × 1 (на экране — Зельевары)'),
  'шаг 6: название открытой игры через untracked',
);
await checkConsoleClean('шаг 6');

// 7. linkedSignal: количество сбрасывается при смене игры, ограничено складом
const quantity = () => frame().$eval('.quantity span', (e) => e.textContent.trim());
await nextStep();
await showSolution();
await click('button[aria-label="Больше"]', 2);
expect((await quantity()) === '3', 'шаг 7: «+» дважды — 3');
await add();
expect((await header()) === 'В корзине: 3 · 5970 ₽', 'шаг 7: добавлено 3 штуки');
await next();
expect((await quantity()) === '1', 'шаг 7: при смене игры количество сброшено до 1');
await next(2);
await click('button[aria-label="Больше"]', 4);
expect((await quantity()) === '3', 'шаг 7: «Ночной экспресс» — не больше 3 (склад)');
await next(3);
expect((await quantity()) === '0', 'шаг 7: у «Маяка» количество 0');
await checkConsoleClean('шаг 7');

// 8. Практикум: мини-корзина
await nextStep();
expect((await title()) === 'Практикум: мини-корзина', 'шаг 8 открыт');
await showSolution();
await add();
text = await appText();
expect((await header()) === 'В корзине: 1 · 1990 ₽', 'шаг 8: одна игра в шапке');
expect(text.includes('Итого: 1990 ₽') && text.includes('До бесплатной доставки: 3010 ₽'), 'шаг 8: итог и доставка');
expect(text.includes('Уже в корзине: 1 шт.'), 'шаг 8: «Уже в корзине» у открытой игры');
await click('button[aria-label="Больше"]');
await add();
text = await appText();
expect(text.includes('Итого: 5970 ₽') && text.includes('Доставка бесплатная'), 'шаг 8: бесплатная доставка от 5000 ₽');
await next(3);
await click('button[aria-label="Больше"]', 4);
await add();
text = await appText();
expect(
  (await quantity()) === '0' &&
    (await frame().$eval('.actions .button', (e) => e.disabled)) &&
    text.includes('Уже в корзине: 3 шт.'),
  'шаг 8: «Ночной экспресс» — весь склад в корзине, добавлять больше нельзя',
);
await page.screenshot({ path: `${OUT}/ch03-practice.png` });
await click('.in-cart .link-button');
expect((await quantity()) === '1' && !(await appText()).includes('Ночной экспресс ×'), 'шаг 8: «Убрать»');
await click('.mini-cart .link-button');
expect(
  (await header()) === 'В корзине: 0 · 0 ₽' && (await frame().$eval('.mini-cart', (e) => e.hidden)),
  'шаг 8: «Очистить корзину»',
);
await checkConsoleClean('шаг 8');

// 9. Под капотом: старт — решение практикума
await nextStep();
expect((await title()) === 'Под капотом: граф сигналов', 'шаг 9 открыт');
expect((await appText()).includes('1 из 12'), 'шаг 9: старт — решение практикума');

// Эксперименты: код подкладываем в сохранённый прогресс, как его сохранил бы редактор
async function runWithCode(stepKey, files) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
  await page.evaluate(
    (key, code) => localStorage.setItem('angular-course:v1', JSON.stringify({ steps: { [key]: { code } } })),
    stepKey,
    files,
  );
  await page.goto(`${BASE_URL}/${stepKey}`, { waitUntil: 'networkidle0' });
  await wait(4000);
  return consoleText();
}

// Консоль платформы показывает тип и значение сигнала, не вызывая его
let files = readDir(`${CONTENT}/03-signals/07-linked-signal/solution`);
files['app.ts'] = files['app.ts'].replace(
  '  constructor() {\n',
  '  constructor() {\n    console.log(this.cart, this.cartTotal, this.quantity);\n',
);
text = await runWithCode('signals/linked-signal', files);
expect(
  text.includes('signal([]) computed(ещё не вычислен) linkedSignal(ещё не вычислен)'),
  'консоль: signal([]), computed и linkedSignal до первого чтения',
);

// Граф сигналов из текста шага 9
files = readDir(`${CONTENT}/03-signals/09-signal-graph/start`);
files['main.ts'] = files['main.ts']
  .replace(
    "import { appConfig } from './app.config';\n",
    "import { appConfig } from './app.config';\nimport { printSignalGraph } from './signal-graph';\n",
  )
  .replace(
    'bootstrapApplication(App, appConfig).catch',
    'bootstrapApplication(App, appConfig)\n  .then((appRef) => printSignalGraph(appRef.components[0].instance))\n  .catch',
  );
text = await runWithCode('signals/signal-graph', files);
for (const line of [
  'gameIndex (signal): читает —; его читают шаблон, game',
  'game (computed): читает gameIndex; его читают soldOut, шаблон, discount, quantity, available',
  'quantity (linkedSignal): читает game, inCart; его читают шаблон',
  'inCart (computed): читает cart; его читают quantity, available, шаблон',
  'cartSummary (computed): читает cart; его читают эффект, шаблон',
  'deliveryLeft (computed): читает cartTotal; его читают шаблон',
]) {
  expect(text.includes(line), `шаг 9: «${line}»`);
}

expect(pageErrors.length === 0, `ошибок страницы нет ${JSON.stringify(pageErrors)}`);
await browser.close();
console.log(failures.length ? `\nПровалено: ${failures.length}` : '\nВсё прошло');
process.exit(failures.length ? 1 : 0);
