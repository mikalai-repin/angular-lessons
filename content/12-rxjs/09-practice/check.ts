import type { Check, CheckStorage } from '@course/check';

const DRAFT_KEY = 'hod-konem:checkout-comment';

// Корзина не пуста (иначе гард не пустит на оформление), черновик остался с прошлого визита
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
        inStock: 12,
        description: 'Игра о поиске сокровищ.',
        tags: ['пираты'],
      },
      quantity: 1,
    },
  ]),
  [DRAFT_KEY]: 'Позвонить за час',
};

// Проверка практикума: черновик комментария к заказу сохраняется в localStorage после паузы в наборе,
// восстанавливается при возвращении и не теряется при уходе со страницы
const check: Check = async ({
  document,
  $,
  text,
  fill,
  navigate,
  settle,
  fail,
}) => {
  const window = document.defaultView!;
  const draft = () => window.localStorage.getItem(DRAFT_KEY);
  const comment = () =>
    $<HTMLTextAreaElement>('app-checkout textarea') ??
    fail('На странице оформления нет поля комментария.');
  const pageText = () => text('app-checkout');

  await navigate('/checkout');
  if (comment().value !== 'Позвонить за час') {
    fail(
      `Черновик из прошлого визита не восстановился: в localStorage под ключом ${DRAFT_KEY} лежит «Позвонить за час», а в поле «${comment().value}».`,
    );
  }

  // Считаем записи черновика в localStorage
  const storageProto = Object.getPrototypeOf(
    window.localStorage,
  );
  const setItem = storageProto.setItem;
  let writes = 0;
  storageProto.setItem = function (key: string, value: string) {
    if (key === DRAFT_KEY) {
      writes++;
    }
    return setItem.call(this, key, value);
  };
  const confirm = window.confirm;
  let questions = 0;
  window.confirm = () => {
    questions++;
    return true;
  };
  try {
    // Покупатель печатает: три изменения подряд, без пауз
    for (const value of [
      'Домофон',
      'Домофон не',
      'Домофон не работает',
    ]) {
      await fill(comment(), value);
    }
    if (draft() === 'Домофон не работает' && writes > 1) {
      fail(
        `Черновик сохраняется на каждое изменение (${writes} записи за три буквы подряд). Сохраняйте, когда покупатель сделал паузу.`,
      );
    }
    if (!pageText().includes('Сохраняем…')) {
      fail(
        'Пока покупатель печатает и черновик ещё не сохранён, под полем должно быть «Сохраняем…».',
      );
    }

    await settle(1200);
    if (draft() !== 'Домофон не работает') {
      fail(
        `Через секунду после последнего изменения черновик должен лежать в localStorage под ключом ${DRAFT_KEY}, а там «${draft()}».`,
      );
    }
    if (writes !== 1) {
      fail(
        `Три изменения подряд — один черновик, а записей в localStorage: ${writes}. Сохраняйте после паузы в наборе.`,
      );
    }
    if (!pageText().includes('Черновик сохранён')) {
      fail(
        'После сохранения под полем должно быть «Черновик сохранён».',
      );
    }

    // Дописали и сразу ушли со страницы
    await fill(comment(), 'Домофон не работает, позвоните');
    await navigate('/');
    if (questions > 0) {
      fail(
        'При уходе со страницы появился вопрос confirm: черновик сохраняется сам, гард выхода больше не нужен.',
      );
    }
    if (draft() !== 'Домофон не работает, позвоните') {
      fail(
        `Покупатель дописал комментарий и сразу ушёл со страницы — последние изменения потерялись: в localStorage «${draft()}».`,
      );
    }

    await navigate('/checkout');
    if (comment().value !== 'Домофон не работает, позвоните') {
      fail(
        `После возвращения на оформление в поле должен быть сохранённый черновик, а там «${comment().value}».`,
      );
    }
  } finally {
    storageProto.setItem = setItem;
    window.confirm = confirm;
  }
  return { pass: true };
};

export default check;
