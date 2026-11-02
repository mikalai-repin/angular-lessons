// Проверка интерфейса платформы на демо-магазине шага 1.1: ошибки TypeScript, сборки и Angular в консоли,
// схлопывание повторов, адресная строка, заголовок вкладки, вкладка «Сеть», ошибка 500 из переключателя,
// создание, переименование и удаление файлов в редакторе.
// node tools/e2e/checks/platform.mjs
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { BASE_URL, CONTENT, openCourse, OUT, PROGRESS_KEY, readDir, wait } from '../lib.mjs';

/** Ответы на window.prompt по очереди (имена новых файлов); confirm и alert принимаются */
const promptAnswers = [];
const dialogs = [];
const { page, expect, runWithCode, finish } = await openCourse('/first-app/what-is-angular', {
  onDialog: (dialog) => {
    dialogs.push(`${dialog.type()}: ${dialog.message()}`);
    return dialog.type() === 'prompt' ? dialog.accept(promptAnswers.shift() ?? '') : dialog.accept();
  },
});

// Код ученика с ошибками подкладываем в сохранённый прогресс — так же, как его сохранил бы редактор
const files = readDir(`${CONTENT}/01-first-app/01-what-is-angular/start`);
// Ошибка только в типах: код при этом запускается, и шаблон каталога отрисовывается
files['catalog/catalog.ts'] = files['catalog/catalog.ts'].replace(
  "signal('')",
  "signal('')\n  protected wrong: number = 'строка';",
);
// Неизвестный элемент внутри @for: Angular повторяет NG0303 для каждой карточки
files['catalog/catalog.html'] = files['catalog/catalog.html'].replace(/<app-game-card(\s)/, '<app-game-crad$1');
files['app.ts'] = files['app.ts'].replace("styleUrl: './app.css'", "styleUrl: './app2.css'");

await runWithCode('first-app/what-is-angular', files);

const lines = () =>
  page.$$eval('.console-line', (els) => els.map((e) => ({ cls: e.className, text: e.textContent ?? '' })));
let consoleLines = await lines();
const has = (cls, text) => consoleLines.some((l) => l.cls.includes(cls) && l.text.includes(text));
expect(has('console-ts', "Type 'string' is not assignable to type 'number'"), 'ошибка TypeScript с меткой TS');
expect(!consoleLines.some((l) => l.text.includes("Cannot find module '@angular")), 'Monaco находит типы @angular/*');
expect(has('console-build', 'не найден файл «./app2.css»'), 'ошибка сборки: не найден styleUrl');
const ng0303 = consoleLines.find((l) => l.text.includes('NG0303'));
expect(Boolean(ng0303), 'ошибка Angular NG0303 в консоли');
const ng0303Count = await page.$$eval('.console-line', (els) => {
  const line = els.find((e) => e.textContent?.includes('NG0303'));
  return line?.querySelector('.console-count')?.textContent ?? '1';
});
expect(
  consoleLines.filter((l) => l.text.includes('NG0303')).length === 1 && Number(ng0303Count) > 1,
  `повторы NG0303 схлопнуты в одну строку (×${ng0303Count})`,
);
expect(has('console-error', 'NG0304'), 'ошибка NG0304 (неизвестный элемент)');
expect(
  await page.$$eval('.console-line a', (as) =>
    as.some((a) => a.getAttribute('href') === 'https://angular.dev/errors/NG0303'),
  ),
  'код NG0303 — ссылка на angular.dev/errors',
);
await page.screenshot({ path: `${OUT}/platform-errors.png` });

// Тот же шаг без ошибок: адресная строка и сеть
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE_URL}/first-app/what-is-angular`, { waitUntil: 'networkidle0' });
await wait(3000);
// После перезапуска старый iframe может ещё числиться в списке — берём последний
const frame = () =>
  page
    .frames()
    .filter((f) => f.url().includes('/app'))
    .at(-1);
await frame().click('app-game-card a.cover');
await wait(1500);
const address = () => page.$eval('.address-input', (e) => e.value);
expect((await address()) === '/games/1', `клик по ссылке в приложении меняет адресную строку: ${await address()}`);
// Заголовок вкладки над адресной строкой — document.title приложения (title маршрута «Игра — Ход конём»)
const tabTitle = () => page.$eval('.preview-tab-title', (e) => e.textContent);
expect((await tabTitle()) === 'Игра — Ход конём', `заголовок вкладки следует за маршрутом: ${await tabTitle()}`);

await page.click('.address-input', { clickCount: 3 });
await page.type('.address-input', '/cart\n');
await wait(2500);
expect(
  (await frame().evaluate(() => document.body.innerText)).includes('Корзина пуста'),
  'ввод адреса /cart открывает корзину с нуля',
);
expect(
  (await tabTitle()) === 'Корзина — Ход конём',
  `после перезапуска — заголовок новой страницы: ${await tabTitle()}`,
);

await page.click('.icon-button[title="Назад"]');
await wait(500);

await page.click('.address-input', { clickCount: 3 });
await page.type('.address-input', '/\n');
await wait(2500);
const tabs = await page.$$('.panel-tab');
await tabs[1].click();
await wait(200);
const rows = await page.$$eval('.network-row', (rs) => rs.map((r) => r.textContent));
expect(
  rows.some((r) => r?.includes('/api/games') && r.includes('200')),
  `вкладка «Сеть» показывает запрос: ${rows[0]}`,
);

await page.click('.backend-controls input[type=checkbox]');
await frame().type('.search', 'x');
await wait(1500);
const rows2 = await page.$$eval('.network-row', (rs) => rs.map((r) => r.textContent));
expect(
  rows2.some((r) => r?.includes('500')),
  'переключатель «Ошибка 500» действует сразу',
);
expect(
  (await frame().evaluate(() => document.body.innerText)).includes('Не удалось загрузить каталог'),
  'приложение показывает ошибку загрузки',
);
await page.screenshot({ path: `${OUT}/platform-network.png` });

// Вкладка «Шаблон» (глава 19): код JIT для классов ученика — определение с функцией шаблона и фабрика
await page.$$eval('.panel-tab', (els) => els.find((e) => e.textContent?.startsWith('Шаблон'))?.click());
await wait(2500);
const classes = await page.$$eval('.inspector-select option', (els) => els.map((e) => e.textContent));
expect(classes.includes('App'), `«Шаблон»: в списке классов есть App (${classes.join(', ')})`);
const templateCode = await page.$eval('.console-body', (e) => e.textContent ?? '');
expect(
  /function \w+_Template\(rf, ctx\)/.test(templateCode) && templateCode.includes('ɵfac'),
  '«Шаблон»: функция шаблона и фабрика отформатированы',
);
expect(!classes.some((c) => /^(Router|HttpClient|NgIf)$/.test(c ?? '')), '«Шаблон»: классов Angular в списке нет');

// Вкладка «Дерево»: компоненты на странице, поля раскрываются щелчком, наведение подсвечивает хост в приложении
await page.$$eval('.panel-tab', (els) => els.find((e) => e.textContent?.startsWith('Дерево'))?.click());
await wait(1500);
const treeRows = await page.$$eval('.tree-row .tree-name', (els) => els.map((e) => e.textContent));
expect(treeRows[0] === 'App', `«Дерево»: корень — App (${treeRows.join(', ')})`);
const firstRow = await page.$('.tree-row');
await firstRow?.click();
await firstRow?.hover();
await wait(300);
expect((await page.$$('.tree-field')).length > 0, '«Дерево»: щелчок раскрывает поля компонента');
expect(
  await frame().evaluate(() => document.querySelector('.course-highlight')?.getAttribute('style')?.includes('block')),
  '«Дерево»: наведение подсвечивает компонент в приложении',
);
await page.screenshot({ path: `${OUT}/platform-tree.png` });
await page.$$eval('.panel-tab', (els) => els.find((e) => e.textContent?.startsWith('Консоль'))?.click());

// Строка главы с «Свернуть» прилипает к верху панели урока при прокрутке
await page.$eval('.lesson-scroll', (e) => e.scrollTo(0, 600));
await wait(300);
const stuck = await page.$eval('.lesson-chapter-row', (e) => ({
  top: Math.round(e.getBoundingClientRect().top - e.parentElement.getBoundingClientRect().top),
  scrolled: e.parentElement.classList.contains('scrolled'),
}));
expect(stuck.top === 0 && stuck.scrolled, `строка главы прилипла к верху урока при прокрутке ${JSON.stringify(stuck)}`);
await page.$eval('.lesson-scroll', (e) => e.scrollTo(0, 0));

// Оформление по умолчанию (прогресс очищен openCourse): тёмная тема и палитра «Angular»
const look = () =>
  page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      theme: document.documentElement.dataset.theme,
      palette: document.documentElement.dataset.palette ?? null,
      accent: style.getPropertyValue('--accent').trim(),
      bg: style.getPropertyValue('--bg').trim(),
      editor: getComputedStyle(document.querySelector('.monaco-editor .monaco-editor-background')).backgroundColor,
    };
  });
const defaults = await look();
expect(
  defaults.theme === 'dark' && defaults.accent === '#b77bff' && defaults.bg === '#131019',
  `по умолчанию — тёмная тема и «Angular» ${JSON.stringify(defaults)}`,
);

// Палитра: выбор в шапке меняет цвета сразу и сохраняется в localStorage (применяется до запуска приложения)
const choosePalette = async (name) => {
  await page.click('.palette summary');
  await page.evaluate(
    (name) => [...document.querySelectorAll('.palette-option')].find((b) => b.textContent.includes(name)).click(),
    name,
  );
  await wait(200);
};
await choosePalette('Малиновая');
expect((await look()).accent === '#ff5c7a', `выбрана «Малиновая» (тёмная): ${(await look()).accent}`);
await page.reload({ waitUntil: 'domcontentloaded' });
const early = await page.evaluate(() => document.documentElement.dataset.palette);
await wait(3000);
expect(
  early === 'crimson' && (await look()).accent === '#ff5c7a',
  `палитра сохранилась после перезагрузки и применена до запуска (${early})`,
);
await page.screenshot({ path: `${OUT}/platform-palette.png` });
await choosePalette('Angular');
expect((await look()).accent === '#b77bff', 'обратно на «Angular»');

// Тема: кнопка ☀/☾ в шапке переключает светлую и тёмную, вместе с редактором; выбор сохраняется
await page.click('.theme-toggle');
await wait(300);
const lightLook = await look();
expect(
  lightLook.theme === 'light' && lightLook.bg === '#f8f7fb' && lightLook.editor !== defaults.editor,
  `кнопка темы: тёмная → светлая, редактор тоже ${JSON.stringify(lightLook)}`,
);
await page.reload({ waitUntil: 'domcontentloaded' });
const lightEarly = await page.evaluate(() => document.documentElement.dataset.theme);
await wait(3000);
expect(lightEarly === 'light', `светлая тема сохранилась и применена до запуска (${lightEarly})`);
await page.click('.theme-toggle');
await wait(300);
expect((await look()).theme === 'dark', 'обратно на тёмную');

// Кнопка «Формат» не меняет файлы уроков: на диске код в том же формате (shared/lesson-prettier.json, write_steps)
const formatCases = [
  ['first-app/what-is-angular', '01-first-app/01-what-is-angular', ['catalog/catalog.ts', 'catalog/catalog.html']],
  ['signals/practice', '03-signals/08-practice', ['app.ts', 'app.html']],
  ['services-di/first-service', '08-services-di/02-first-service', ['core/cart-store.ts', 'app.html', 'app.css']],
];
for (const [route, dir, names] of formatCases) {
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/${route}`, { waitUntil: 'networkidle0' });
  await wait(2500);
  const original = readDir(`${CONTENT}/${dir}/start`);
  for (const name of names) {
    const tab = await page.evaluateHandle(
      (name) => [...document.querySelectorAll('.tab')].find((t) => t.textContent.trim() === name),
      name,
    );
    await tab.click();
    await wait(400);
    await page.click('.toolbar .button:nth-child(2)');
    await wait(1500);
    const saved = await page.evaluate(
      (key, route) => JSON.parse(localStorage.getItem(key) ?? '{}').steps?.[route]?.code,
      PROGRESS_KEY,
      route,
    );
    const text = saved?.[name] ?? original[name];
    expect(text === original[name], `«Формат» не меняет ${dir}/${name}`);
  }
}

// Файлы в редакторе: создать, подключить, переименовать, удалить файл шага; «Скачать» и «Сброс» видят новый набор
{
  const route = 'first-app/what-is-angular';
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/${route}`, { waitUntil: 'networkidle0' });
  await wait(2500);
  const tabs = () => page.$$eval('.tabs .tab', (els) => els.map((e) => e.textContent.replace('🔒', '').trim()));
  const activeTab = () => page.$eval('.tabs .tab.active', (e) => e.textContent.trim());
  const saved = () =>
    page.evaluate((key, route) => JSON.parse(localStorage.getItem(key) ?? '{}').steps?.[route], PROGRESS_KEY, route);
  const clickTab = (name) =>
    page.$$eval('.tabs .tab', (els, name) => els.find((e) => e.textContent.trim() === name)?.click(), name);
  const stepTabs = await tabs();

  // Неподходящее имя: файл не создаётся, ученик видит причину
  promptAnswers.push('catalog/bad name.js');
  await page.click('.tab-add');
  await wait(300);
  expect(dialogs.at(-1)?.startsWith('alert: Имя «catalog/bad name.js» не подходит'), 'неподходящее имя файла — alert');
  expect((await tabs()).length === stepTabs.length, 'файл с неподходящим именем не создан');

  await clickTab('catalog/catalog.ts');
  await wait(300);
  promptAnswers.push('catalog/hello.ts');
  await page.click('.tab-add');
  await wait(500);
  expect(dialogs.at(-1)?.startsWith('prompt: Новый файл'), 'имя нового файла — prompt');
  let list = await tabs();
  expect(
    list.includes('catalog/hello.ts') && (await activeTab()) === 'catalog/hello.ts',
    'новый файл открыт во вкладке',
  );
  expect(
    list.indexOf('catalog/hello.ts') ===
      list.findLastIndex((t) => t.startsWith('catalog/') && t !== 'catalog/hello.ts') + 1,
    `новая вкладка — после файлов своей папки (${list.join(', ')})`,
  );
  await page.click('.editor-host');
  await page.keyboard.type("console.log('hello-from-new-file');");
  await clickTab('main.ts');
  await wait(300);
  await page.click('.editor-host');
  await page.keyboard.down('Meta');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.up('Meta');
  await page.keyboard.type("import './catalog/hello';");
  await page.keyboard.press('Escape');
  await page.keyboard.press('Enter');
  await page.click('.toolbar .button.primary');
  await wait(3000);
  const consoleText = () => page.$$eval('.console-line', (els) => els.map((e) => e.textContent).join('\n'));
  expect((await consoleText()).includes('hello-from-new-file'), 'новый файл компилируется и выполняется');
  expect((await saved())?.code?.['catalog/hello.ts']?.includes('hello-from-new-file'), 'новый файл сохранён');

  // После перезагрузки новый файл на месте
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(3000);
  expect((await tabs()).includes('catalog/hello.ts'), 'после перезагрузки новый файл на месте');
  expect((await consoleText()).includes('hello-from-new-file'), 'после перезагрузки новый файл выполняется');

  // «Скачать»: новый файл в архиве, в src/app/
  const downloadDir = join(OUT, 'download-new-file');
  rmSync(downloadDir, { recursive: true, force: true });
  mkdirSync(downloadDir, { recursive: true });
  const session = await page.createCDPSession();
  await session.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir });
  await page.$$eval('.toolbar .button', (els) => els.find((e) => e.textContent === 'Скачать')?.click());
  let zip;
  for (let i = 0; i < 40 && !zip; i++) {
    await wait(250);
    zip = readdirSync(downloadDir).find((name) => name.endsWith('.zip'));
  }
  const zipList = zip ? execSync(`unzip -l "${join(downloadDir, zip)}"`, { encoding: 'utf8' }) : '';
  expect(zipList.includes('/src/app/catalog/hello.ts'), 'новый файл в архиве «Скачать» — src/app/catalog/hello.ts');

  // Переименование: двойной щелчок по вкладке; импорт в main.ts ученик правит сам
  await clickTab('catalog/hello.ts');
  await wait(300);
  promptAnswers.push('catalog/greeting.ts');
  await page.$$eval('.tabs .tab', (els) =>
    els
      .find((e) => e.textContent.trim() === 'catalog/hello.ts')
      ?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })),
  );
  await wait(1000);
  list = await tabs();
  expect(
    list.includes('catalog/greeting.ts') &&
      !list.includes('catalog/hello.ts') &&
      (await activeTab()) === 'catalog/greeting.ts',
    'файл переименован, вкладка открыта',
  );
  let progress = await saved();
  expect(
    progress?.code?.['catalog/greeting.ts']?.includes('hello-from-new-file') && !('catalog/hello.ts' in progress.code),
    'переименование сохранено вместе с кодом',
  );

  // Удаление файла шага кнопкой у активной вкладки: сборка его больше не находит
  await clickTab('app.css');
  await wait(300);
  await page.click('.tab-group.active .file-action[title="Удалить файл"]');
  await wait(3000);
  expect(dialogs.at(-1)?.startsWith('confirm: Удалить файл «app.css»'), 'удаление спрашивает подтверждение');
  expect(!(await tabs()).includes('app.css'), 'файл шага удалён');
  expect((await consoleText()).includes('не найден файл «./app.css»'), 'сборка не находит удалённый файл');
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(3000);
  expect(!(await tabs()).includes('app.css'), 'после перезагрузки удалённый файл шага не возвращается');
  await page.screenshot({ path: `${OUT}/platform-files.png` });

  // «Сброс»: файлы шага как в начале
  await page.$$eval('.toolbar .button', (els) => els.find((e) => e.textContent === 'Сброс')?.click());
  await wait(3000);
  list = await tabs();
  expect(JSON.stringify(list) === JSON.stringify(stepTabs), '«Сброс» возвращает файлы шага');
  progress = await saved();
  expect(!progress?.code && !progress?.deleted, '«Сброс» очищает сохранённый код и список удалённых');
  expect(!(await consoleText()).includes('не найден файл'), 'после «Сброса» сборка без ошибок');

  // «Решение» (шаг 3.8): ровно файлы шага; «Вернуть мой код» — снова набор ученика
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/signals/practice`, { waitUntil: 'networkidle0' });
  await wait(2500);
  const practiceTabs = await tabs();
  promptAnswers.push('notes.ts');
  await page.click('.tab-add');
  await wait(500);
  await page.$$eval('.lesson-footer .button', (els) => els.find((e) => e.textContent === 'Решение')?.click());
  await wait(1500);
  list = await tabs();
  expect(JSON.stringify(list) === JSON.stringify(practiceTabs), `«Решение» — ровно файлы шага (${list.join(', ')})`);
  await page.$$eval('.lesson-footer .button', (els) => els.find((e) => e.textContent.includes('Вернуть'))?.click());
  await wait(1500);
  expect((await tabs()).includes('notes.ts'), '«Вернуть мой код» возвращает созданный файл');
}

await finish();
