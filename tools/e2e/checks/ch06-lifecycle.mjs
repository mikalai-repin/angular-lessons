// Проверка главы 6 в интерфейсе платформы: проходит шаги кнопкой «Далее», в каждом нажимает «Решение»
// и проверяет приложение в превью — окно «Подробнее» (немодальное → модальное, Esc, возврат фокуса),
// фокус в поиске после сброса, таймер скидки, вкладки и полоску под ними, «Показать ещё» и журнал проверок.
// node tools/e2e/checks/ch06-lifecycle.mjs
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
await page.goto(`${BASE_URL}/lifecycle/lifecycle`, { waitUntil: 'networkidle0' });
await wait(3000);

// После перезапуска старый iframe может ещё числиться в списке — берём последний
const frame = () =>
  page
    .frames()
    .filter((f) => f.url().includes('/app'))
    .at(-1);
const consoleText = () => page.$$eval('.console-line', (els) => els.map((e) => e.textContent ?? '').join('\n'));
const title = () => page.$eval('.lesson-title-row h1', (e) => e.textContent);
const count = (selector) => frame().$$eval(selector, (els) => els.length);
// Настоящий щелчок по названию игры: кнопка получает фокус, как у покупателя
const openGame = async (name) => {
  const button = await frame().evaluateHandle(
    (name) => [...document.querySelectorAll('.title-button')].find((b) => b.textContent.includes(name)),
    name,
  );
  await button.click();
  await wait(500);
};
// Состояние окна «Подробнее»
const details = () =>
  frame().evaluate(() => {
    const d = document.querySelector('app-game-details dialog');
    const ink = document.querySelector('.ink');
    const active = document.querySelector('.tab.active');
    return {
      exists: !!d,
      open: d?.open,
      modal: d?.matches(':modal') ?? false,
      backdropDiv: !!document.querySelector('app-game-details .backdrop'),
      title: d?.querySelector('h2')?.textContent.trim(),
      countdown: document.querySelector('app-countdown')?.textContent.trim() ?? null,
      tabs: [...document.querySelectorAll('.tab')].map(
        (b) => b.textContent.trim() + (b.classList.contains('active') ? '*' : ''),
      ),
      visible: [...document.querySelectorAll('app-tab')]
        .filter((t) => !t.hidden)
        .map((t) => t.innerText.replace(/\s+/g, ' ').trim()),
      ink: ink ? { left: ink.style.left, width: ink.style.width } : null,
      activeTab: active ? { left: `${active.offsetLeft}px`, width: `${active.offsetWidth}px` } : null,
      focus: document.activeElement?.closest('dialog') ? 'dialog' : document.activeElement?.className,
    };
  });

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

// 1. Когда что происходит
expect((await title()) === 'Когда что происходит', 'шаг 1 открыт');
expect((await count('.title-button')) === 0, 'шаг 1: в старте название ещё не кнопка');
await showSolution();
await openGame('Остров');
let d = await details();
expect(
  d.exists && d.open && !d.modal && d.backdropDiv,
  'шаг 1: окно открыто атрибутом open, не модальное, с затемнением-div',
);
await page.keyboard.press('Escape');
await wait(300);
expect((await details()).exists, 'шаг 1: Esc немодальное окно не закрывает');
await frame().click('app-game-details .close');
await wait(300);
expect(!(await details()).exists, 'шаг 1: «×» закрывает окно — компонент уничтожен');
await checkConsoleClean('шаг 1');

// 2. Доступ к элементам
await nextStep();
expect((await title()) === 'Доступ к элементам', 'шаг 2 открыт');
await showSolution();
await frame().type('.search', 'zzz');
await wait(300);
await frame().click('.empty .link-button');
await wait(300);
const focus = await frame().evaluate(() => document.activeElement?.className);
expect(
  focus === 'search' && (await count('app-game-card')) === 12,
  `шаг 2: после «Сбросить фильтры» фокус в поиске (${focus})`,
);
await checkConsoleClean('шаг 2');

// 3. После отрисовки
await nextStep();
expect((await title()) === 'После отрисовки', 'шаг 3 открыт');
await showSolution();
await openGame('Остров');
d = await details();
expect(d.modal && !d.backdropDiv && d.focus === 'dialog', 'шаг 3: окно модальное (showModal), фокус внутри');
await page.keyboard.press('Escape');
await wait(400);
const back = await frame().evaluate(() => document.activeElement?.textContent.trim());
expect(
  !(await details()).exists && back === 'Остров сокровищ',
  `шаг 3: Esc закрывает окно, фокус вернулся на название (${back})`,
);
await checkConsoleClean('шаг 3');

// 4. Уборка
await nextStep();
expect((await title()) === 'Уборка', 'шаг 4 открыт');
await showSolution();
await openGame('Остров');
const first = (await details()).countdown;
await wait(1200);
const second = (await details()).countdown;
expect(
  /^Скидка действует ещё \d\d:\d\d:\d\d$/.test(first ?? '') && first !== second,
  `шаг 4: таймер идёт (${first} → ${second})`,
);
await page.keyboard.press('Escape');
await wait(300);
await openGame('Драконья');
expect((await details()).countdown === null, 'шаг 4: у игры без скидки таймера нет');
await page.keyboard.press('Escape');
await wait(300);
await checkConsoleClean('шаг 4');

// 5. Дочерние из проекции
await nextStep();
expect((await title()) === 'Дочерние из проекции', 'шаг 5 открыт');
await showSolution();
await openGame('Остров');
d = await details();
expect(
  d.tabs.join() === 'Описание*,Характеристики' && d.visible.length === 1 && d.visible[0].startsWith('Команды пиратов'),
  'шаг 5: две вкладки, видно описание',
);
await frame().evaluate(() => document.querySelectorAll('.tab')[1].click());
await wait(300);
d = await details();
expect(
  d.tabs.join() === 'Описание,Характеристики*' &&
    d.visible[0] === 'Игроков 2–5 Партия 45 мин Возраст от 8 лет Теги пираты, карты',
  `шаг 5: «Характеристики» (${d.visible[0]})`,
);
await page.keyboard.press('Escape');
await wait(300);
await openGame('Шахматы');
await frame().evaluate(() => document.querySelectorAll('.tab')[1].click());
await wait(300);
expect((await details()).visible[0].startsWith('Игроков 2 Партия'), 'шаг 5: у «Шахмат» игроков просто «2»');
await page.keyboard.press('Escape');
await wait(300);
await checkConsoleClean('шаг 5');

// 6. Замер после отрисовки
await nextStep();
expect((await title()) === 'Замер после отрисовки', 'шаг 6 открыт');
await showSolution();
await openGame('Остров');
d = await details();
expect(
  d.ink && d.ink.width !== '0px' && JSON.stringify(d.ink) === JSON.stringify(d.activeTab),
  `шаг 6: полоска под «Описанием» с первого открытия (${JSON.stringify(d.ink)})`,
);
await frame().evaluate(() => document.querySelectorAll('.tab')[1].click());
await wait(500);
d = await details();
expect(
  JSON.stringify(d.ink) === JSON.stringify(d.activeTab),
  `шаг 6: полоска переехала под «Характеристики» (${JSON.stringify(d.ink)})`,
);
await page.keyboard.press('Escape');
await wait(300);
await checkConsoleClean('шаг 6');

// 7. Классические хуки (без решения): приложение работает
await nextStep();
expect((await title()) === 'Классические хуки', 'шаг 7 открыт');
await openGame('Нарды');
expect((await details()).modal, 'шаг 7: окно открывается');
await page.keyboard.press('Escape');
await wait(300);
await checkConsoleClean('шаг 7');

// 8. Практикум
await nextStep();
expect((await title()) === 'Практикум: «Показать ещё»', 'шаг 8 открыт');
await showSolution();
const more = () => count('app-load-more');
expect((await count('app-game-card')) === 6 && (await more()) === 1, 'шаг 8: 6 карточек и «Показать ещё»');
await frame().evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await wait(600);
expect(
  (await count('app-game-card')) === 12 && (await more()) === 0,
  'шаг 8: прокрутка до кнопки — 12 карточек, кнопка исчезла',
);
await frame().evaluate(() => window.scrollTo(0, 0));
await wait(300);
await frame().type('.search', 'а');
await wait(400);
expect((await count('app-game-card')) === 6 && (await more()) === 1, 'шаг 8: поиск «а» — снова 6 и кнопка');
await frame().click('app-load-more button');
await wait(400);
expect(
  (await count('app-game-card')) === 11 && (await more()) === 0,
  'шаг 8: щелчок «Показать ещё» — все 11 найденных',
);
await frame().select('.filters select', 'cheap');
await wait(400);
expect((await count('app-game-card')) === 6, 'шаг 8: смена сортировки — первая порция');
await checkConsoleClean('шаг 8');
await page.screenshot({ path: `${OUT}/ch06-practice.png` });

// 9. Под капотом: журнал проверок
await nextStep();
expect((await title()) === 'Под капотом: обнаружение изменений', 'шаг 9 открыт');
await frame().evaluate(() =>
  [...document.querySelectorAll('app-game-card')]
    .find((c) => c.textContent.includes('Драконья'))
    .querySelector('.button')
    .click(),
);
await wait(500);
let log = await consoleText();
expect(
  log.includes('Проверены: App, Quantity, GameCard (из них созданы: Quantity)'),
  'шаг 9: «В корзину» — App, Quantity, одна GameCard',
);
await openGame('Остров');
await wait(2200);
// Одинаковые строки подряд консоль платформы сворачивает в одну со счётчиком повторов
const last = await page.$$eval('.console-line', (els) => {
  const line = els.at(-1);
  return { text: line.textContent, count: line.querySelector('.console-count')?.textContent ?? '1' };
});
expect(
  last.text.endsWith('Проверены: Countdown') && Number(last.count) >= 2,
  `шаг 9: каждую секунду проверяется только Countdown (×${last.count})`,
);
await page.keyboard.press('Escape');
await wait(300);
await checkConsoleClean('шаг 9');

expect(pageErrors.length === 0, `ошибок страницы нет ${JSON.stringify(pageErrors)}`);
await browser.close();
console.log(failures.length ? `\nПровалено: ${failures.length}` : '\nВсё прошло');
process.exit(failures.length ? 1 : 0);
