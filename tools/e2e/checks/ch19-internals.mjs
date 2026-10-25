// Проверка главы 19 в интерфейсе платформы: проходит шаги кнопкой «Далее», в каждом нажимает «Решение»
// и проверяет инструменты главы — вкладки «Шаблон» и «Дерево», журнал представлений по Alt + щелчку,
// журнал проверок с причинами, магазин на zone.js, лабораторию сигналов на примитивах.
// Проверка практикума (check.ts) — в checks/step-checks.mjs 19-internals.
// node tools/e2e/checks/ch19-internals.mjs
import { clean, openCourse, wait } from '../lib.mjs';

const { page, expect, frame, consoleText, title, showSolution, nextStep, checkConsoleClean, finish } =
  await openCourse('/internals/template-code');

// Превью шага со своим стартом появляется не сразу — ждём кадр с карточками
const ready = async () => {
  const count = async () =>
    (
      await frame()
        ?.$$('app-game-card')
        .catch(() => [])
    )?.length ?? 0;
  for (let i = 0; i < 30 && (await count()) < 4; i++) await wait(300);
};
const panel = async (name) => {
  await page.$$eval('.panel-tab', (els, n) => els.find((e) => e.textContent?.startsWith(n))?.click(), name);
  await wait(800);
};
const consoleHas = async (part) => clean(await consoleText()).includes(part);
// Alt + щелчок по названию карточки номер i — журнал представлений
const altClickTitle = async (i) => {
  const links = await frame().$$('app-game-card h2 a');
  await page.keyboard.down('Alt');
  await links[i].click();
  await page.keyboard.up('Alt');
  await wait(400);
};
const firstCardButton = async (selector) => (await frame().$$(`app-game-card ${selector}`))[0];

// 19.1 Код шаблона: вкладка «Шаблон» показывает весь код JIT для GameCard, «Дерево» — карточки с полями
expect((await title()) === 'Код шаблона', `шаг 1: ${await title()}`);
await ready();
await panel('Шаблон');
await page.select('.inspector-select', 'GameCard');
await wait(2500);
const code = await page.$eval('.console-body', (e) => e.textContent ?? '');
expect(
  code.includes('GameCard_Conditional_27_Template') && code.includes('pureFunction1') && code.includes('decls: 36'),
  '«Шаблон»: функции встроенных шаблонов, pureFunction1 и decls у GameCard',
);
await page.select('.inspector-select', 'Rating');
await wait(2000);
expect(
  (await page.$eval('.console-body', (e) => e.textContent ?? '')).includes('domElementStart'),
  '«Шаблон»: у Rating — режим DomOnly (domElementStart)',
);
await panel('Дерево');
const rows = await page.$$eval('.tree-row .tree-name', (els) => els.map((e) => e.textContent));
expect(rows.filter((r) => r === 'GameCard').length >= 4, `«Дерево»: карточки на главной (${rows.length} строк)`);
await panel('Консоль');
await checkConsoleClean('шаг 1');

// 19.2 Представления: Alt + щелчок печатает LView карточки; «В корзину» меняет одну ячейку привязок
await nextStep();
expect((await title()) === 'Представления: LView и TView', `шаг 2: ${await title()}`);
await showSolution();
await ready();
await altClickTitle(0);
expect(
  await consoleHas('узел 11 шаблона GameCard (компонент), ячейка 39 его LView'),
  'журнал: узел и ячейка заголовка карточки',
);
expect(await consoleHas('общий для 12 таких представлений'), 'журнал: TView общий для 12 карточек');
expect(await consoleHas('81: -1'), 'журнал: ветка «В корзине» не выбрана (81: -1)');
await (await firstCardButton('.actions .button')).click();
await wait(800);
await altClickTitle(0);
expect(await consoleHas('81: 35'), 'после «В корзину» ячейка 81 — ветка 35');
expect((await frame().evaluate(() => location.pathname)) === '/app/', 'Alt + щелчок не переходит по ссылке');
await checkConsoleClean('шаг 2');

// 19.3 Журнал проверок: сердечко — RefreshView от события по пути, шапка — по сигналу
await nextStep();
expect((await title()) === 'Обнаружение изменений изнутри', `шаг 3: ${await title()}`);
await showSolution();
await ready();
await (await firstCardButton('.favorite')).click();
await wait(800);
expect(
  await consoleHas(
    'Проверка [событие, сигнал]: App (RefreshView), Home (RefreshView), GameCard (RefreshView), Header (сигнал)',
  ),
  'журнал проверок: сердечко',
);
await checkConsoleClean('шаг 3');

// 19.4 zone.js: зона загружена, проверки без сообщений планировщику
await nextStep();
expect((await title()) === 'zone.js', `шаг 4: ${await title()}`);
await showSolution();
await ready();
expect((await frame().evaluate(() => typeof window.Zone)) === 'function', 'zone.js загружен');
expect(await consoleHas('Проверка [—]: шаблоны не обновлялись'), 'журнал: проверки, запущенные зоной');
await checkConsoleClean('шаг 4');

// 19.5 Лаборатория: на старте watch пустой, в решении — версии как в тексте
await nextStep();
expect((await title()) === 'Сигналы изнутри', `шаг 5: ${await title()}`);
await ready();
expect(
  (await consoleHas('— Две записи подряд')) && !(await consoleHas('Итог 1990')),
  'старт: лаборатория печатает только заголовки',
);
expect((await frame().evaluate(() => typeof window.Zone)) === 'undefined', 'старт шага 5: магазин снова без zone.js');
await showSolution();
await ready();
expect(
  await consoleHas('Итог 5970; вычислений total: 2; версии: price 0, quantity 2, total 2'),
  'лаборатория: две записи — один запуск',
);
expect(
  await consoleHas('Вычислений total: 3; версии: price 1, quantity 3, total 2'),
  'лаборатория: тот же итог — версия прежняя',
);
await checkConsoleClean('шаг 5');

// 19.6 JIT и AOT — без кода
await nextStep();
expect((await title()) === 'JIT и AOT', `шаг 6: ${await title()}`);
await ready();
await checkConsoleClean('шаг 6');

// 19.7 Практикум: старт и решение запускаются без ошибок (check.ts — в step-checks)
await nextStep();
expect((await title()) === 'Практикум: лишние проверки', `шаг 7: ${await title()}`);
await ready();
// Таймер закладки срабатывает раз в секунду
await wait(1500);
expect(
  await consoleHas('Проверка [markForCheck]: App (RefreshView), Header (RefreshView)'),
  'старт практикума: проверки по таймеру',
);
await showSolution();
await ready();
await checkConsoleClean('шаг 7');

await finish();
