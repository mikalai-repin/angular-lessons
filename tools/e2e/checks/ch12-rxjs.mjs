// Проверка главы 12 в интерфейсе платформы: проходит шаги кнопкой «Далее», в каждом нажимает «Решение»
// и проверяет магазин в превью вместе с консолью и вкладкой «Сеть»: события роутера, журнал просмотров,
// быстрый поиск (пауза, отмена, ошибка не убивает поток), избранное через rxResource, часы на toSignal,
// лог и повтор запросов интерцепторами, кэш игры, черновик комментария и опыт «ромб».
// node tools/e2e/checks/ch12-rxjs.mjs
import { clean, openCourse, wait } from '../lib.mjs';

const { page, expect, frame, consoleText, title, showSolution, nextStep, checkConsoleClean, finish } =
  await openCourse('/rxjs/observable');

const mainText = async () => clean(await frame().$eval('main', (e) => e.innerText));
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
const showNetwork = () => page.click('.panel-tab:nth-child(2)');
const showConsole = () => page.click('.panel-tab:nth-child(1)');
const requests = () =>
  page.$$eval('.network-row', (rows) =>
    rows.map((r) => [...r.querySelectorAll('td')].map((td) => td.textContent).join(' ')),
  );
const setFail = async (on) => {
  const checked = await page.$eval('.backend-controls input[type=checkbox]', (c) => c.checked);
  if (checked !== on) await page.click('.backend-controls input[type=checkbox]');
};
const clickInFrame = (selector, index = 0) => frame().$$eval(selector, (els, i) => els[i].click(), index);
const lines = async () => (await consoleText()).split('\n');
// Быстрый поиск: ввод в поле шапки и подсказки под ним
const quickSearch = async (text) => {
  await frame().click('.quick-search-input', { clickCount: 3 });
  await frame().type('.quick-search-input', text, { delay: 80 });
  await wait(1200);
};
const suggestions = () => frame().$$eval('.suggestions a', (els) => els.map((e) => e.textContent.trim()));
const searchRequests = async () => (await requests()).filter((r) => r.includes('size=5'));

// 1. Observable: события роутера
expect((await title()) === 'Observable', 'шаг 1 открыт');
await showSolution();
expect((await consoleText()).includes("NavigationStart(id: 1, url: '/')"), 'шаг 1: NavigationStart первой навигации');
await clickInFrame('.nav a[href$="/catalog"]');
await wait(1000);
expect(
  (await consoleText()).includes("NavigationEnd(id: 2, url: '/catalog', urlAfterRedirects: '/catalog')"),
  'шаг 1: «Каталог» — события второй навигации',
);
await checkConsoleClean('шаг 1');

// 2. Операторы: журнал просмотров страниц
await nextStep();
expect((await title()) === 'Операторы', 'шаг 2 открыт');
await showSolution();
await go('/account');
expect(
  (await lines()).some((l) => l.includes('Просмотр страницы — /account/favorites')),
  'шаг 2: /account — просмотр /account/favorites (адрес после переадресации)',
);
await go('/checkout');
const views = (await lines()).filter((l) => l.includes('Просмотр страницы'));
expect(
  views.length === 1 && views[0].includes('/cart'),
  `шаг 2: /checkout с пустой корзиной — один просмотр /cart (${views.join(' | ')})`,
);
expect(!(await consoleText()).includes('NavigationStart'), 'шаг 2: вывода всех событий больше нет');
await checkConsoleClean('шаг 2');

// 3. Поиск с отменой: старт — запрос на каждую букву, решение — один запрос после паузы
await nextStep();
expect((await title()) === 'Поиск с отменой', 'шаг 3 открыт');
await wait(500);
await showNetwork();
await quickSearch('кот');
expect((await searchRequests()).length === 3, 'шаг 3, старт: три запроса на «кот»');
await showSolution();
await showNetwork();
await quickSearch('кот');
const found = await searchRequests();
expect(
  found.length === 1 && found[0].includes('q=%D0%BA%D0%BE%D1%82'),
  `шаг 3: один запрос на «кот» (${found.length})`,
);
expect((await suggestions()).join() === 'Космические коты', 'шаг 3: подсказка «Космические коты»');
await setFail(true);
await quickSearch('ост');
expect((await suggestions()).length === 0, 'шаг 3: ошибка сервера — подсказок нет');
await setFail(false);
await quickSearch('кот');
expect((await suggestions()).length > 0, 'шаг 3: после ошибки поиск работает (catchError внутри switchMap)');
await clickInFrame('.suggestions a');
await wait(1000);
expect(
  (await count('.suggestions')) === 0 && (await frame().$eval('.quick-search-input', (i) => i.value)) === '',
  'шаг 3: выбор подсказки закрывает список и очищает поле',
);
await showConsole();
await checkConsoleClean('шаг 3');

// 4. Мост к сигналам: то же поведение на toSignal/toObservable
await nextStep();
expect((await title()) === 'Мост к сигналам', 'шаг 4 открыт');
await showSolution();
await showNetwork();
await quickSearch('кот');
expect((await searchRequests()).length === 1, 'шаг 4: один запрос на «кот»');
expect((await suggestions()).join() === 'Космические коты', 'шаг 4: подсказка «Космические коты»');
await clickInFrame('.suggestions a');
await wait(1000);
expect((await mainText()).includes('Космические коты'), 'шаг 4: щелчок по подсказке — страница игры');
expect((await frame().$eval('.quick-search-input', (i) => i.value)) === '', 'шаг 4: поле очищено через сигнал');
await showConsole();
await checkConsoleClean('шаг 4');

// 5. rxResource: избранное через HttpClient
await nextStep();
expect((await title()) === 'rxResource', 'шаг 5 открыт');
await showSolution();
expect((await mainText()).includes('В избранном пока пусто'), 'шаг 5: избранное пустое');
await go('/catalog');
await clickInFrame('app-game-card button.favorite', 0);
await clickInFrame('app-game-card button.favorite', 2);
await wait(300);
await go('/account/favorites');
expect((await count('app-game-card')) === 2, 'шаг 5: в избранном две игры');
await checkConsoleClean('шаг 5');

// 6. Уборка: часы на toSignal(interval)
await nextStep();
expect((await title()) === 'Уборка подписок', 'шаг 6 открыт');
await showSolution();
const clock = () => frame().$eval('app-countdown', (e) => e.textContent.trim());
const before = await clock();
await wait(1500);
expect(before.startsWith('Скидка действует ещё') && (await clock()) !== before, 'шаг 6: часы распродажи идут');
await checkConsoleClean('шаг 6');

// 7. Интерцепторы: лог и повтор при 500
await nextStep();
expect((await title()) === 'Интерцепторы', 'шаг 7 открыт');
await showSolution();
expect(
  (await lines()).some((l) => /GET \/api\/games\?sort=rating&size=4 → 200, \d+ мс/.test(l)),
  'шаг 7: лог запроса хитов',
);
await showNetwork();
await setFail(true);
await restart();
await wait(2000);
expect(
  (await requests()).filter((r) => r.startsWith('GET /api/games?sort=rating&size=4 500')).length === 3,
  'шаг 7: «Ошибка 500» — три попытки запроса хитов',
);
await setFail(false);
await showConsole();
const failed = (await lines()).filter((l) => l.includes('GET /api/games?sort=rating&size=4 → 500'));
expect(failed.length === 1, `шаг 7: в логе одна строка о неудаче (${failed.length})`);
await go('/games/999');
await showNetwork();
expect(
  (await requests()).filter((r) => r.startsWith('GET /api/games/999 404')).length === 2,
  'шаг 7: 404 не повторяется — два запроса (резолвер и страница)',
);
await showConsole();

// 8. Кэш: игра 4 — один запрос к серверу
await nextStep();
expect((await title()) === 'Кэш запросов', 'шаг 8 открыт');
await showSolution();
await showNetwork();
expect(
  (await requests()).filter((r) => r.startsWith('GET /api/games/4 ')).length === 1,
  'шаг 8: игра 4 — один запрос к серверу',
);
await showConsole();
expect(
  (await lines()).some((l) => l.includes('GET /api/games/4 → 200, 0 мс')),
  'шаг 8: второй ответ — из кэша (0 мс)',
);
await checkConsoleClean('шаг 8');

// 9. Практикум: черновик комментария (подробно — step-checks.mjs)
await nextStep();
expect((await title()) === 'Практикум: черновик комментария', 'шаг 9 открыт');
await showSolution();
await go('/catalog');
await clickInFrame('app-game-card .actions .button', 0);
await go('/checkout');
await frame().type('textarea', 'Позвонить за час', { delay: 30 });
await wait(1000);
expect((await mainText()).includes('Черновик сохранён'), 'шаг 9: «Черновик сохранён»');
await restart();
expect(
  (await frame().$eval('textarea', (t) => t.value)) === 'Позвонить за час',
  'шаг 9: черновик на месте после перезапуска',
);
await checkConsoleClean('шаг 9');

// 10. Под капотом: ромб
await nextStep();
expect((await title()) === 'Под капотом: сигналы и RxJS', 'шаг 10 открыт');
const text = await consoleText();
expect(
  text.includes('RxJS: 2000 → 900') && text.includes('Сигналы: 2000 → 1800') && !text.includes('Сигналы: 2000 → 900'),
  'шаг 10: у RxJS промежуточная строка, у сигналов — нет',
);

await finish();
