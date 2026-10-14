// Проверка главы 11 в интерфейсе платформы: проходит шаги кнопкой «Далее», в каждом нажимает «Решение»
// и проверяет магазин в превью вместе с вкладкой «Сеть» и настройками учебного бэкенда: данные с сервера,
// заглушки и ошибки с «Повторить», отмену запросов, поиск с задержкой, 404, избранное через resource,
// корзину после перезапуска, отзывы, каталог страницами и журнал статусов ресурса.
// node tools/e2e/checks/ch11-http.mjs
import { clean, openCourse, wait } from '../lib.mjs';

const { page, expect, frame, consoleText, title, showSolution, nextStep, checkConsoleClean, finish } =
  await openCourse('/http/server');

const mainText = async () => clean(await frame().$eval('main', (e) => e.innerText));
const tabTitle = () => page.$eval('.preview-tab-title', (e) => e.textContent);
const count = (selector) => frame().$$eval(selector, (els) => els.length);
// Ввод адреса в адресной строке превью: приложение запускается заново с этого адреса
const go = async (url) => {
  await page.click('.address-input', { clickCount: 3 });
  await page.type('.address-input', `${url}\n`);
  await wait(2000);
};
const restart = async () => {
  await page.click('.address-bar button[title^="Перезагрузить"]');
  await wait(2000);
};
// Вкладка «Сеть»: строки запросов «метод адрес статус»
const showNetwork = () => page.click('.panel-tab:nth-child(2)');
const showConsole = () => page.click('.panel-tab:nth-child(1)');
const requests = () =>
  page.$$eval('.network-row', (rows) =>
    rows.map((r) => [...r.querySelectorAll('td')].map((td) => td.textContent).join(' ')),
  );
const setLatency = (ms) => page.select('.backend-controls select', String(ms));
const setFail = async (on) => {
  const checked = await page.$eval('.backend-controls input[type=checkbox]', (c) => c.checked);
  if (checked !== on) await page.click('.backend-controls input[type=checkbox]');
};
const clickInFrame = (selector, index = 0) => frame().$$eval(selector, (els, i) => els[i].click(), index);

// 1. Данные с сервера: fetch
expect((await title()) === 'Данные с сервера', 'шаг 1 открыт');
await showSolution();
expect((await mainText()).includes('Глубокий космос'), 'шаг 1: в хитах игра с сервера — «Глубокий космос»');
await showNetwork();
expect(
  (await requests()).some((r) => r.startsWith('GET /api/games?sort=rating&size=4 200')),
  'шаг 1: в «Сети» — GET /api/games?sort=rating&size=4 200',
);
await showConsole();
await checkConsoleClean('шаг 1');

// 2. HttpClient
await nextStep();
expect((await title()) === 'HttpClient', 'шаг 2 открыт');
await showSolution();
expect((await mainText()).includes('Глубокий космос'), 'шаг 2: хиты через HttpClient');
await checkConsoleClean('шаг 2');

// 3. httpResource: ошибка, «Повторить», отмена при уходе
await nextStep();
expect((await title()) === 'httpResource', 'шаг 3 открыт');
await showSolution();
expect((await count('app-game-card')) === 12, 'шаг 3: хиты (4) и «Со скидкой» (8)');
await showNetwork();
await setFail(true);
await restart();
expect((await count('.error-message')) === 2, 'шаг 3: «Ошибка 500» — два сообщения «Не удалось загрузить»');
await setFail(false);
await clickInFrame('.error-message button');
await wait(1000);
expect((await count('.error-message')) === 1, 'шаг 3: «Повторить» у хитов — хиты загрузились, «Со скидкой» с ошибкой');
await setLatency(3000);
await restart();
await clickInFrame('.header a[href$="/catalog"]');
await wait(500);
expect(
  (await requests()).filter((r) => r.includes('отменён')).length >= 2,
  'шаг 3: уход со страницы до ответа — запросы ресурсов отменены',
);
await setLatency(300);
await showConsole();

// 4. Каталог с сервера
await nextStep();
expect((await title()) === 'Параметры запроса из сигналов', 'шаг 4 открыт');
await showSolution();
expect((await mainText()).includes('Найдено игр: 40'), 'шаг 4: «Найдено игр: 40»');
await frame().type('.search', 'кот', { delay: 100 });
await wait(1500);
expect((await mainText()).includes('Найдено игр: 1'), 'шаг 4: «кот» — одна игра');
await showNetwork();
expect(
  (await requests()).some((r) => r.includes('отменён')),
  'шаг 4: запросы на «к» и «ко» отменены',
);
await showConsole();
await checkConsoleClean('шаг 4');

// 5. Ошибки: 404 и заголовок вкладки
await nextStep();
expect((await title()) === 'Ошибки', 'шаг 5 открыт');
await showSolution();
expect((await tabTitle()) === 'Ночной экспресс — Ход конём', 'шаг 5: заголовок вкладки из крошки');
await showNetwork();
expect(
  (await requests()).filter((r) => r.startsWith('GET /api/games/4 ')).length === 2,
  'шаг 5: два запроса игры — резолвер и страница',
);
await go('/games/999');
expect((await mainText()).includes('Игра не найдена'), 'шаг 5: /games/999 — «Игра не найдена»');
expect((await tabTitle()) === 'Игра не найдена — Ход конём', 'шаг 5: заголовок вкладки при 404');
await showConsole();
await checkConsoleClean('шаг 5');

// 6. resource: избранное; корзина переживает перезапуск
await nextStep();
expect((await title()) === 'resource', 'шаг 6 открыт');
await showSolution();
expect((await mainText()).includes('В избранном пока пусто'), 'шаг 6: избранное пустое');
await go('/catalog?sort=rating');
await clickInFrame('app-game-card button.favorite', 0);
await clickInFrame('app-game-card button.favorite', 1);
await clickInFrame('app-game-card .actions .button', 1);
await wait(300);
await go('/account/favorites');
expect((await count('app-game-card')) === 2, 'шаг 6: в избранном две игры с сервера');
await restart();
expect(
  clean(await frame().$eval('.header .cart', (e) => e.textContent)).startsWith('В корзине: 1'),
  'шаг 6: «Глубокий космос» в корзине после перезапуска',
);
await checkConsoleClean('шаг 6');

// 7. Поиск с задержкой: один запрос
await nextStep();
expect((await title()) === 'Поиск с задержкой', 'шаг 7 открыт');
await showSolution();
await go('/catalog');
await frame().type('.search', 'кот', { delay: 100 });
await wait(1500);
await showNetwork();
const searches = (await requests()).filter((r) => r.includes('q=%D0'));
expect(
  searches.length === 1 && searches[0].includes('q=%D0%BA%D0%BE%D1%82'),
  `шаг 7: один запрос на «кот» (${searches.length})`,
);
await showConsole();
await checkConsoleClean('шаг 7');

// 8. Отзывы: оптимистичное обновление
await nextStep();
expect((await title()) === 'Изменение данных', 'шаг 8 открыт');
await showSolution();
await frame().$$eval('app-tabs [role=tab]', (tabs) => tabs.find((t) => t.textContent.trim() === 'Отзывы').click());
await wait(300);
await frame().type('textarea', 'Отличная игра');
await clickInFrame('.review-form .button');
await wait(50);
expect(
  clean(await frame().$$eval('.review', (r) => r.at(-1).innerText)).includes('отправляем'),
  'шаг 8: отзыв сразу в списке',
);
await wait(800);
expect(
  clean(await frame().$$eval('.review', (r) => r.at(-1).innerText)).includes('Гость'),
  'шаг 8: после ответа — «Гость»',
);
await checkConsoleClean('шаг 8');

// 9. Практикум: проверка проходит
await nextStep();
expect((await title()) === 'Практикум: каталог страницами', 'шаг 9 открыт');
await showSolution();
await page.click('.check-button');
await page.waitForSelector('.check-result.pass, .check-result.fail', { timeout: 30000 });
expect(await page.$eval('.check-result', (e) => e.classList.contains('pass')), 'шаг 9: «Проверить» — пройдено');

// 10. Под капотом: журнал статусов
await nextStep();
expect((await title()) === 'Под капотом: жизненный цикл ресурса', 'шаг 10 открыт');
expect((await consoleText()).includes('Каталог: loading → resolved'), 'шаг 10: журнал статусов в консоли');
await checkConsoleClean('шаг 10');

await finish();
