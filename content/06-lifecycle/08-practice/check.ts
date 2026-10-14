import type { Check } from '@course/check';

// Проверка практикума: каталог порциями, «Показать ещё» щелчком и при появлении на экране, сброс порций
const check: Check = async ({
  document,
  $,
  $$,
  text,
  click,
  fill,
  settle,
  fail,
}) => {
  const count = () => $$('app-game-card').length;
  const loadMore = () => $('app-load-more');
  const sort =
    $<HTMLSelectElement>('select') ??
    fail('Не найден список сортировки.');

  // Высокий пустой блок над приложением: <app-load-more> гарантированно за краем превью, пока мы сами
  // к нему не прокрутим, — иначе в высоком превью следующая порция загружается сама
  const spacer = document.createElement('div');
  spacer.style.height = '5000px';
  document.body.prepend(spacer);
  try {
    window.scrollTo(0, 0);
    // Новая сортировка — снова первая порция
    await fill(sort, sort.options[1].value);
    await settle(300);
    const first = count();
    if (first === 0) fail('В каталоге нет ни одной карточки.');
    const host =
      loadMore() ??
      fail(
        'Под сеткой нет <app-load-more>: каталог должен показывать игры порциями, пока показаны не все.',
      );
    const button =
      $$('button', host).find(
        (b) => text(b) === 'Показать ещё',
      ) ?? fail('В <app-load-more> нет кнопки «Показать ещё».');

    await click(button);
    await settle(300);
    if (count() <= first)
      fail(
        'Щелчок по «Показать ещё» не добавил игр — вызывается ли выход more?',
      );

    await fill(sort, sort.options[0].value);
    await settle(300);
    if (count() !== first)
      fail(
        'После новой сортировки каталог должен снова показывать только первую порцию.',
      );

    // Появление на экране — без щелчка
    (
      loadMore() ??
      fail(
        'После новой сортировки под сеткой нет <app-load-more>.',
      )
    ).scrollIntoView();
    await settle(500);
    if (count() <= first) {
      fail(
        '<app-load-more> появился на экране, но следующая порция не загрузилась. Следит ли за ним IntersectionObserver?',
      );
    }

    // Порции до конца: потом <app-load-more> исчезает
    for (let i = 0; i < 20 && loadMore(); i++) {
      loadMore()?.scrollIntoView();
      await settle(300);
    }
    if (loadMore())
      fail(
        'Показаны все игры, а <app-load-more> всё ещё под сеткой.',
      );
  } finally {
    spacer.remove();
  }
  return { pass: true };
};

export default check;
