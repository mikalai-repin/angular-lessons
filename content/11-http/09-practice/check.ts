import type { Check } from '@course/check';

// Проверка практикума: каталог загружается с сервера страницами по 6 игр, «Показать ещё» — следующая
// страница, новые фильтры — снова первая
const check: Check = async ({
  document,
  $,
  $$,
  text,
  click,
  fill,
  settle,
  fail,
  requests,
}) => {
  const titles = () =>
    $$('app-game-card .title').map((title) => text(title));
  const lastRequest = () =>
    requests
      .filter((r) => r.url.startsWith('/api/games?'))
      .at(-1);
  const param = (name: string) =>
    new URLSearchParams(lastRequest()?.url.split('?')[1]).get(
      name,
    );
  const loadMoreButton = () =>
    $$('app-load-more button').find(
      (b) => text(b) === 'Показать ещё',
    );
  const sort =
    $<HTMLSelectElement>('select') ??
    fail('Не найден список сортировки.');

  // Высокий пустой блок над приложением: «Показать ещё» за краем превью и не срабатывает сам
  const spacer = document.createElement('div');
  spacer.style.height = '5000px';
  document.body.prepend(spacer);
  try {
    window.scrollTo(0, 0);
    await fill(sort, 'cheap');
    await settle(300);
    if (!lastRequest())
      fail(
        'Смена сортировки не отправила запрос к /api/games.',
      );
    if (param('page') !== '1' || param('size') !== '6') {
      fail(
        'Каталог должен просить у сервера страницу: параметры page=1 и size=6 (pageSize из SHOP_CONFIG).',
      );
    }
    const first = titles();
    if (first.length !== 6)
      fail(
        `На первой странице должно быть 6 игр, а на экране ${first.length}.`,
      );
    if (!text('.found').includes('Найдено игр: 40'))
      fail(
        '«Найдено игр» должно показывать total из ответа сервера: 40.',
      );

    await click(
      loadMoreButton() ??
        fail('Под сеткой нет кнопки «Показать ещё».'),
    );
    await settle(300);
    if (param('page') !== '2')
      fail(
        '«Показать ещё» должна запросить следующую страницу: page=2.',
      );
    const two = titles();
    if (two.length !== 12)
      fail(
        `После «Показать ещё» должно быть 12 игр, а на экране ${two.length}.`,
      );
    if (two.slice(0, 6).join() !== first.join()) {
      fail(
        'Вторая страница должна дописаться в конец, а первые шесть игр — остаться на месте.',
      );
    }

    await fill(sort, 'expensive');
    await settle(300);
    if (param('page') !== '1')
      fail(
        'Новая сортировка — новый поиск: запрос должен быть снова с page=1.',
      );
    if (titles().length !== 6)
      fail(
        'После новой сортировки на экране должна быть только первая страница — 6 игр.',
      );

    for (let i = 0; i < 10 && loadMoreButton(); i++) {
      await click(loadMoreButton() as HTMLElement);
      await settle(300);
    }
    const all = titles();
    if (all.length !== 40)
      fail(
        `Все страницы загружены, а игр на экране ${all.length}, а не 40.`,
      );
    if (new Set(all).size !== 40)
      fail(
        'Некоторые игры показаны дважды — страницы склеиваются неправильно.',
      );
    if ($('app-load-more'))
      fail(
        'Показаны все 40 игр, а <app-load-more> всё ещё под сеткой.',
      );
  } finally {
    spacer.remove();
  }
  return { pass: true };
};

export default check;
