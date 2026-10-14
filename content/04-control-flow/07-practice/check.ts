import type { Check } from '@course/check';

// Проверка практикума: фильтр «Только в наличии», сортировка, пустой каталог и «Сбросить фильтры»
const check: Check = async ({
  $,
  $$,
  text,
  fill,
  setChecked,
  click,
  fail,
}) => {
  const titles = () =>
    $$('.tile .tile-title').map((title) => text(title));
  const prices = () =>
    $$('.tile .price').map((price) =>
      Number(
        text(price)
          .match(/\d[\d\s]*/)?.[0]
          .replace(/\s/g, ''),
      ),
    );
  const soldOut = () =>
    $$('.tile').filter((tile) =>
      text(tile).includes('Нет в наличии'),
    ).length;

  const all = titles();
  const allSoldOut = soldOut();
  if (all.length === 0)
    fail(
      'В каталоге нет ни одной карточки — проверьте @for в app.html.',
    );

  // 1. Только в наличии
  const inStock =
    $<HTMLInputElement>('input[type=checkbox]') ??
    fail(
      'Не найден флажок «Только в наличии» (input type="checkbox").',
    );
  await setChecked(inStock, true);
  if (
    soldOut() > 0 ||
    titles().length !== all.length - allSoldOut
  ) {
    fail(
      'С флажком «Только в наличии» в каталоге остались игры, которых нет на складе.',
    );
  }
  await setChecked(inStock, false);
  if (titles().length !== all.length)
    fail('Флажок сняли, а в каталоге показаны не все игры.');

  // 2. Сортировка: варианты ищем по тексту
  const sort =
    $<HTMLSelectElement>('select') ??
    fail('Не найден выпадающий список сортировки (select).');
  const option = (words: string) =>
    [...sort.options].find((o) =>
      o.text.toLowerCase().includes(words),
    )?.value ??
    fail(`В списке сортировки нет варианта «…${words}…».`);
  const sorted = (list: number[], direction: 1 | -1) =>
    list.every(
      (value, i) =>
        i === 0 || (value - list[i - 1]) * direction >= 0,
    );

  await fill(sort, option('дешёв'));
  if (!sorted(prices(), 1))
    fail(
      '«Сначала дешёвые»: цены в каталоге идут не по возрастанию.',
    );
  await fill(sort, option('дорог'));
  if (!sorted(prices(), -1))
    fail(
      '«Сначала дорогие»: цены в каталоге идут не по убыванию.',
    );
  await fill(sort, option('умолчанию'));
  if (titles().join() !== all.join()) {
    fail(
      '«По умолчанию»: порядок игр не вернулся к исходному. Не сортирует ли код сам массив GAMES?',
    );
  }

  // 3. Пустой каталог и сброс фильтров
  await setChecked(inStock, true);
  await fill(sort, option('дорог'));
  const search =
    $<HTMLInputElement>('.search') ??
    fail('Не найдено поле поиска (.search).');
  await fill(search, 'такой игры нет');
  if (titles().length > 0)
    fail(
      'Поиск «такой игры нет» что-то нашёл — поиск сломался.',
    );
  if (!text('main').includes('Ничего не найдено'))
    fail('В пустом каталоге нет текста «Ничего не найдено».');
  const reset =
    $$('button').find(
      (button) => text(button) === 'Сбросить фильтры',
    ) ??
    fail('В пустом каталоге нет кнопки «Сбросить фильтры».');
  await click(reset);

  if (titles().join() !== all.join()) {
    fail(
      'После «Сбросить фильтры» в каталоге не все игры или они не в исходном порядке.',
    );
  }
  if (search.value !== '')
    fail(
      'После «Сбросить фильтры» в поле поиска остался текст: экран не следует за сигналом.',
    );
  if (inStock.checked)
    fail(
      'После «Сбросить фильтры» флажок на экране остался включённым: экран не следует за сигналом.',
    );
  if (sort.selectedOptions[0]?.value !== option('умолчанию')) {
    fail(
      'После «Сбросить фильтры» в списке на экране не «По умолчанию»: экран не следует за сигналом.',
    );
  }
  return { pass: true };
};

export default check;
