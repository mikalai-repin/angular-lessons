// Проверка главы 7 в интерфейсе платформы: проходит шаги кнопкой «Далее», в каждом нажимает «Решение»
// и проверяет приложение в превью — цены и проценты по локали ru, таймер через date, пайпы price/players/duration,
// подпись звёзд, подсказки Tooltip (наведение, уход, уничтожение хоста), InView в LoadMore и ленивые обложки.
// node tools/e2e/checks/ch07-directives-pipes.mjs
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
await page.goto(`${BASE_URL}/directives-pipes/builtin-pipes`, { waitUntil: 'networkidle0' });
await wait(3000);

// После перезапуска старый iframe может ещё числиться в списке — берём последний
const frame = () => page.frames().filter((f) => f.url().includes('/app')).at(-1);
const consoleText = () => page.$$eval('.console-line', (els) => els.map((e) => e.textContent ?? '').join('\n'));
const title = () => page.$eval('.lesson-title-row h1', (e) => e.textContent);
const count = (selector) => frame().$$eval(selector, (els) => els.length);
// Текст без неразрывных пробелов и лишних переводов строк: «1 990 ₽» пайпы пишут через U+00A0
const text = (selector) =>
  frame().$eval(selector, (e) => e.textContent.replace(/\u00a0|\u202f/g, ' ').replace(/\s+/g, ' ').trim());
const card = (name) =>
  frame().evaluateHandle(
    (name) => [...document.querySelectorAll('app-game-card')].find((c) => c.textContent.includes(name)),
    name,
  );
const cardText = async (name, selector) =>
  (await card(name)).evaluate(
    (c, selector) => c.querySelector(selector)?.textContent.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim() ?? null,
    selector,
  );
const openGame = async (name) => {
  const button = await frame().evaluateHandle(
    (name) => [...document.querySelectorAll('.title-button')].find((b) => b.textContent.includes(name)),
    name,
  );
  await button.click();
  await wait(500);
};
const tooltips = () =>
  frame().evaluate(() =>
    [...document.querySelectorAll('.tooltip')].map((t) => {
      const r = t.getBoundingClientRect();
      return { text: t.textContent, inside: r.left >= 0 && r.right <= document.documentElement.clientWidth };
    }),
  );

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
  const log = await consoleText();
  expect(!/ERROR|NG0\d+|Error:|Cannot find/.test(log), `${step}: консоль без ошибок`);
}

// 1. Встроенные пайпы
expect((await title()) === 'Встроенные пайпы', 'шаг 1 открыт');
expect((await cardText('Остров', '.price')) === '1990 ₽ 2490 ₽', 'шаг 1: в старте цены без разрядов');
await showSolution();
expect((await cardText('Остров', '.price')) === '1 990 ₽ 2 490 ₽', 'шаг 1: currency — «1 990 ₽ 2 490 ₽»');
const stickers = await frame().$$eval('.sticker.sale', (els) => els.map((e) => e.textContent.replace(/\u00a0/g, ' ').trim()));
expect(stickers.join() === '−20 %,−11 %', `шаг 1: percent на стикерах первых шести карточек (${stickers})`);
await openGame('Остров');
const t1 = await text('app-countdown');
await wait(1200);
const t2 = await text('app-countdown');
expect(/^Скидка действует ещё \d\d:\d\d:\d\d$/.test(t1) && t1 !== t2, `шаг 1: date в таймере, время идёт (${t1} → ${t2})`);
await page.keyboard.press('Escape');
await wait(300);
await checkConsoleClean('шаг 1');

// 2. Свой пайп
await nextStep();
expect((await title()) === 'Свой пайп', 'шаг 2 открыт');
await showSolution();
for (const name of ['Остров', 'Остров', 'Ночной']) {
  await (await card(name)).evaluate((c) => c.querySelector('.button').click());
  await wait(200);
}
expect((await text('.cart')) === 'В корзине: 3 · 7 170 ₽', 'шаг 2: шапка «В корзине: 3 · 7 170 ₽»');
const rows = await frame().$$eval('.cart-row-sum', (els) => els.map((e) => e.textContent.replace(/\u00a0/g, ' ').trim()));
expect(rows.join() === '3 980 ₽,3 190 ₽', `шаг 2: строки корзины (${rows})`);
expect((await text('.mini-cart b')) === 'Итого: 7 170 ₽', 'шаг 2: итог');
expect((await text('.mini-cart .muted')) === 'Доставка бесплатная', 'шаг 2: доставка');
const aria = await frame().$eval('app-game-card app-rating', (e) => e.getAttribute('aria-label'));
expect(aria === 'Рейтинг 4,6 из 5', `шаг 2: подпись звёзд по локали (${aria})`);
await openGame('Остров');
expect((await text('app-game-details .price')) === '1 990 ₽ 2 490 ₽', 'шаг 2: цены в окне');
await page.keyboard.press('Escape');
await wait(300);
await checkConsoleClean('шаг 2');

// 3. Параметры пайпа
await nextStep();
expect((await title()) === 'Параметры пайпа', 'шаг 3 открыт');
await showSolution();
// Точку между частями рисует CSS (::after у всех span, кроме последнего) — собираем строку так же
const metas = await frame().$$eval('.meta', (els) =>
  els.map((e) =>
    [...e.querySelectorAll('span')]
      .map((s) => s.textContent.trim() + getComputedStyle(s, '::after').content.replace(/^none$|"/g, ''))
      .join(' '),
  ),
);
expect(
  metas.slice(0, 4).join(' | ') === '2–5 игроков · 45 мин | 2–4 игрока · 30 мин | 1–4 игрока · 1 ч | 2–5 игроков · 1 ч 30 мин',
  `шаг 3: строка характеристик в карточках (${metas.slice(0, 4).join(' | ')})`,
);
await frame().click('app-load-more button');
await wait(400);
const specs = async (name) => {
  await openGame(name);
  await frame().evaluate(() => document.querySelectorAll('.tab')[1].click());
  await wait(300);
  const s = await frame().$eval('app-game-details .specs', (e) => e.innerText.replace(/\s+/g, ' ').trim());
  await page.keyboard.press('Escape');
  await wait(300);
  return s;
};
const castle = await specs('Строители');
expect(castle.startsWith('Игроки 2–4 игрока Партия 1 час 10 минут'), `шаг 3: «Строители замков» (${castle})`);
const chess = await specs('Шахматы');
expect(chess.startsWith('Игроки 2 игрока Партия 1 час'), `шаг 3: «Шахматы» (${chess})`);
await checkConsoleClean('шаг 3');

// 4. Чистые и нечистые (без решения): приложение работает
await nextStep();
expect((await title()) === 'Чистые и нечистые пайпы', 'шаг 4 открыт');
expect((await count('.meta')) === 6, 'шаг 4: каталог на месте');
await checkConsoleClean('шаг 4');

// 5. Директива атрибута
await nextStep();
expect((await title()) === 'Директива атрибута', 'шаг 5 открыт');
await showSolution();
await (await frame().$('.sticker.sale')).hover();
await wait(200);
let tips = await tooltips();
expect(tips.length === 1 && tips[0].text === 'Цена действует до конца дня' && tips[0].inside, `шаг 5: подсказка у стикера скидки (${JSON.stringify(tips)})`);
await page.screenshot({ path: `${OUT}/ch07-tooltip.png` });
await (await frame().$('app-game-card:nth-of-type(3) app-rating')).hover();
await wait(200);
tips = await tooltips();
expect(tips.length === 1 && tips[0].text === 'Рейтинг 4,7' && tips[0].inside, `шаг 5: подсказка у звёзд, прежняя убрана (${JSON.stringify(tips)})`);
const hit = await frame().evaluateHandle(() => [...document.querySelectorAll('.sticker')].find((s) => s.textContent.trim() === 'Хит'));
await hit.hover();
await wait(200);
tips = await tooltips();
expect(tips.length === 1 && tips[0].text === 'Рейтинг 4,8 и выше', `шаг 5: подсказка «Хит» (${JSON.stringify(tips)})`);
await page.mouse.move(5, 5);
await wait(200);
expect((await tooltips()).length === 0, 'шаг 5: мышь ушла — подсказки нет');
await (await frame().$('app-game-card app-rating')).hover();
await wait(200);
const before = (await tooltips()).length;
await frame().evaluate(() => {
  const input = document.querySelector('.search');
  input.value = 'zzz';
  input.dispatchEvent(new Event('input'));
});
await wait(300);
expect(before === 1 && (await tooltips()).length === 0, 'шаг 5: карточку убрал поиск — подсказка исчезла вместе с ней');
await checkConsoleClean('шаг 5');

// 6. Композиция директив
await nextStep();
expect((await title()) === 'Композиция директив', 'шаг 6 открыт');
await showSolution();
expect((await count('app-game-card')) === 6, 'шаг 6: первая порция');
await frame().evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await wait(600);
expect((await count('app-game-card')) === 12 && (await count('app-load-more')) === 0, 'шаг 6: InView в LoadMore — прокрутка показала все 12');
await frame().evaluate(() => window.scrollTo(0, 0));
await wait(300);
await frame().type('.search', 'а');
await wait(400);
await frame().click('app-load-more button');
await wait(400);
expect((await count('app-game-card')) === 11, 'шаг 6: щелчок «Показать ещё» работает');
await checkConsoleClean('шаг 6');

// 7. Практикум: ленивая картинка
await nextStep();
expect((await title()) === 'Практикум: ленивая картинка', 'шаг 7 открыт');
await showSolution();
await wait(600);
const covers = () =>
  frame().$$eval('app-game-card img.cover', (imgs) =>
    imgs.map((i) => ({
      src: i.hasAttribute('src'),
      loaded: i.classList.contains('loaded'),
      lazy: i.classList.contains('lazy'),
      below: i.getBoundingClientRect().top > window.innerHeight,
      opacity: getComputedStyle(i).opacity,
    })),
  );
let c = await covers();
expect(c.length === 6 && c.every((i) => i.lazy && (i.src ? i.loaded : i.below)), 'шаг 7: обложки на экране загружены, остальные без src');
await frame().click('app-load-more button');
await wait(600);
c = await covers();
const waiting = c.filter((i) => !i.src);
expect(c.length === 12 && waiting.length > 0 && waiting.every((i) => i.below), `шаг 7: после «Показать ещё» ниже экрана — без src (${waiting.length})`);
await frame().evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await wait(900);
c = await covers();
expect(c.every((i) => i.src && i.loaded), 'шаг 7: прокрутка — все обложки загружены и проявились');
const lighthouse = await (await card('Маяк')).evaluate((e) => getComputedStyle(e.querySelector('img')).opacity);
expect(lighthouse === '0.6', `шаг 7: обложка «Маяка» по-прежнему полупрозрачная (${lighthouse})`);
await checkConsoleClean('шаг 7');

// 8. Под капотом (без решения)
await nextStep();
expect((await title()) === 'Под капотом: директивы и компоненты', 'шаг 8 открыт');
const dirs = await frame().evaluate(() => {
  const names = (el) => window.ng.getDirectives(el).map((d) => d.constructor.name).join();
  return [
    names(document.querySelector('app-game-card img')),
    names(document.querySelector('app-game-card app-rating')),
    names(document.querySelector('app-load-more')),
  ];
});
expect(dirs.join(' | ') === 'InView,LazyImage | Tooltip | InView', `шаг 8: ng.getDirectives (${dirs.join(' | ')})`);
await checkConsoleClean('шаг 8');

expect(pageErrors.length === 0, `ошибок страницы нет ${JSON.stringify(pageErrors)}`);
await browser.close();
console.log(failures.length ? `\nПровалено: ${failures.length}` : '\nВсё прошло');
process.exit(failures.length ? 1 : 0);
