import type { Check, CheckStorage } from '@course/check';

// Администратор уже вошёл: учебный бэкенд принимает вечный токен token-admin
export const storage: CheckStorage = {
  'hod-konem:token': 'token-admin',
};

// Обложка для проверки — маленькая SVG-картинка
const COVER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#2a7"/></svg>';
const TITLE = 'Проверочная игра';

// Проверка практикума: ссылка «Новая игра», форма создания с правилами, загрузка обложки,
// POST /api/games, возврат в таблицу, журнал, обложка в каталоге и гард несохранённой формы
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
  const win =
    document.defaultView ?? fail('Нет окна приложения.');
  const pause = (ms: number) =>
    new Promise((resolve) => win.setTimeout(resolve, ms));
  // Поле формы по подписи: «Название», «Цена, ₽»
  const field = (label: string) =>
    $$('app-game-new label')
      .find((l) => l.textContent?.includes(label))
      ?.querySelector<HTMLInputElement>(
        'input, textarea, select',
      ) ??
    fail(`На странице «Новая игра» нет поля «${label}».`);
  const submitButton = () =>
    $$('app-game-new form button').find((b) =>
      /Добав/.test(b.textContent ?? ''),
    ) ??
    fail('На странице «Новая игра» нет кнопки «Добавить».');
  const fileInput = () =>
    $<HTMLInputElement>(
      'app-game-new app-cover-upload input[type=file]',
    ) ??
    fail(
      'В форме новой игры нет поля обложки: компонент app-cover-upload с <input type="file"> внутри полей игры.',
    );
  // Выбрать файл, как это сделал бы админ в окне выбора файла
  const choose = async (file: File) => {
    const input = fileInput();
    const transfer = new win.DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(
      new win.Event('change', { bubbles: true }),
    );
    await settle(300);
  };
  // Ошибки под всеми полями формы одной строкой
  const fieldErrors = () =>
    $$('app-game-new .field-errors')
      .map((e) => text(e))
      .join(' ');
  const posts = (path: string) =>
    requests.filter(
      (r) => r.method === 'POST' && r.url === path,
    );

  // 1. Ссылка «Новая игра» над таблицей
  await navigate('/admin/games');
  const newLink =
    $('app-games-table a[href$="/admin/games/new"]') ??
    fail(
      'Над таблицей игр нужна ссылка «Новая игра» на /admin/games/new.',
    );
  await click(newLink);
  await settle(300);
  if (url() !== '/admin/games/new') {
    fail(
      `Ссылка «Новая игра» должна вести на /admin/games/new, а открыта ${url()}. Маршрут new — раньше :id?`,
    );
  }
  if (!$('app-game-new')) {
    fail(
      'По адресу /admin/games/new должна открыться страница GameNew (app-game-new). Проверьте, что маршрут new стоит раньше :id.',
    );
  }

  // 2. Пустая форма: ошибки у полей, на сервер ничего не уходит
  await click(submitButton());
  await settle(200);
  if (posts('/api/games').length > 0) {
    fail(
      'Пустая форма ушла на сервер: «Добавить» должна отправлять только форму без ошибок (схема gameSchema).',
    );
  }
  const errors = text('app-game-new');
  if (!errors.includes('Нужно название')) {
    fail(
      'После «Добавить» с пустой формой под названием должна быть ошибка «Нужно название».',
    );
  }
  if (!/обложк/i.test(fieldErrors())) {
    fail(
      'Без обложки игру добавлять нельзя: в схеме нужно правило для cover, и его ошибка — под полем обложки.',
    );
  }

  // 3. Файл не той породы — сервер отвечает 415, поле показывает его сообщение
  await choose(
    new win.File(['просто текст'], 'notes.txt', {
      type: 'text/plain',
    }),
  );
  const wrong =
    posts('/api/covers')[0] ??
    fail(
      'Выбранный файл должен сразу уйти на сервер: POST /api/covers с FormData.',
    );
  if (wrong.status === 400) {
    fail(
      'Сервер не нашёл файл в запросе (400): файл — в поле file формы FormData, а заголовок Content-Type не ставьте сами — его поставит браузер.',
    );
  }
  if (wrong.status !== 415) {
    fail(
      `Текстовый файл сервер должен отклонить (415), а ответ — ${wrong.status}.`,
    );
  }
  if (
    !text('app-cover-upload').includes('Обложка — картинка')
  ) {
    fail(
      'Сервер отклонил файл — покажите в поле обложки его сообщение («Обложка — картинка SVG, PNG…»).',
    );
  }

  // 4. Картинка — загружается, поле показывает её
  await choose(
    new win.File([COVER_SVG], 'cover.svg', {
      type: 'image/svg+xml',
    }),
  );
  const uploaded = posts('/api/covers')[1];
  if (uploaded?.status !== 201) {
    fail(
      'SVG-картинку сервер должен принять: POST /api/covers → 201.',
    );
  }
  const preview =
    $<HTMLImageElement>('app-cover-upload img') ??
    fail(
      'Загруженную обложку нужно показать в поле: <img> с адресом, который вернул сервер.',
    );
  if (!preview.getAttribute('src')) {
    fail(
      'У картинки в поле обложки нет адреса: положите url из ответа сервера в value.',
    );
  }
  if (/Обложка — картинка/.test(text('app-cover-upload'))) {
    fail(
      'Обложка загрузилась, а сообщение о прошлой ошибке осталось: сбрасывайте ошибку перед новой загрузкой.',
    );
  }
  if (/обложк/i.test(fieldErrors())) {
    fail(
      'Обложка загружена, а ошибка «Загрузите обложку» не исчезла: адрес должен попасть в поле формы cover.',
    );
  }

  // 5. Добавить: POST /api/games, возврат в таблицу с поиском по названию
  await fill(field('Название'), TITLE);
  await fill(field('Цена'), '1500');
  // Щелчок без click(): если гард откроет окно, переход будет ждать ответа и settle не дождётся
  submitButton().click();
  await pause(600);
  if ($('dialog[open]')) {
    fail(
      'После «Добавить» гард спросил «Изменения не сохранятся»: игра добавлена — сбросьте форму (reset) перед переходом в таблицу.',
    );
  }
  await settle(200);
  const created =
    posts('/api/games')[0] ??
    fail(
      '«Добавить» должна отправить игру на сервер: POST /api/games.',
    );
  if (created.status !== 201) {
    fail(
      `Сервер не добавил игру: POST /api/games → ${created.status}. Проверьте, что уходит черновик формы.`,
    );
  }
  if (
    !url().startsWith('/admin/games?') ||
    !decodeURIComponent(url()).includes(`q=${TITLE}`)
  ) {
    fail(
      `После добавления — таблица игр с поиском по названию новой игры (/admin/games?q=…), а открыта ${url()}.`,
    );
  }
  if (!text('app-games-table tbody').includes(TITLE)) {
    fail('В таблице после добавления должна быть новая игра.');
  }

  // 6. Журнал на сводке
  await navigate('/admin');
  if (
    !text('app-admin-home').includes(
      `Добавлена игра «${TITLE}»`,
    )
  ) {
    fail(
      `На сводке в журнале нужна запись «Добавлена игра «${TITLE}»»: её пишет AdminGames.create.`,
    );
  }

  // 7. Обложка — у игры в каталоге
  await navigate(`/catalog?q=${encodeURIComponent(TITLE)}`);
  await settle(300);
  const card =
    $$('app-game-card').find((c) =>
      c.textContent?.includes(TITLE),
    ) ??
    fail('Новая игра должна появиться в каталоге магазина.');
  const cover = card.querySelector('img');
  if (!cover?.getAttribute('src')?.startsWith('blob:')) {
    fail(
      'У новой игры в каталоге не та обложка: в игру должен попасть адрес загруженной картинки (поле cover).',
    );
  }

  // 8. Гард: недописанная форма — окно подтверждения
  await navigate('/admin/games/new');
  await fill(field('Название'), 'Черновик');
  // Щелчок без click(): пока окно открыто, переход ждёт ответа гарда — Angular не «успокоится», и settle не дождётся
  (
    $('app-game-new .back-link') ??
    fail('На странице «Новая игра» нет ссылки «← Игры».')
  ).click();
  await pause(300);
  if (url() !== '/admin/games/new' || !$('dialog[open]')) {
    fail(
      'Уходят с недописанной формы новой игры — нужно спросить в окне подтверждения: гард unsavedChangesGuard у маршрута new.',
    );
  }
  await click(
    $$('dialog[open] button').find((b) =>
      /Уйти/.test(b.textContent ?? ''),
    ) ?? fail('В окне подтверждения нет кнопки «Уйти».'),
  );
  await settle(200);
  if (url() !== '/admin/games') {
    fail(`После «Уйти» — таблица игр, а открыта ${url()}.`);
  }
  return { pass: true };
};

export default check;
