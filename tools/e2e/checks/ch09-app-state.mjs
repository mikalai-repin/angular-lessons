// Проверка главы 9 в интерфейсе платформы: проходит шаги кнопкой «Далее», в каждом нажимает «Решение»
// и проверяет приложение в превью — закрытое состояние корзины, сохранение в localStorage (перезапуск ⟳),
// итоги корзины, промокоды KNIGHT10/CHESS500 и их снятие, правила склада и сохранённое избранное.
// node tools/e2e/checks/ch09-app-state.mjs
import { BASE_URL, launch, wait } from '../lib.mjs';

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
await page.goto(`${BASE_URL}/app-state/store`, { waitUntil: 'networkidle0' });
await wait(3000);

// После перезапуска старый iframe может ещё числиться в списке — берём последний
const frame = () =>
  page
    .frames()
    .filter((f) => f.url().includes('/app'))
    .at(-1);
const consoleText = () => page.$$eval('.console-line', (els) => els.map((e) => e.textContent ?? '').join('\n'));
const title = () => page.$eval('.lesson-title-row h1', (e) => e.textContent);
// Текст без неразрывных пробелов и лишних переводов строк: «1 990 ₽» пайпы пишут через U+00A0
const clean = (s) => s.replace(/ | /g, ' ').replace(/\s+/g, ' ').trim();
const text = async (selector) =>
  clean(
    (await frame()
      .$eval(selector, (e) => e.textContent)
      .catch(() => '')) ?? '',
  );
const header = () => text('app-header');
// innerText, а не textContent: textContent склеивает <dt> и <dd> итогов без пробела
const mini = async () =>
  clean(
    (await frame()
      .$eval('.mini-cart', (e) => e.innerText)
      .catch(() => '')) ?? '',
  );
const card = (name) =>
  frame().evaluateHandle(
    (name) => [...document.querySelectorAll('app-game-card')].find((c) => c.textContent.includes(name)),
    name,
  );
const cardText = async (name) => clean(await (await card(name)).evaluate((c) => c.textContent));
const addToCart = async (name) => {
  const button = await (await card(name)).$('.actions .button');
  await button.click();
  await wait(400);
};
const clickButton = async (label) => {
  const [button] = await frame().$$(`xpath/.//button[normalize-space(.)="${label}"]`);
  await button.click();
  await wait(400);
};
const removeRow = async (name) => {
  const row = await frame().evaluateHandle(
    (name) => [...document.querySelectorAll('.cart-row')].find((r) => r.textContent.includes(name)),
    name,
  );
  await (await row.$('button[aria-label="Убрать из корзины"]')).click();
  await wait(400);
};
const promo = async (code) => {
  const input = await frame().$('.promo-input');
  await input.evaluate((i) => (i.value = ''));
  await input.type(code);
  await clickButton('Применить');
};
const clearCart = async () => {
  if (await frame().$('.mini-cart')) await clickButton('Очистить корзину');
};
const restart = async () => {
  await page.click('button[title="Перезагрузить приложение с текущего адреса"]');
  await wait(3000);
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
  expect(!/ERROR|NG0\d+|Error:|Cannot find|TS\d+/.test(await consoleText()), `${step}: консоль без ошибок`);
}

// 1. Хранилище: закрытое состояние, демо-корзины нет, мини-корзина — компонент
expect((await title()) === 'Хранилище на сигналах', 'шаг 1 открыт');
expect((await header()).includes('В корзине: 0 · 0 ₽'), 'шаг 1: в старте корзина пуста — демо-корзины нет');
await showSolution();
await addToCart('Драконья почта');
expect((await header()).includes('В корзине: 1 · 1 290 ₽'), `шаг 1: шапка (${await header()})`);
expect(!!(await frame().$('app-mini-cart .mini-cart')), 'шаг 1: мини-корзина внутри <app-mini-cart>');
await clearCart();
expect(!(await frame().$('.mini-cart')), 'шаг 1: «Очистить корзину» скрыла мини-корзину');
await checkConsoleClean('шаг 1');

// 2. Сохранение: корзина переживает перезапуск
await nextStep();
expect((await title()) === 'Сохранение в localStorage', 'шаг 2 открыт');
await showSolution();
await addToCart('Остров сокровищ');
await addToCart('Остров сокровищ');
await restart();
expect((await header()).includes('В корзине: 2 · 3 980 ₽'), `шаг 2: после ⟳ корзина на месте (${await header()})`);
expect((await consoleText()).includes('Корзина: Остров сокровищ × 2'), 'шаг 2: журнал после ⟳ — «Остров сокровищ × 2»');
await checkConsoleClean('шаг 2');

// 3. Производное состояние: итоги (корзина пришла из прошлого шага через localStorage)
await nextStep();
expect((await title()) === 'Производное состояние', 'шаг 3 открыт');
await showSolution();
let m = await mini();
expect(
  m.includes('Товары, 2 шт. 3 980 ₽') && m.includes('Доставка 390 ₽') && m.includes('Итого 4 370 ₽'),
  `шаг 3: итоги (${m})`,
);
expect(
  m.includes('вы экономите 1 000 ₽') && m.includes('До бесплатной доставки: 1 020 ₽'),
  'шаг 3: выгода и остаток до доставки',
);
await addToCart('Зельевары');
m = await mini();
expect(m.includes('Доставка бесплатно') && m.includes('Итого 6 470 ₽'), `шаг 3: от 5 000 ₽ доставка бесплатная (${m})`);
expect(!m.includes('До бесплатной доставки'), 'шаг 3: строка «До бесплатной доставки» исчезла');
expect((await header()).includes('В корзине: 3 · 6 470 ₽'), 'шаг 3: шапка — стоимость товаров');
await clearCart();
await checkConsoleClean('шаг 3');

// 4. Промокод
await nextStep();
expect((await title()) === 'Промокод', 'шаг 4 открыт');
await showSolution();
await addToCart('Драконья почта');
await promo('шах');
expect((await mini()).includes('Нет такого промокода'), 'шаг 4: «Нет такого промокода»');
await (await frame().$('.promo-input')).type('x');
await wait(300);
expect(!(await mini()).includes('Нет такого промокода'), 'шаг 4: ввод убирает сообщение');
await promo(' chess500 ');
expect((await mini()).includes('Сумма товаров меньше'), 'шаг 4: CHESS500 при 1 290 ₽ — мала сумма');
await addToCart('Зельевары');
await promo('CHESS500');
m = await mini();
expect(
  m.includes('Промокод CHESS500') && m.includes('−500 ₽') && m.includes('Итого 3 670 ₽'),
  `шаг 4: CHESS500 применён (${m})`,
);
await removeRow('Драконья почта');
expect(
  !(await mini()).includes('Промокод CHESS500') && !!(await frame().$('.promo-input')),
  'шаг 4: сумма ниже порога — промокод снят',
);
await addToCart('Драконья почта');
expect(!(await mini()).includes('Промокод CHESS500'), 'шаг 4: сумма снова 3 780 ₽ — промокод не вернулся');
await promo('KNIGHT10');
m = await mini();
expect(m.includes('Промокод KNIGHT10') && m.includes('−378 ₽'), `шаг 4: KNIGHT10 — минус 10 % (${m})`);
await restart();
m = await mini();
expect(m.includes('Товары, 2 шт.') && !m.includes('KNIGHT10'), 'шаг 4: после ⟳ корзина на месте, промокода нет');
await promo('KNIGHT10');
await clearCart();
await addToCart('Тихая охота');
expect(!(await mini()).includes('KNIGHT10'), 'шаг 4: «Очистить корзину» сняла промокод');
await clearCart();
await checkConsoleClean('шаг 4');

// 5. Практикум: склад и избранное
await nextStep();
expect((await title()) === 'Практикум: правила склада', 'шаг 5 открыт');
await showSolution();
for (let i = 0; i < 3; i++) await addToCart('Ночной экспресс');
const express = await card('Ночной экспресс');
expect(await express.$eval('.actions .button', (b) => b.disabled), 'шаг 5: «В корзину» выключена после 3 шт.');
expect((await cardText('Ночной экспресс')).includes('Все 3 шт. в корзине'), 'шаг 5: «Все 3 шт. в корзине»');
expect(
  await frame().$eval('app-mini-cart app-quantity button[aria-label="Больше"]', (b) => b.disabled),
  'шаг 5: «+» в мини-корзине выключен',
);
await (await express.$('.title-button')).click();
await wait(800);
expect(await frame().$eval('dialog .button', (b) => b.disabled), 'шаг 5: в окне «Подробнее» кнопка выключена');
await page.keyboard.press('Escape');
await wait(400);
await (await (await card('Драконья почта')).$('.favorite')).click();
await wait(300);
await restart();
expect((await header()).includes('♥ 1'), `шаг 5: избранное после ⟳ (${await header()})`);
expect((await header()).includes('В корзине: 3 · 9 570 ₽'), 'шаг 5: корзина после ⟳');
await checkConsoleClean('шаг 5');

// 6. Когда нужна библиотека: шаг без решения
await nextStep();
expect((await title()) === 'Когда нужна библиотека', 'шаг 6 открыт');
expect((await header()).includes('♥ 1'), 'шаг 6: магазин из практикума, избранное на месте');
await checkConsoleClean('шаг 6');

await page.evaluate(() => localStorage.clear());
expect(pageErrors.length === 0, `ошибок страницы нет ${JSON.stringify(pageErrors)}`);
await browser.close();
console.log(failures.length ? `\nПровалено: ${failures.length}` : '\nВсё прошло');
process.exit(failures.length ? 1 : 0);
