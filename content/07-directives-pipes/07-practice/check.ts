import type { Check } from '@course/check';

// Проверка практикума: обложки карточек загружаются, только когда появились на экране
const check: Check = async ({
  document,
  $$,
  text,
  click,
  settle,
  fail,
}) => {
  const covers = () =>
    $$<HTMLImageElement>('app-game-card img');

  // Обложки, которые видны сразу, загружены и проявлены
  const firstCover =
    covers()[0] ?? fail('В карточках нет обложек <img>.');
  await settle(1000);
  if (!firstCover.classList.contains('lazy'))
    fail('У обложки нет класса lazy.');
  if (!firstCover.getAttribute('src'))
    fail(
      'Обложка первой карточки видна на экране, но у неё нет атрибута src. Кто сообщает директиве о появлении?',
    );
  if (!firstCover.classList.contains('loaded')) {
    fail(
      'Первая обложка загрузилась, но не получила класс loaded — следит ли директива за событием load?',
    );
  }

  // Новая порция карточек — за краем экрана: над приложением высокий пустой блок
  const spacer = document.createElement('div');
  spacer.style.height = '5000px';
  document.body.prepend(spacer);
  try {
    window.scrollTo(0, 0);
    const before = new Set(covers());
    const button =
      $$('app-load-more button').find(
        (b) => text(b) === 'Показать ещё',
      ) ??
      fail(
        'Не найдена кнопка «Показать ещё» — без неё проверке не добавить карточки.',
      );
    await click(button);
    await settle(300);
    const added = covers().filter((img) => !before.has(img));
    if (!added.length)
      fail(
        '«Показать ещё» не добавил карточек — проверке не на чем проверить обложки.',
      );

    const hidden = added[0];
    if (hidden.getAttribute('src')) {
      fail(
        'Обложка за краем экрана уже получила src — браузер загрузит её сразу. Адрес нужен, только когда картинка на экране.',
      );
    }
    if (!hidden.classList.contains('lazy'))
      fail('У обложки за краем экрана нет класса lazy.');

    hidden.scrollIntoView();
    await settle(500);
    const src =
      hidden.getAttribute('src') ??
      fail(
        'Обложка появилась на экране, а src так и не получила. Подключён ли InView как хост-директива?',
      );
    if (!src.includes('/assets/covers/'))
      fail(
        `Обложка получила странный src: «${src}» — ожидался адрес обложки игры.`,
      );
    for (
      let i = 0;
      i < 20 && !hidden.classList.contains('loaded');
      i++
    )
      await settle(100);
    if (!hidden.classList.contains('loaded'))
      fail('Обложка загрузилась, а класса loaded у неё нет.');
  } finally {
    spacer.remove();
  }
  return { pass: true };
};

export default check;
