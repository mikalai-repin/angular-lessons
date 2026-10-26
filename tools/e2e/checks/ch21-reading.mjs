// Проверка главы 21 в интерфейсе платформы: шаги кнопкой «Далее» (магазин главы 20 без изменений, консоль чистая),
// опыты шага 2 (страница 404 с export default и без него, пропуск плавной смены страниц при смене сортировки)
// и опыты практикума (запрет данных сайтов, переполненное хранилище) на старте и на решении.
// Проверка практикума (check.ts) — в checks/step-checks.mjs 21-reading-code.
// node tools/e2e/checks/ch21-reading.mjs
import { CONTENT, clean, openCourse, readDir, wait } from '../lib.mjs';

const { page, expect, frame, consoleText, title, nextStep, checkConsoleClean, runWithCode, finish } =
  await openCourse('/reading-code/map');

const appText = async () =>
  clean(
    (await frame()
      ?.evaluate(() => document.body.innerText)
      .catch(() => '')) ?? '',
  );
const waitText = async (part, ms = 8000) => {
  for (let i = 0; i < ms / 250 && !(await appText()).includes(part); i++) await wait(250);
  return (await appText()).includes(part);
};
const go = async (url) => {
  await page.click('.address-input', { clickCount: 3 });
  await page.type('.address-input', `${url}\n`);
  await wait(2500);
};
const count = (text, part) => text.split(part).length - 1;
const replace = (code, pairs) => {
  for (const [from, to] of pairs) {
    if (!code.includes(from)) throw new Error(`нет якоря: ${from}`);
    code = code.replace(from, to);
  }
  return code;
};

// 21.1–21.6: шаги без кода — справа магазин главы 20, консоль чистая
const titles = [
  'Карта проекта',
  'Маршруты из данных',
  'Состояние и сервисы',
  'Пререндер и @defer',
  'Встроенный редактор',
  'Что бы мы сделали иначе',
];
for (const [i, name] of titles.entries()) {
  if (i) await nextStep();
  expect((await title()) === name, `шаг ${i + 1}: ${await title()}`);
  expect(await waitText('Хиты'), `шаг ${i + 1}: в превью — магазин`);
  await checkConsoleClean(`шаг ${i + 1}`);
}
await nextStep();
expect((await title())?.startsWith('Практикум'), `шаг 7: ${await title()}`);

// 21.2, опыт: «Нет такой страницы» лениво. С export default — работает, без него — TS2322 и NG04014
const routing = readDir(`${CONTENT}/21-reading-code/02-routing/start`);
const lazyNotFound = (files) => ({
  ...files,
  'app.routes.ts': replace(files['app.routes.ts'], [
    ["import { NotFound } from './not-found/not-found';\n", ''],
    ['    component: NotFound,\n', "    loadComponent: () => import('./not-found/not-found'),\n"],
  ]),
});
await runWithCode(
  'reading-code/routing',
  lazyNotFound({
    ...routing,
    'not-found/not-found.ts': replace(routing['not-found/not-found.ts'], [
      ['export class NotFound', 'export default class NotFound'],
    ]),
  }),
);
await go('/nope');
expect(await waitText('Нет такой страницы'), 'шаг 2: export default + loadComponent без then — страница 404 на месте');
await checkConsoleClean('шаг 2, export default');

await runWithCode('reading-code/routing', lazyNotFound(routing), 6000);
await go('/nope');
let text = clean(await consoleText());
expect(
  /TSapp\.routes\.ts:\d+:\d+ — Type '\(\) => Promise<typeof import/.test(text) &&
    text.includes('is not assignable to type'),
  'шаг 2: без default — ошибка TypeScript у loadComponent в консоли (метка TS)',
);
expect(
  text.includes("NG04014: Invalid configuration of route '**'. The component must be standalone."),
  'шаг 2: без default — NG04014 в консоли превью',
);
expect(!(await appText()).includes('Нет такой страницы'), 'шаг 2: без default — страницы 404 нет');

// 21.2, опыт: onViewTransitionCreated со skipTransition — сортировка без анимации, AbortError в режиме разработки
await runWithCode('reading-code/routing', {
  ...routing,
  'app.config.ts': replace(routing['app.config.ts'], [
    ['  TitleStrategy,\n', '  TitleStrategy,\n  Router,\n  createUrlTreeFromSnapshot,\n  isActive,\n'],
    [
      '      withViewTransitions(),\n',
      `      withViewTransitions({
        onViewTransitionCreated: ({ transition, to }) => {
          const router = inject(Router);
          const toTree = createUrlTreeFromSnapshot(to, []);
          const isTargetRouteCurrent = isActive(toTree, router, {
            paths: 'exact',
            matrixParams: 'exact',
            fragment: 'ignored',
            queryParams: 'ignored',
          });
          if (isTargetRouteCurrent()) {
            transition.skipTransition();
          }
        },
      }),
`,
    ],
  ]),
});
const skipped = 'AbortError: Transition was skipped. skipTransition() called';
expect(
  count(clean(await consoleText()), skipped) >= 1,
  'шаг 2: запуск на главной — первая навигация «на тот же адрес» пропущена',
);
await go('/catalog');
expect(await waitText('Сначала дешёвые'), 'шаг 2: каталог открылся');
const atStart = count(clean(await consoleText()), skipped);
await frame().select('select[aria-label="Сортировка"]', 'cheap');
await wait(1500);
const afterSort = count(clean(await consoleText()), skipped);
expect(afterSort > atStart, `шаг 2: смена сортировки — переход пропущен (${atStart} → ${afterSort})`);
await (await frame().$('app-game-card h2 a')).click();
await wait(2000);
expect(count(clean(await consoleText()), skipped) === afterSort, 'шаг 2: переход к игре — с анимацией, без пропуска');

// 21.7, опыты: запрет данных сайтов (чтение свойства localStorage бросает) и переполненное хранилище
const denied = `// Опыт: данные сайтов запрещены — обращение к localStorage бросает исключение
Object.defineProperty(window, 'localStorage', {
  get() {
    throw new DOMException('Access is denied for this document.', 'SecurityError');
  },
});

`;
const quota = `// Опыт: хранилище переполнено — каждая запись бросает исключение
Storage.prototype.setItem = function () {
  throw new DOMException('Хранилище переполнено', 'QuotaExceededError');
};

`;
const logIn = async () => {
  await go('/login');
  const f = frame();
  await f.type('app-login input[type=email]', 'user@example.com');
  await f.type('app-login input[type=password]', 'user');
  await f.$$eval('app-login form button', (buttons) => buttons.find((b) => b.textContent?.includes('Войти'))?.click());
  await wait(1500);
};
for (const kind of ['start', 'solution']) {
  const files = readDir(`${CONTENT}/21-reading-code/07-practice/${kind}`);

  await runWithCode('reading-code/practice', { ...files, 'main.ts': denied + files['main.ts'] }, 5000);
  text = clean(await consoleText());
  if (kind === 'start') {
    expect(
      text.includes('NG0200: Circular dependency detected for `InjectionToken BROWSER_STORAGE`') &&
        text.includes('ERROR SecurityError: Access is denied for this document.'),
      'практикум, старт: запрет данных сайтов — NG0200 и SecurityError',
    );
    expect(!(await appText()).includes('Хиты'), 'практикум, старт: запрет данных сайтов — превью пустое');
  } else {
    expect(await waitText('Хиты'), 'практикум, решение: запрет данных сайтов — магазин работает');
    await checkConsoleClean('практикум, решение, запрет данных сайтов');
  }

  await runWithCode('reading-code/practice', { ...files, 'main.ts': quota + files['main.ts'] }, 5000);
  const startErrors = count(clean(await consoleText()), 'ERROR QuotaExceededError: Хранилище переполнено');
  await logIn();
  const app = await appText();
  if (kind === 'start') {
    expect(startErrors === 2, `практикум, старт: переполнение — две ошибки при запуске (${startErrors})`);
    expect(app.includes('Не удалось войти'), 'практикум, старт: переполнение — вход не удался');
  } else {
    expect(startErrors === 0, `практикум, решение: переполнение — ошибок нет (${startErrors})`);
    expect(app.includes('Выйти'), 'практикум, решение: переполнение — вход прошёл');
    await checkConsoleClean('практикум, решение, переполнение');
  }
}

await finish();
