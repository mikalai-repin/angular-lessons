// Проверка главы 15 в интерфейсе платформы: проходит шаги кнопкой «Далее», в каждом нажимает «Решение»
// и проверяет в превью: анимации строк корзины (класс и функция), @defer у отзывов (порядок запросов,
// триггер on viewport, @error при «Ошибке 500», prefetch), NgOptimizedImage (priority у первых обложек),
// полёт обложки в корзину; консоль без ошибок на каждом шаге.
// node tools/e2e/checks/ch15-performance.mjs
import { openCourse, wait } from '../lib.mjs';

const { page, expect, frame, title, showSolution, nextStep, checkConsoleClean, finish } =
  await openCourse('/performance/enter-leave');

// Ввод адреса в адресной строке превью: приложение запускается заново с этого адреса
const go = async (url) => {
  await page.click('.address-input', { clickCount: 3 });
  await page.type('.address-input', `${url}\n`);
  await wait(2500);
};
const panel = (name) =>
  page.$$eval('.panel-tab', (tabs, n) => tabs.find((t) => t.textContent.includes(n)).click(), name);
const requests = () =>
  page.$$eval('.network-row', (rows) =>
    rows.map((r) => [...r.querySelectorAll('td')].map((td) => td.textContent).join(' ')),
  );
const urls = async () => (await requests()).map((r) => r.split(' ')[1]);
const clickReviewsTab = () =>
  frame().$$eval('.tab', (tabs) => tabs.find((t) => t.textContent.includes('Отзывы')).click());
const reviewsText = () => frame().$$eval('app-tab', (tabs) => tabs[2].textContent.replace(/\s+/g, ' ').trim());
const rows = () =>
  frame().$$eval('.cart-row', (els) =>
    els.map((r) => ({ cls: r.className, h: r.offsetHeight, title: r.querySelector('.cart-row-title').textContent })),
  );
const addToCart = (index) =>
  frame().$$eval(
    'app-game-card',
    (cards, i) => [...cards[i].querySelectorAll('button')].find((b) => b.textContent.includes('В корзину')).click(),
    index,
  );

// 1. Анимация появления и исчезновения: классы row-enter и row-leave
expect((await title()) === 'Анимация появления и исчезновения', 'шаг 1 открыт');
await showSolution();
await go('/catalog');
await addToCart(0);
await addToCart(1);
await addToCart(2);
await wait(300);
await go('/cart');
const enterRows = await rows();
expect(enterRows.length === 3, `шаг 1: в корзине три строки (${enterRows.length})`);
await frame().$eval('.cart-row .icon-button', (b) => b.click());
await wait(100);
const leaving = await rows();
expect(
  leaving.length === 3 && leaving[0].cls.includes('row-leave'),
  'шаг 1: после × строка ещё на месте с классом row-leave',
);
await wait(600);
expect((await rows()).length === 2, 'шаг 1: после анимации строка удалена');
await checkConsoleClean('шаг 1');

// 2. Анимация из кода: строка схлопывается по высоте
await nextStep();
expect((await title()) === 'Анимация из кода', 'шаг 2 открыт');
await showSolution();
await wait(500);
const before = await rows();
await frame().$eval('.cart-row .icon-button', (b) => b.click());
await wait(150);
const collapsing = await rows();
expect(
  collapsing.length === before.length && collapsing[0].h < before[0].h && !collapsing[0].cls.includes('row-leave'),
  `шаг 2: уходящая строка сжимается (${before[0]?.h} → ${collapsing[0]?.h})`,
);
await wait(600);
expect((await rows()).length === before.length - 1, 'шаг 2: после анимации строка удалена');
await checkConsoleClean('шаг 2');

// 3. @defer: отзывы после чанка
await nextStep();
expect((await title()) === 'Отложенная отрисовка', 'шаг 3 открыт');
await showSolution();
await panel('Сеть');
const order3 = await urls();
expect(
  order3.join(',') === '/api/games/4,/chunk-defer-1.js,/api/games/4/reviews',
  `шаг 3: игра → чанк → отзывы (${order3.join(', ')})`,
);
await panel('Консоль');
await checkConsoleClean('шаг 3');

// 4. Триггер on viewport: отзывы — только после открытия вкладки; @error при «Ошибке 500»
await nextStep();
expect((await title()) === 'Триггеры', 'шаг 4 открыт');
await showSolution();
await panel('Сеть');
expect((await urls()).join(',') === '/api/games/4', 'шаг 4: до вкладки «Отзывы» — только игра');
await clickReviewsTab();
await wait(1500);
expect(
  (await urls()).join(',') === '/api/games/4,/chunk-defer-1.js,/api/games/4/reviews',
  'шаг 4: вкладка «Отзывы» — чанк и отзывы',
);
expect((await reviewsText()).length > 40, 'шаг 4: отзывы показаны');
// Игра загрузилась, потом «Ошибка 500» — чанк не загрузится
await go('/games/4');
await page.$eval('.backend-controls input[type=checkbox]', (box) => box.click());
await clickReviewsTab();
await wait(1000);
expect(
  (await reviewsText()).includes('Не удалось загрузить отзывы'),
  `шаг 4: чанк с ошибкой 500 — блок @error (${await reviewsText()})`,
);
await page.$eval('.backend-controls input[type=checkbox]', (box) => box.click());
await panel('Консоль');

// 5. prefetch on idle: чанк заранее, по вкладке — только отзывы
await nextStep();
expect((await title()) === 'Предзагрузка', 'шаг 5 открыт');
await showSolution();
await panel('Сеть');
expect(
  (await urls()).join(',') === '/api/games/4,/chunk-defer-1.js',
  `шаг 5: чанк загружен до вкладки (${(await urls()).join(', ')})`,
);
await clickReviewsTab();
await wait(1000);
expect(
  (await urls()).join(',') === '/api/games/4,/chunk-defer-1.js,/api/games/4/reviews',
  'шаг 5: по вкладке — только отзывы',
);
await panel('Консоль');
await checkConsoleClean('шаг 5');

// 6. Картинки: NgOptimizedImage и priority у первых обложек
await nextStep();
expect((await title()) === 'Картинки', 'шаг 6 открыт');
await showSolution();
const covers = await frame().$$eval('app-game-card img.cover', (imgs) =>
  imgs.map((i) => `${i.getAttribute('loading')}/${i.getAttribute('fetchpriority')}`),
);
expect(
  covers.length === 6 && covers.every((c) => c === 'eager/high'),
  `шаг 6: шесть первых обложек каталога — priority (${covers.join(', ')})`,
);
await frame().$$eval('button', (els) => els.find((b) => b.textContent.includes('Показать ещё')).click());
await wait(1500);
const more = await frame().$$eval('app-game-card img.cover', (imgs) =>
  imgs.slice(6).map((i) => `${i.getAttribute('loading')}/${i.getAttribute('fetchpriority')}`),
);
expect(
  more.length === 6 && more.every((c) => c === 'lazy/auto'),
  `шаг 6: следующие обложки — ленивые (${more.join(', ')})`,
);
await frame().select('select[aria-label="Сортировка"]', 'rating');
await wait(1500);
await checkConsoleClean('шаг 6: каталог и сортировка');
await go('/games/4');
const hero = await frame().$eval(
  '.head img.cover',
  (i) => `${i.getAttribute('loading')}/${i.getAttribute('fetchpriority')}`,
);
expect(hero === 'eager/high', `шаг 6: обложка на странице игры — priority (${hero})`);
await checkConsoleClean('шаг 6');

// 7. Большие списки — без решения
await nextStep();
expect((await title()) === 'Большие списки', 'шаг 7 открыт');
await checkConsoleClean('шаг 7');

// 8. Практикум: летящая обложка
await nextStep();
expect((await title()) === 'Практикум: летящая обложка', 'шаг 8 открыт');
await showSolution();
await addToCart(1);
await wait(100);
const flights = await frame().$$eval('.flying-cover', (els) => els.map((e) => e.getAnimations().length));
expect(flights.length === 1 && flights[0] > 0, 'шаг 8: «В корзину» — обложка летит');
await wait(1000);
expect((await frame().$$('.flying-cover')).length === 0, 'шаг 8: долетела — исчезла');
await checkConsoleClean('шаг 8');

// 9. Под капотом — без решения
await nextStep();
expect((await title()) === 'Под капотом: @defer в JIT и в AOT', 'шаг 9 открыт');
await checkConsoleClean('шаг 9');

await finish();
