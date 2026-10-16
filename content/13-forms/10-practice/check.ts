import type { Check, CheckStorage } from '@course/check';

const DRAFT_KEY = 'hod-konem:checkout-comment';

// В корзине 13 «Островов сокровищ», а на складе учебного бэкенда их 12: первая отправка получит 409.
// Остаток в снимке игры завышен, чтобы корзина не урезала количество сама
export const storage: CheckStorage = {
  'hod-konem:cart:v2': JSON.stringify([
    {
      game: {
        id: 1,
        slug: 'treasure-island',
        title: 'Остров сокровищ',
        cover: '/assets/covers/treasure-island.svg',
        price: 1990,
        oldPrice: 2490,
        category: 'family',
        players: { min: 2, max: 5 },
        playTime: 45,
        age: 8,
        rating: 4.6,
        inStock: 99,
        description: 'Игра о поиске сокровищ.',
        tags: ['пираты'],
      },
      quantity: 13,
    },
  ]),
  [DRAFT_KEY]: 'Позвонить за час',
};

// Проверка практикума: форма оформления отправляет заказ на сервер, показывает ошибку 409,
// после удачного заказа очищает корзину и черновик, а уход с заполненной формой — только с вопросом
const check: Check = async ({
  document,
  $,
  $$,
  text,
  click,
  fill,
  navigate,
  settle,
  url,
  requests,
  fail,
}) => {
  const window = document.defaultView!;
  const orderRequests = () =>
    requests.filter(
      (r) =>
        r.method === 'POST' && r.url.startsWith('/api/orders'),
    );
  const pageText = () => text('app-checkout');
  const form = () =>
    $('app-checkout form') ??
    fail(
      'Поля и кнопка «Оформить заказ» должны быть внутри элемента <form> со связью с формой ([formRoot]).',
    );
  const submitButton = () =>
    $$<HTMLButtonElement>('button', form()).find((b) =>
      /Оформ/.test(b.textContent ?? ''),
    ) ?? fail('В форме нет кнопки «Оформить заказ».');
  const field = (selector: string, name: string) =>
    $<HTMLInputElement>(selector, form()) ??
    fail(`В форме нет поля «${name}» (${selector}).`);
  const fillContacts = async () => {
    await fill(
      field('input[autocomplete=name]', 'Имя'),
      'Маша',
    );
    await fill(
      field('input[type=tel]', 'Телефон'),
      '+7 900 123-45-67',
    );
  };

  const confirm = window.confirm;
  let questions = 0;
  let answer = false;
  window.confirm = () => {
    questions++;
    return answer;
  };
  try {
    await navigate('/checkout');

    // 1. Пустая форма не уходит на сервер, ошибки — у полей
    await click(submitButton());
    if (orderRequests().length > 0) {
      fail(
        'Форма с ошибками ушла на сервер: пустое имя и пустые контакты не должны отправляться.',
      );
    }
    if ($$('app-checkout .field-errors li').length === 0) {
      fail(
        'После попытки отправить пустую форму под полями должны появиться ошибки — отправка помечает все поля тронутыми.',
      );
    }

    // 2. Уход с изменённой формой: вопрос, «Отмена» оставляет на странице
    await fillContacts();
    await navigate('/catalog');
    if (questions === 0) {
      fail(
        'Покупатель заполнил форму и уходит со страницы — магазин должен спросить «Данные заказа не сохранятся. Уйти со страницы?» (гард canDeactivate).',
      );
    }
    if (url() !== '/checkout') {
      fail(
        `На вопрос гарда покупатель ответил «Отмена», но страница сменилась на ${url()}. Гард должен вернуть false.`,
      );
    }

    // 3. Отправка: кнопка заблокирована, ответ 409 — текст сервера у формы
    const button = submitButton();
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (
      !button.disabled ||
      !/Оформляем/.test(button.textContent ?? '')
    ) {
      fail(
        'Пока заказ отправляется, кнопка должна быть заблокирована и писать «Оформляем…».',
      );
    }
    await settle();
    const conflict =
      orderRequests().at(-1) ??
      fail(
        'После отправки заполненной формы на сервер должен уйти POST /api/orders.',
      );
    if (conflict.status !== 409) {
      fail(
        `В корзине 13 «Островов сокровищ», а на складе 12 — сервер должен ответить 409, а ответил ${conflict.status}. Отправляете ли вы позиции корзины (items: gameId и quantity)?`,
      );
    }
    if (!pageText().includes('на складе только 12')) {
      fail(
        'Сервер ответил 409 и объяснил, какой игры не хватает. Покажите его сообщение (error.error.message) у формы — как ошибку отправки.',
      );
    }

    // 4. Исправили количество в корзине — заказ оформлен
    answer = true;
    await navigate('/cart');
    await click(
      $('app-quantity button[aria-label="Меньше"]') ??
        fail('На странице корзины нет кнопки «−» у позиции.'),
    );
    await navigate('/checkout');
    await fillContacts();
    await click(submitButton());
    await settle();
    const placed = orderRequests().at(-1);
    if (placed?.status !== 201) {
      fail(
        `После исправления количества заказ должен оформиться (201), а последний ответ сервера — ${placed?.status}.`,
      );
    }
    if (!/Заказ №\s*\d+ оформлен/.test(pageText())) {
      fail(
        'После удачного заказа вместо формы должно быть «Заказ №… оформлен» с номером из ответа сервера.',
      );
    }
    if (!text('app-header').includes('В корзине: 0')) {
      fail('После оформления заказа корзина должна опустеть.');
    }
    if (window.localStorage.getItem(DRAFT_KEY) !== null) {
      fail(
        `После оформления заказа черновик комментария больше не нужен: удалите его из localStorage (${DRAFT_KEY}).`,
      );
    }

    // 5. После оформления уходим без вопроса
    questions = 0;
    await navigate('/catalog');
    if (questions > 0) {
      fail(
        'Заказ уже оформлен, а при уходе со страницы гард всё ещё спрашивает. Терять больше нечего.',
      );
    }
  } finally {
    window.confirm = confirm;
  }
  return { pass: true };
};

export default check;
