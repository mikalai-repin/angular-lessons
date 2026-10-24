// Проверка главы 18 в интерфейсе платформы: проходит шаги кнопкой «Далее», в каждом нажимает «Решение»
// и проверяет магазин на NgRx — избранное и корзина на Signal Store (сохранение после ⟳, промокод, сущности),
// сверку корзины с сервером (rxMethod), событие «заказ оформлен», избранное на классическом Store
// (без сохранения в шаге 7, с эффектами и журналом действий в шаге 8) и «Вы смотрели» в практикуме.
// node tools/e2e/checks/ch18-ngrx.mjs
import { clean, openCourse, wait } from '../lib.mjs';

const { page, expect, frame, consoleText, title, showSolution, nextStep, checkConsoleClean, finish } =
  await openCourse('/ngrx/signal-store');

const text = async (selector) =>
  clean(
    (await frame()
      .$eval(selector, (e) => e.textContent)
      .catch(() => '')) ?? '',
  );
const header = () => text('app-header');
// Превью шага со своим стартом появляется не сразу — ждём кадр с приложением
const ready = async () => {
  for (
    let i = 0;
    i < 30 &&
    !(await frame()
      ?.$('app-header')
      .catch(() => null));
    i++
  )
    await wait(300);
};
const main = () => text('main');
// Ссылка приложения по концу адреса: '/cart', '/' — щелчок из страницы (routerLink)
const go = async (path, ms = 1200) => {
  await frame().evaluate(
    (path) =>
      [...document.querySelectorAll('a')]
        .find((a) => (a.getAttribute('href') ?? '').replace(/^\/app/, '') === path)
        ?.click(),
    path,
  );
  await wait(ms);
};
const cards = (selector) => frame().$$(`app-game-card ${selector}`);
const heart = async (i) => {
  await (await cards('.favorite'))[i].click();
  await wait(300);
};
const addToCart = async (i) => {
  await (await cards('.actions .button'))[i].click();
  await wait(400);
};
const clickButton = async (label) => {
  const [button] = await frame().$$(`xpath/.//button[normalize-space(.)="${label}"]`);
  await button.click();
  await wait(500);
};
const restart = async () => {
  await page.click('button[title="Перезагрузить приложение с текущего адреса"]');
  await wait(3000);
};
const clearCart = async () => {
  await go('/cart');
  if (await frame().$('.cart-row')) await clickButton('Очистить корзину');
  await go('/');
};
const storage = (key, value) => frame().evaluate((key, value) => localStorage.setItem(key, value), key, value);

// 1. Избранное на Signal Store
expect((await title()) === 'Signal Store', 'шаг 1 открыт');
await showSolution();
await heart(0);
await heart(2);
expect((await header()).includes('♥ 2'), `шаг 1: сердечки — ♥ 2 (${await header()})`);
await restart();
expect((await header()).includes('♥ 2'), `шаг 1: после ⟳ избранное на месте (${await header()})`);
await heart(0);
await heart(2);
await checkConsoleClean('шаг 1');

// 2. Корзина на Signal Store: промокод, сохранение
await nextStep();
expect((await title()) === 'Корзина на Signal Store', 'шаг 2 открыт');
await showSolution();
await go('/');
await addToCart(0);
await addToCart(0);
await addToCart(1);
expect(/В корзине: 3 ·/.test(await header()), `шаг 2: три игры в шапке (${await header()})`);
await go('/cart');
const promoInput = await frame().$('.promo-input');
await promoInput.type('KNIGHT10');
await wait(1200);
await clickButton('Применить');
expect((await main()).includes('Промокод KNIGHT10'), 'шаг 2: промокод KNIGHT10 применён (withLinkedState)');
await restart();
expect(/В корзине: 3 ·/.test(await header()), `шаг 2: после ⟳ корзина на месте (${await header()})`);
await clearCart();
await checkConsoleClean('шаг 2');

// 3. Сущности: количество растёт у той же позиции, «×» убирает её
await nextStep();
expect((await title()) === 'Коллекции', 'шаг 3 открыт');
await showSolution();
await go('/');
await addToCart(0);
await addToCart(0);
expect((await consoleText()).includes('× 2'), 'шаг 3: вторая «В корзину» — та же позиция × 2 (updateEntity)');
await go('/cart');
await (await frame().$('.cart-row button[aria-label="Убрать из корзины"]')).click();
await wait(1000);
expect((await main()).includes('Корзина пуста'), 'шаг 3: removeEntity — корзина пуста');
await checkConsoleClean('шаг 3');

// 4. Своё расширение withStorage: корзина и избранное после ⟳
await nextStep();
expect((await title()) === 'Своё расширение', 'шаг 4 открыт');
await showSolution();
await go('/');
await addToCart(1);
await heart(3);
await restart();
const h4 = await header();
expect(h4.includes('♥ 1') && /В корзине: 1 ·/.test(h4), `шаг 4: после ⟳ — ♥ 1 и одна игра (${h4})`);
await heart(3);
await clearCart();
await checkConsoleClean('шаг 4');

// 5. rxMethod: сверка корзины с сервером
await nextStep();
expect((await title()) === 'Асинхронные методы', 'шаг 5 открыт');
await showSolution();
const game4 = await frame().evaluate(() => fetch('/api/games/4').then((r) => r.json()));
await storage(
  'hod-konem:cart:v2',
  JSON.stringify([
    { game: { ...game4, price: 7, inStock: 99 }, quantity: 7 },
    { game: { ...game4, id: 999, title: 'Пропавшая игра', inStock: 5 }, quantity: 1 },
  ]),
);
await restart();
await go('/cart', 2500);
const cart5 = await main();
expect(
  cart5.includes('Ночной экспресс') && cart5.includes('9 570 ₽') && !cart5.includes('Пропавшая игра'),
  `шаг 5: после сверки — 3 шт. по 3 190 ₽, пропавшей игры нет (${cart5.slice(0, 160)})`,
);
expect(!cart5.includes('Сверяем'), 'шаг 5: сверка закончилась');
await clearCart();
await checkConsoleClean('шаг 5');

// 6. События: «заказ оформлен» очищает корзину и пишет в аналитику
await nextStep();
expect((await title()) === 'События', 'шаг 6 открыт');
await showSolution();
await go('/');
await addToCart(0);
await go('/cart');
await go('/checkout', 1500);
await (await frame().$('input[autocomplete="name"]')).type('Аня');
await (await frame().$('input[type="tel"]')).type('+7 900 123-45-67');
await clickButton('Оформить заказ');
await wait(1500);
expect(/Заказ №\d+ оформлен/.test(await main()), `шаг 6: заказ оформлен (${(await main()).slice(0, 80)})`);
expect(/В корзине: 0 ·/.test(await header()), 'шаг 6: корзина пуста — её очистил withReducer');
expect(/Аналитика: Заказ оформлен — №\d+/.test(await consoleText()), 'шаг 6: обработчик события — аналитика');
await go('/', 1500);
await checkConsoleClean('шаг 6');

// 7. Классический Store: избранное работает, но не сохраняется
await nextStep();
expect((await title()) === 'Классический Store', 'шаг 7 открыт');
await showSolution();
await heart(1);
await heart(2);
expect((await header()).includes('♥ 2'), `шаг 7: dispatch и selectSignal — ♥ 2 (${await header()})`);
await go('/account/favorites', 2000);
expect((await frame().$$('app-favorites-page app-game-card')).length === 2, 'шаг 7: страница «Избранное» — две игры');
await restart();
expect((await header()).includes('♥ 0'), `шаг 7: после ⟳ избранное пусто — сохранения пока нет (${await header()})`);
await checkConsoleClean('шаг 7');

// 8. Эффекты и журнал действий
await nextStep();
expect((await title()) === 'Эффекты', 'шаг 8 открыт');
await showSolution();
const log8 = await consoleText();
expect(log8.includes('Действие: @ngrx/effects/init'), 'шаг 8: журнал — служебные действия');
expect(log8.includes('Действие: [Favorites Storage] Restored'), 'шаг 8: эффект restoreFavorites');
await go('/');
await heart(0);
expect((await consoleText()).includes('Действие: [Game Card] Favorite Toggled'), 'шаг 8: журнал — сердечко');
await restart();
expect((await header()).includes('♥ 1'), `шаг 8: после ⟳ избранное на месте (${await header()})`);
await heart(0);
await checkConsoleClean('шаг 8');

// 9. Практикум «Вы смотрели» (подробно — check.ts шага)
await nextStep();
expect((await title()) === 'Практикум: «Вы смотрели»', 'шаг 9 открыт');
await ready();
expect(!(await main()).includes('Вы смотрели'), 'шаг 9: в старте блока нет');
await showSolution();
await go('/catalog', 1500);
await (await frame().$('app-game-card .title a, app-game-card a')).click();
await wait(1500);
await go('/', 1500);
expect((await main()).includes('Вы смотрели'), 'шаг 9: решение — блок «Вы смотрели» на главной');
expect((await frame().$$('.recent img')).length === 1, 'шаг 9: в блоке одна открытая игра');
await checkConsoleClean('шаг 9');

// 10. Под капотом: кода нет
await nextStep();
expect((await title()) === 'Под капотом: что такое signalStore', 'шаг 10 открыт');
await checkConsoleClean('шаг 10');

await finish();
