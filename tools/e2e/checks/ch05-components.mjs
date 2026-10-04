// Проверка главы 5 в интерфейсе платформы: проходит шаги кнопкой «Далее», в каждом нажимает «Решение»
// и проверяет приложение в превью — карточки, входы и выходы, звёзды рейтинга (model, readonly, клавиатура),
// стикеры через ng-content, хост-элемент, выбор количества в корзине, стили компонентов в <head>.
// node tools/e2e/checks/ch05-components.mjs
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
await page.goto(`${BASE_URL}/components/component`, { waitUntil: 'networkidle0' });
await wait(3000);

// После перезапуска старый iframe может ещё числиться в списке — берём последний
const frame = () => page.frames().filter((f) => f.url().includes('/app')).at(-1);
const header = () => frame().$eval('.cart', (e) => e.textContent.trim());
const consoleText = () => page.$$eval('.console-line', (els) => els.map((e) => e.textContent ?? '').join('\n'));
const title = () => page.$eval('.lesson-title-row h1', (e) => e.textContent);
const count = (selector) => frame().$$eval(selector, (els) => els.length);
const titles = () => frame().$$eval('app-game-card .title', (els) => els.map((e) => e.textContent.trim()));
// Карточка по названию игры: текст, кнопка, звёзды, атрибуты хоста и звёзд
const card = (name) =>
  frame().evaluate((name) => {
    const c = [...document.querySelectorAll('app-game-card')].find((c) => c.querySelector('.title').textContent.includes(name));
    const rating = c.querySelector('app-rating');
    return {
      text: c.innerText.replace(/\s+/g, ' '),
      disabled: c.querySelector('.button')?.disabled,
      stars: rating ? [...rating.querySelectorAll('.star')].map((s) => s.className.replace('star', '').trim() || '-').join(',') : null,
      stickers: [...c.querySelectorAll('.sticker')].map((s) => s.textContent.trim()),
      role: c.getAttribute('role'),
      className: c.className,
      background: getComputedStyle(c).backgroundColor,
      articles: c.querySelectorAll('article').length,
      ratingRole: rating?.getAttribute('role'),
      ratingTabindex: rating?.getAttribute('tabindex'),
    };
  }, name);
const addToCart = async (name, times = 1) => {
  for (let i = 0; i < times; i++) {
    await frame().evaluate((name) => {
      const c = [...document.querySelectorAll('app-game-card')].find((c) => c.querySelector('.title').textContent.includes(name));
      c.querySelector('.button').click();
    }, name);
    await wait(200);
  }
};
// Щелчок по звезде (номер с 1) в элементе app-rating, найденном селектором; half — по левой половине
const clickStar = async (ratingSelector, star, half = false) => {
  const el = await frame().evaluateHandle(
    (sel, star) => document.querySelectorAll(`${sel} .star`)[star - 1],
    ratingSelector,
    star,
  );
  const box = await el.boundingBox();
  await el.click({ offset: { x: box.width * (half ? 0.25 : 0.75), y: box.height / 2 } });
  await wait(250);
};
const filterLabel = () => frame().$eval('.rating-filter app-rating', (e) => e.getAttribute('aria-label') ?? '');
const filterStars = () => frame().$$eval('.rating-filter .star', (els) => els.map((s) => s.className.replace('star', '').trim() || '-').join(','));

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

// 1. Свой компонент
expect((await title()) === 'Свой компонент', 'шаг 1 открыт');
expect((await count('.tile-title')) === 12, 'шаг 1: старт — плитки ещё в App');
await showSolution();
let names = await titles();
expect(names.length === 12 && names.every((n) => n === 'Остров сокровищ'), 'шаг 1: 12 карточек «Остров сокровищ»');
expect((await count('app-game-card .button')) === 0, 'шаг 1: кнопки «В корзину» в карточке пока нет');
await checkConsoleClean('шаг 1');

// 2. Входы
await nextStep();
expect((await title()) === 'Входы', 'шаг 2 открыт кнопкой «Далее»');
// У шага 2 нет папки start/: платформа берёт старт из решения шага 1
names = await titles();
expect(names.length === 12 && names.every((n) => n === 'Остров сокровищ'), 'шаг 2: старт без start/ — решение шага 1');
await showSolution();
names = await titles();
expect(new Set(names).size === 12 && names[0] === 'Остров сокровищ' && names[3] === 'Ночной экспресс', 'шаг 2: у каждой карточки своя игра');
expect((await card('Маяк')).text.includes('Нет в наличии'), 'шаг 2: «Маяк» — нет в наличии');
await checkConsoleClean('шаг 2');

// 3. События компонента
await nextStep();
expect((await title()) === 'События компонента', 'шаг 3 открыт');
await showSolution();
await addToCart('Ночной экспресс', 3);
let c = await card('Ночной экспресс');
expect(c.text.includes('В корзине: 3 шт.') && c.disabled, 'шаг 3: три «Ночных экспресса» — кнопка погасла');
expect((await header()) === 'В корзине: 3 · 9570 ₽', 'шаг 3: шапка');
expect((await card('Маяк')).disabled, 'шаг 3: у «Маяка» кнопка неактивна');
await checkConsoleClean('шаг 3');

// 4. Двусторонняя привязка
await nextStep();
expect((await title()) === 'Двусторонняя привязка', 'шаг 4 открыт');
await showSolution();
expect((await card('Шахматы')).stars === 'full,full,full,full,half', 'шаг 4: у «Шахмат» (4,9) четыре с половиной звезды');
expect((await card('Тихая охота')).stars === 'full,full,full,full,-', 'шаг 4: у «Тихой охоты» (4,1) четыре звезды');
await clickStar('.rating-filter', 5, true);
expect((await count('app-game-card')) === 7 && (await filterLabel()) === '', 'шаг 4: «Рейтинг от 4,5» — 7 игр');
await clickStar('.rating-filter', 5);
expect((await count('app-game-card')) === 0 && (await frame().$eval('.empty', (e) => e.innerText)).includes('Ничего не найдено'), 'шаг 4: «от 5» — ничего');
await frame().click('.empty .link-button');
await wait(250);
expect((await count('app-game-card')) === 12 && (await filterStars()) === '-,-,-,-,-', 'шаг 4: «Сбросить фильтры» гасит звёзды');
await clickStar('.rating-filter', 5);
await clickStar('.rating-filter', 5);
expect((await count('app-game-card')) === 12, 'шаг 4: повторный щелчок сбрасывает оценку');
// Эксперимент: односторонняя привязка к модели — карточка меняет своё значение
await clickStar('app-game-card:nth-of-type(2) app-rating', 2);
expect((await card('Драконья почта')).stars === 'full,full,-,-,-', 'шаг 4: щелчок по звёздам карточки меняет их (эксперимент)');
await frame().select('.filters select', 'cheap');
await wait(300);
expect((await card('Драконья почта')).stars === 'full,full,-,-,-', 'шаг 4: после сортировки локальное значение осталось');
await checkConsoleClean('шаг 4');

// 5. Преобразование входов
await nextStep();
expect((await title()) === 'Преобразование входов', 'шаг 5 открыт');
await showSolution();
await clickStar('app-game-card:nth-of-type(2) app-rating', 2);
expect((await card('Драконья почта')).stars === 'full,full,full,full,-', 'шаг 5: звёзды карточки с readonly не меняются');
await clickStar('.rating-filter', 5, true);
expect((await count('app-game-card')) === 7, 'шаг 5: фильтр по-прежнему работает');
await checkConsoleClean('шаг 5');

// 6. Проекция содержимого
await nextStep();
expect((await title()) === 'Проекция содержимого', 'шаг 6 открыт');
await showSolution();
expect((await card('Ночной экспресс')).stickers.join() === 'Хит,Скидка', 'шаг 6: «Ночной экспресс» — Хит и Скидка');
expect((await card('Шахматы')).stickers.join() === 'Хит' && (await card('Нарды')).stickers.join() === 'Скидка', 'шаг 6: «Шахматы» — Хит, «Нарды» — Скидка');
expect((await count('.stickers .sticker')) === 6, 'шаг 6: всего 6 стикеров, все в слоте карточки');
await checkConsoleClean('шаг 6');

// 7. Хост-элемент
await nextStep();
expect((await title()) === 'Хост-элемент', 'шаг 7 открыт');
await showSolution();
await frame().focus('.search');
await page.keyboard.press('Tab');
await page.keyboard.press('Tab');
const focused = await frame().evaluate(() => document.activeElement.tagName + ' ' + document.activeElement.getAttribute('role'));
expect(focused === 'APP-RATING slider', `шаг 7: Tab доходит до звёзд фильтра (${focused})`);
for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowLeft');
await wait(250);
expect((await filterLabel()) === 'Рейтинг 4.5 из 5' && (await count('app-game-card')) === 7, 'шаг 7: стрелки — «от 4,5», 7 игр');
c = await card('Ночной экспресс');
expect(c.ratingRole === 'img' && c.ratingTabindex === null, 'шаг 7: звёзды карточки — role="img", без tabindex');
await checkConsoleClean('шаг 7');

// 8. Стили компонента
await nextStep();
expect((await title()) === 'Стили компонента', 'шаг 8 открыт');
await showSolution();
c = await card('Маяк');
expect(c.role === 'article' && c.articles === 0 && c.className.includes('sold-out'), 'шаг 8: хост — плитка: role="article", без <article>, класс sold-out');
expect(c.background === 'rgb(245, 245, 247)', `шаг 8: у хоста фон --surface через :host (${c.background})`);
await checkConsoleClean('шаг 8');

// 9. Практикум
await nextStep();
expect((await title()) === 'Практикум: выбор количества', 'шаг 9 открыт');
await showSolution();
await addToCart('Ночной экспресс');
const qButtons = () => frame().$$eval('.cart-row app-quantity button', (b) => b.map((x) => x.disabled));
const row = () => frame().$eval('.cart-row', (e) => e.innerText.replace(/\s+/g, ' ').trim());
expect(JSON.stringify(await qButtons()) === '[true,false]', 'шаг 9: при 1 штуке «−» неактивна');
await frame().click('.cart-row app-quantity button:last-of-type');
await wait(200);
await frame().click('.cart-row app-quantity button:last-of-type');
await wait(200);
c = await card('Ночной экспресс');
expect(
  JSON.stringify(await qButtons()) === '[false,true]' && c.disabled && c.text.includes('В корзине: 3 шт.') && (await header()) === 'В корзине: 3 · 9570 ₽',
  `шаг 9: «+» дважды — 3, «+» и «В корзину» погасли (${await row()})`,
);
await frame().click('.cart-row app-quantity button');
await wait(200);
expect((await header()) === 'В корзине: 2 · 6380 ₽' && (await consoleText()).includes('Корзина: Ночной экспресс × 2'), 'шаг 9: «−» — 2 · 6380 ₽, лог корзины');
await checkConsoleClean('шаг 9');
await page.screenshot({ path: `${OUT}/ch05-practice.png` });

// 10. Под капотом: стили Quantity появляются в <head> с корзиной и уходят после очистки
await nextStep();
expect((await title()) === 'Под капотом: инкапсуляция стилей', 'шаг 10 открыт');
const styles = () => frame().$$eval('head style', (els) => els.length);
const before = await styles();
await addToCart('Остров сокровищ');
const withCart = await styles();
await frame().click('.mini-cart .link-button');
await wait(250);
const after = await styles();
expect(before === 5 && withCart === 6 && after === 5, `шаг 10: <style> в <head>: ${before} → ${withCart} → ${after}`);
const hosts = await frame().evaluate(() => {
  const c = document.querySelector('app-game-card');
  const names = [...c.attributes].map((a) => a.name);
  const sticker = document.querySelector('.sticker');
  return {
    host: names.some((n) => n.startsWith('_nghost-')) && names.some((n) => n.startsWith('_ngcontent-')),
    stickerFromApp: [...sticker.attributes].some((a) => document.querySelector('app-root').hasAttribute(a.name.replace('_ngcontent-', '_nghost-'))),
  };
});
expect(hosts.host && hosts.stickerFromApp, 'шаг 10: у хоста карточки _nghost и _ngcontent, стикер помечен атрибутом App');

expect(pageErrors.length === 0, `ошибок страницы нет ${JSON.stringify(pageErrors)}`);
await browser.close();
console.log(failures.length ? `\nПровалено: ${failures.length}` : '\nВсё прошло');
process.exit(failures.length ? 1 : 0);
