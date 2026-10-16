// Проверка главы 13 в интерфейсе платформы: проходит шаги кнопкой «Далее», в каждом нажимает «Решение»
// и проверяет формы в превью вместе с консолью и вкладкой «Сеть»: модель и [formField], правила и «тронуто»,
// отправку входа (401 и успех), свои и перекрёстные проверки, промокод на сервере, условные поля,
// открытки, схемы, звёзды как поле формы, оформление заказа, реактивную форму и опыт «под капотом».
// node tools/e2e/checks/ch13-forms.mjs
import { clean, openCourse, wait } from '../lib.mjs';

const { page, expect, frame, consoleText, title, showSolution, nextStep, checkConsoleClean, finish } = await openCourse(
  '/forms/form-model',
  { onDialog: (d) => d.accept() },
);

const mainText = async () => clean(await frame().$eval('main', (e) => e.innerText));
const count = (selector) => frame().$$eval(selector, (els) => els.length);
// Ввод адреса в адресной строке превью: приложение запускается заново с этого адреса
const go = async (url) => {
  await page.click('.address-input', { clickCount: 3 });
  await page.type('.address-input', `${url}\n`);
  await wait(2000);
};
const showNetwork = () => page.click('.panel-tab:nth-child(2)');
const showConsole = () => page.click('.panel-tab:nth-child(1)');
const requests = () =>
  page.$$eval('.network-row', (rows) =>
    rows.map((r) => [...r.querySelectorAll('td')].map((td) => td.textContent).join(' ')),
  );
const clickInFrame = (selector, index = 0) => frame().$$eval(selector, (els, i) => els[i].click(), index);
const clickButton = (text) =>
  frame().$$eval('button', (els, t) => els.find((b) => b.textContent.includes(t)).click(), text);
const errors = () => frame().$$eval('.field-errors li', (els) => els.map((e) => e.textContent.trim()));
// Покинуть поле: фокус в другое поле
const leave = async (selector, to) => {
  await frame().focus(selector);
  await frame().focus(to);
  await wait(200);
};
const value = (selector) => frame().$eval(selector, (e) => e.value);
// aria-invalid и текст элемента, на который указывает aria-describedby
const aria = (selector) =>
  frame().$eval(selector, (e) => {
    const id = e.getAttribute('aria-describedby');
    return `${e.getAttribute('aria-invalid')} → ${id ? (document.getElementById(id)?.textContent.trim() ?? 'нет элемента') : '—'}`;
  });
const clearAndType = async (selector, text) => {
  await frame().click(selector, { clickCount: 3 });
  await frame().type(selector, text, { delay: 20 });
};

// 1. Модель формы
expect((await title()) === 'Модель формы', 'шаг 1 открыт');
await showSolution();
await frame().type('input[type=email]', 'user@', { delay: 20 });
await wait(200);
expect(
  (await frame().$eval('pre.debug', (e) => e.textContent)).includes('"email": "user@"'),
  'шаг 1: модель следует за полем',
);
await clickButton('Заполнить');
await wait(200);
expect(
  (await value('input[type=email]')) === 'user@example.com' && (await value('input[type=password]')) === 'user',
  'шаг 1: запись в модель заполнила поля',
);
await checkConsoleClean('шаг 1');

// 2. Проверка полей
await nextStep();
expect((await title()) === 'Проверка полей', 'шаг 2 открыт');
await showSolution();
expect((await errors()).length === 0, 'шаг 2: при открытии ошибок не видно');
expect((await mainText()).includes('Форма с ошибками'), 'шаг 2: форма с ошибками');
await leave('input[type=email]', 'input[type=password]');
expect((await errors()).includes('Введите e-mail'), 'шаг 2: ушли из пустого e-mail — «Введите e-mail»');
expect(
  (await aria('input[type=email]')) === 'true → Введите e-mail',
  'шаг 2: aria-invalid и aria-describedby у e-mail',
);
await frame().type('input[type=email]', 'user@');
await wait(200);
expect((await errors()).includes('Похоже, в адресе опечатка'), 'шаг 2: user@ — опечатка');
await checkConsoleClean('шаг 2');

// 3. Отправка формы
await nextStep();
expect((await title()) === 'Отправка формы', 'шаг 3 открыт');
await showSolution();
await showNetwork();
await clickButton('Войти');
await wait(500);
expect(
  (await errors()).length === 2 && (await requests()).length === 0,
  'шаг 3: пустая форма — ошибки у полей, запроса нет',
);
await frame().type('input[type=email]', 'user@example.com');
await frame().type('input[type=password]', 'wrong');
await clickButton('Войти');
await wait(1000);
expect((await mainText()).includes('Неверный e-mail или пароль'), 'шаг 3: неверный пароль — ошибка сервера у формы');
expect(
  (await requests()).some((r) => r.includes('/api/login') && r.includes('401')),
  'шаг 3: POST /api/login → 401',
);
await frame().type('input[type=password]', 'x');
await wait(200);
expect(!(await mainText()).includes('Неверный e-mail или пароль'), 'шаг 3: правка поля убрала ошибку сервера');
await clearAndType('input[type=password]', 'user');
await (await frame().$('input[type=password]')).press('Enter');
await wait(1000);
expect((await mainText()).includes('Здравствуйте, Пользователь'), 'шаг 3: Enter — вход выполнен');
await showConsole();
await checkConsoleClean('шаг 3');

// 4. Свои проверки: форма оформления (нужна игра в корзине)
await nextStep();
expect((await title()) === 'Свои проверки', 'шаг 4 открыт');
await showSolution();
await go('/catalog');
await clickInFrame('app-game-card .actions .button', 0);
await go('/checkout');
const [nameInput, phoneInput, emailInput] = ['input[autocomplete=name]', 'input[type=tel]', 'input[type=email]'];
await leave(nameInput, phoneInput);
await leave(phoneInput, emailInput);
await leave(emailInput, 'textarea');
let shown = await errors();
expect(
  shown.includes('Как к вам обращаться?') && shown.some((e) => e.startsWith('Укажите телефон или e-mail')),
  'шаг 4: пустые контакты — имя и «телефон или e-mail»',
);
expect(
  (await aria(nameInput)) === 'true → Как к вам обращаться?',
  'шаг 4: FieldAria — aria у имени ведёт к FieldErrors',
);
expect((await aria(phoneInput)) === 'null → —', 'шаг 4: у верного поля атрибутов нет');
await frame().type(phoneInput, '+7 (900) 123-45');
await leave(phoneInput, 'textarea');
shown = await errors();
expect(
  shown.some((e) => e.startsWith('Номер — 11 цифр')) && !shown.some((e) => e.startsWith('Укажите телефон')),
  'шаг 4: неполный телефон — ошибка формата, перекрёстная ошибка ушла',
);
await frame().type(phoneInput, '-67');
await wait(200);
expect(!(await errors()).some((e) => e.startsWith('Номер')), 'шаг 4: полный номер принят');
await checkConsoleClean('шаг 4');

// 5. Проверка на сервере: промокод
await nextStep();
expect((await title()) === 'Проверка на сервере', 'шаг 5 открыт');
await showSolution();
await go('/cart');
await showNetwork();
await frame().type('.promo-input', 'nope', { delay: 40 });
await wait(1200);
expect((await mainText()).includes('Нет такого промокода'), 'шаг 5: nope — «Нет такого промокода»');
expect((await aria('.promo-input')) === 'true → Нет такого промокода', 'шаг 5: aria у промокода');
await clearAndType('.promo-input', 'chess500');
await wait(1200);
expect((await mainText()).includes('Сумма товаров меньше'), 'шаг 5: CHESS500 при сумме меньше 3000 ₽ — ошибка порога');
await clearAndType('.promo-input', 'knight10');
await wait(1200);
await clickButton('Применить');
await wait(1000);
expect((await mainText()).includes('Промокод KNIGHT10'), 'шаг 5: KNIGHT10 применён');
expect(
  (await requests()).filter((r) => r.toLowerCase().includes('/api/promo/knight10')).length === 1,
  'шаг 5: «Применить» взял промокод из кэша — в «Сети» один запрос',
);
await showConsole();
await checkConsoleClean('шаг 5');

// 6. Условные поля
await nextStep();
expect((await title()) === 'Условные поля', 'шаг 6 открыт');
await showSolution();
await go('/checkout');
expect((await count('input[autocomplete=street-address]')) === 0, 'шаг 6: самовывоз — адреса нет');
await clickInFrame('input[value=courier]');
await wait(300);
expect((await count('input[autocomplete=street-address]')) === 1, 'шаг 6: курьер — адрес появился');
expect(
  (await frame().$eval('input[type=checkbox]', (c) => c.disabled)) &&
    (await mainText()).includes('Укажите телефон, и курьер позвонит заранее'),
  'шаг 6: без телефона флажок звонка отключён, причина видна',
);
await frame().type('input[type=tel]', '+79001234567');
await wait(200);
expect(!(await frame().$eval('input[type=checkbox]', (c) => c.disabled)), 'шаг 6: с телефоном флажок активен');
await checkConsoleClean('шаг 6');

// 7. Списки полей: открытки
await nextStep();
expect((await title()) === 'Списки полей', 'шаг 7 открыт');
await showSolution();
await go('/checkout');
for (let i = 0; i < 3; i++) await clickButton('Добавить открытку');
await wait(300);
expect((await count('.postcard')) === 3, 'шаг 7: три открытки');
expect(!(await mainText()).includes('Добавить открытку'), 'шаг 7: после трёх кнопки «Добавить» нет');
await frame().type('.postcard:nth-of-type(1) input', 'Маше');
await frame().type('.postcard:nth-of-type(2) input', 'Пете');
await leave('.postcard:nth-of-type(3) input', 'textarea[rows="3"]');
await clickInFrame('.postcard .link-button', 0);
await wait(300);
const tos = await frame().$$eval('.postcard input', (els) => els.map((e) => e.value));
expect(tos.join(',') === 'Пете,', `шаг 7: убрали первую — остались «Пете» и пустая (${tos.join(',')})`);
expect((await errors()).includes('Кому эта открытка?'), 'шаг 7: ошибка осталась у пустой открытки');
await checkConsoleClean('шаг 7');

// 8. Схемы: правило e-mail — общее для входа и заказа
await nextStep();
expect((await title()) === 'Схемы', 'шаг 8 открыт');
await showSolution();
await go('/login');
await frame().type('input[type=email]', 'a@');
await leave('input[type=email]', 'input[type=password]');
expect((await errors()).includes('Похоже, в адресе опечатка'), 'шаг 8: вход — emailRules');
await go('/checkout');
await frame().type('input[type=email]', 'a@');
await leave('input[type=email]', 'textarea');
expect((await errors()).includes('Похоже, в адресе опечатка'), 'шаг 8: заказ — emailRules');
await checkConsoleClean('шаг 8');

// 9. Своё поле формы: звёзды в форме отзыва
await nextStep();
expect((await title()) === 'Своё поле формы', 'шаг 9 открыт');
await showSolution();
await clickButton('Отзывы');
await wait(500);
const reviewsBefore = await count('.review');
const star = (await frame().$$('.review-form app-rating .star'))[4];
const width = await star.evaluate((e) => e.getBoundingClientRect().width);
await star.click({ offset: { x: width - 2, y: 5 } });
await wait(200);
await (await frame().$('.review-form textarea')).click();
await wait(300);
expect(
  (await errors()).includes('Поставьте оценку — хотя бы одну звезду'),
  'шаг 9: ушли со звёзд с оценкой 0 — ошибка (touch)',
);
expect(
  (await aria('.review-form app-rating')) === 'true → Поставьте оценку — хотя бы одну звезду',
  'шаг 9: aria у звёзд',
);
await star.click({ offset: { x: width - 2, y: 5 } });
await frame().type('.review-form textarea', 'Отличная игра');
await clickInFrame('.review-form .button');
await wait(1500);
expect((await count('.review')) === reviewsBefore + 1, 'шаг 9: отзыв добавлен');
expect((await value('.review-form textarea')) === '', 'шаг 9: форма сброшена');
await checkConsoleClean('шаг 9');

// 10. Практикум: заказ (подробно — step-checks.mjs)
await nextStep();
expect((await title()) === 'Практикум: заказ', 'шаг 10 открыт');
await showSolution();
await go('/checkout');
await frame().type('input[autocomplete=name]', 'Маша');
await frame().type('input[type=tel]', '+7 900 123-45-67');
await clickButton('Оформить заказ');
await wait(1500);
expect(/Заказ №\d+ оформлен/.test(await mainText()), 'шаг 10: заказ оформлен');
expect((await frame().$eval('app-header', (e) => e.innerText)).includes('В корзине: 0'), 'шаг 10: корзина пуста');
await checkConsoleClean('шаг 10');

// 11. Реактивные формы
await nextStep();
expect((await title()) === 'Реактивные формы', 'шаг 11 открыт');
await clickButton('Войти');
await wait(300);
expect((await errors()).join('|') === 'Введите e-mail|Введите пароль', 'шаг 11: пустая отправка — ошибки обоих полей');
await frame().type('input[type=email]', 'user');
await wait(300);
expect((await consoleText()).includes('Реактивная форма: e-mail — user'), 'шаг 11: valueChanges в консоли');
expect((await frame().$eval('input[type=email]', (e) => e.className)).includes('ng-dirty'), 'шаг 11: классы состояния');
await checkConsoleClean('шаг 11');

// 12. Под капотом: дерево полей
await nextStep();
expect((await title()) === 'Под капотом: дерево полей', 'шаг 12 открыт');
const inside = await consoleText();
expect(
  inside.includes('Новый корень: true | новый contacts: true | те же postcards: true') &&
    inside.includes('после { to: postcard.to }: false') &&
    inside.includes('Схема выполнилась раз: 1'),
  'шаг 12: вывод опыта',
);
await checkConsoleClean('шаг 12');

await finish();
