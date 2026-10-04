// Проверка главы 2 в интерфейсе платформы: проходит шаги кнопкой «Далее», в каждом нажимает «Решение»
// и проверяет приложение в превью — текст, атрибуты, поиск, клики, консоль.
// node tools/e2e/checks/ch02-templates.mjs
import { BASE_URL, launch, OUT, wait } from '../lib.mjs';

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
await page.goto(`${BASE_URL}/templates/interpolation`, { waitUntil: 'networkidle0' });
await wait(3000);

// После перезапуска старый iframe может ещё числиться в списке — берём последний
const frame = () => page.frames().filter((f) => f.url().includes('/app')).at(-1);
const appText = () => frame().evaluate(() => document.body.innerText);
const consoleText = () => page.$$eval('.console-line', (els) => els.map((e) => e.textContent ?? '').join('\n'));
const title = () => page.$eval('.lesson-title-row h1', (e) => e.textContent);

async function showSolution() {
  const button = await page.$('.lesson-footer-middle .button');
  if (button && (await button.evaluate((e) => e.textContent)) === 'Решение') {
    await button.click();
    await wait(3500);
  }
}

async function next() {
  await page.click('.lesson-footer .button.primary');
  await wait(3500);
}

async function checkConsoleClean(step) {
  const text = await consoleText();
  expect(!/ERROR|NG0\d+|Error:/.test(text), `${step}: консоль без ошибок`);
}

// 1. Интерполяция
await showSolution();
expect((await title()) === 'Интерполяция', 'шаг 1 открыт');
let text = await appText();
expect(text.includes('Остров сокровищ') && text.includes('1990 ₽'), 'шаг 1: название и цена из класса');
await checkConsoleClean('шаг 1');

// 2. Привязка свойств
await next();
expect((await title()) === 'Привязка свойств', 'шаг 2 открыт кнопкой «Далее»');
await showSolution();
const img = await frame().$eval('.cover', (e) => ({ src: e.getAttribute('src'), alt: e.alt }));
expect(img.src === '/assets/covers/treasure-island.svg' && img.alt === 'Остров сокровищ', `шаг 2: [src] и [alt] ${JSON.stringify(img)}`);
expect(!(await frame().$eval('.card button', (e) => e.disabled)), 'шаг 2: кнопка активна при inStock = 12');
await checkConsoleClean('шаг 2');

// 3. Атрибуты, классы, стили
await next();
await showSolution();
const rating = await frame().$eval('.rating', (e) => ({
  label: e.getAttribute('aria-label'),
  width: e.querySelector('.stars').style.width,
}));
expect(rating.label === 'Рейтинг: 4.6 из 5' && rating.width === '92%', `шаг 3: aria-label и ширина звёзд ${JSON.stringify(rating)}`);
expect(!(await frame().$eval('.card', (e) => e.classList.contains('sold-out'))), 'шаг 3: нет класса sold-out при inStock = 12');
await checkConsoleClean('шаг 3');

// 4. События
await next();
await showSolution();
await frame().click('.card button');
await frame().type('.search', 'шахматы');
await frame().focus('.search');
await page.keyboard.press('Enter');
await wait(500);
text = await consoleText();
expect(text.includes('Добавлено в корзину: Остров сокровищ'), 'шаг 4: (click) пишет в консоль');
expect(text.includes('Ищем: шахматы'), 'шаг 4: (keydown.enter) и $event');
expect((text.match(/Ищем:/g) ?? []).length === 1, 'шаг 4: обработчик срабатывает только на Enter');

// 5. Ссылки на элементы: абзац обновляется только после событий с обработчиком
await next();
await showSolution();
expect(!(await appText()).includes('Ищем:'), 'шаг 5: абзац «Ищем» скрыт, пока поле пустое');
await frame().type('.search', 'шах');
await page.keyboard.press('Enter');
await wait(300);
expect((await appText()).includes('Ищем: «шах»'), 'шаг 5: после Enter — «Ищем: «шах»»');
await frame().type('.search', 'маты');
await wait(300);
expect((await appText()).includes('Ищем: «шах»'), 'шаг 5: при наборе без Enter абзац не меняется');
await frame().click('.card button');
await wait(300);
expect((await appText()).includes('Ищем: «шахматы»'), 'шаг 5: клик по «В корзину» перепроверил шаблон');

// 6. @let
await next();
await showSolution();
text = await appText();
expect(text.includes('2490 ₽') && text.includes('−20 %'), 'шаг 6: старая цена и скидка через @let');
await checkConsoleClean('шаг 6');

// 7. Безопасность
await next();
await showSolution();
const bold = await frame().$eval('.description b', (e) => e.textContent).catch(() => null);
expect(bold === 'меняется каждую партию', 'шаг 7: [innerHTML] выводит разметку');
await checkConsoleClean('шаг 7');

// 8. Практикум
await next();
expect((await title()) === 'Практикум: карточка игры', 'шаг 8 открыт');
await showSolution();
text = await appText();
expect(text.includes('Игроков: 2–5 · 45 мин · 8+') && text.includes('−20 %'), 'шаг 8: карточка из объекта game');
await frame().click('.card button');
await wait(300);
expect((await consoleText()).includes('Добавлено в корзину: Остров сокровищ'), 'шаг 8: addToCart берёт название из game');
await checkConsoleClean('шаг 8');
await page.screenshot({ path: `${OUT}/ch02-practice.png` });

// 9. Под капотом: старт — решение практикума
await next();
expect((await title()) === 'Под капотом: контекст шаблона', 'шаг 9 открыт');
expect((await appText()).includes('Игроков: 2–5'), 'шаг 9: старт — решение практикума');

expect(pageErrors.length === 0, `ошибок страницы нет ${JSON.stringify(pageErrors)}`);
await browser.close();
console.log(failures.length ? `\nПровалено: ${failures.length}` : '\nВсё прошло');
process.exit(failures.length ? 1 : 0);
