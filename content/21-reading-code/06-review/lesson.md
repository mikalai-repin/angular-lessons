---
title: Что бы мы сделали иначе
noSolution: true
focus: app.config.ts
api: [git log, cherry-pick, withExperimentalPlatformNavigation, ErrorHandler, ресурсы против ручных подписок]
---

Мы прочитали angular.dev. Подведём честный итог в обе стороны: что стоит перенять в «Ход конём», что мы бы написали иначе — и что команда сама переписала за месяц после нашего коммита. Каждое замечание ниже найдено в коде и, где это возможно, проверено запуском. Не верьте на слово ни этому тексту, ни чужому коду.

## Что изменилось за месяц

Наш коммит — релиз v22.2.1 от 30 сентября. Живой сайт в день, когда мы писали главу, собран из `be309d5` ветки `22.2.x`. Между ними в `adev/src/app` и `shared-docs` — 62 изменённых файла: 1 253 строки добавлено, 3 515 удалено. Самое интересное:

| Коммит | Что сделали |
|---|---|
| [`e8e15c7`](https://github.com/angular/angular/commit/e8e15c70ab43ca29e9853711e51be87268c25f7a), 28.09 | «use routed component input binding instead of `ActivatedRoute`» — входы маршрута вместо подписок |
| [`41e4845`](https://github.com/angular/angular/commit/41e4845e3931fb12485b255518b4e8ec874662b7), 29.09 | самописный адаптер Navigation API заменён возможностью роутера |
| [`04a1eb2`](https://github.com/angular/angular/commit/04a1eb2f2f295989e3dfadf420635031574b3f6e), 14.10 | «remove unused home animation engine» — минус 2 818 строк в 22 файлах |
| [`b2398ec`](https://github.com/angular/angular/commit/b2398ecf30cbea8661a35f2740457144f05bbae8), 23.10 | интеграция с Navigation API отключена в Firefox |
| [`3bf3106`](https://github.com/angular/angular/commit/3bf31067c08e2ba64ed504d4b7b4ac12eb152289), [`268d6ba`](https://github.com/angular/angular/commit/268d6ba12c22f8d4f62cf5ab63daddfeaff6521c) | `@empty` у `@for` вместо отдельной проверки на пустой список |

В конце каждого сообщения — «(cherry picked from commit …)»: изменение сначала попадает в основную ветку `main`, а потом переносится в ветку выпуска `22.2.x`. Так устроен выпуск у самого Angular, и так же устроены многие большие проекты.

### Подписка → входы

В шаге 2 мы видели: `ReuseTutorialsRouteStrategy` переиспользует `Tutorial` между шагами, поэтому компонент подписывался на `route.data`. Коммит `e8e15c7` переписал это так, как мы делали весь курс, — входами из роутера (`withComponentInputBinding`, шаг 10.3):

```ts adev/src/app/features/tutorial/tutorial.component.ts (после e8e15c7)
readonly docContent = input<DocContent>();
readonly tutorialData = input<TutorialNavigationData>();
readonly path = input<string>();

readonly documentContent = computed(() => this.docContent()?.contents ?? null);

constructor() {
  effect(() => {
    const tutorialData = this.tutorialData();
    const path = this.path();
    …
    untracked(() => this.setTutorialData({path, label, parent, tutorialData}));
  });
}
```

Входы получили не только результат резолвера, но и поля пункта меню — `tutorialData`, `path`, `label`: `mapNavigationItemsToRoutes` кладёт весь пункт в `data` маршрута (шаг 2), а `withComponentInputBinding` отдаёт `data` во входы по именам. `documentContent` из записываемого сигнала стал `computed`. А `setTutorialData` вызывается в `untracked` (шаг 3.6): внутри он пишет в сигналы и читает их, и без `untracked` эффект подписался бы на всё, что прочитал этот метод.

### Самописный код → возможность фреймворка → откат в Firefox

Адаптер Navigation API из шага 2 прожил на сайте до 29 сентября. Коммит `41e4845` удалил 54 строки и добавил одну возможность роутера:

```ts adev/src/app/routing/router_providers.ts (после b2398ec)
const isPlatformNavigationSupported =
  typeof window !== 'undefined' &&
  (window as {navigation?: unknown}).navigation !== undefined &&
  !isFirefox;
…
...(isPlatformNavigationSupported ? [withExperimentalPlatformNavigation()] : []),
```

`withExperimentalPlatformNavigation` в Angular 22.2 помечена `@experimental 21.1` — это видно в типах `@angular/router`. Через три с половиной недели пришлось добавить `!isFirefox`. Из сообщения коммита `b2398ec`: Firefox до версии 159 **роняет вкладку**, когда роутер ведёт Navigation API при переходе к якорю — то есть каждый раз, когда посетитель пользуется оглавлением статьи. Проверка `typeof window` нужна потому, что на сервере (пререндер) у этой возможности нет реализации.

Урок двойной. Если фреймворк научился тому, что вы написали сами, — переходите: меньше своего кода. Но экспериментальный API могут поменять, и в нём бывают ошибки — у команды самого Angular тоже.

### Мёртвый код

«Unused home animation engine» — 22 файла с парсером CSS-значений, движком анимации по прокрутке и тестами. На нашем коммите их не импортирует ни один файл вне папки `features/home/animation/` (мы проверили поиском), но они лежали в репозитории, а их тесты выполнялись. Большой проект копит мёртвый код, пока его специально не ищут. `ng build` такой код в бандл не включит — но читать, поддерживать и тестировать его приходится.

## Что стоит перенять

**Обёртку над `localStorage`.** `LOCAL_STORAGE` не бросает исключений ни при запрете данных сайтов, ни при переполнении (шаг 3). Наш `BROWSER_STORAGE` бросает — что из этого выходит, увидим в практикуме.

**Обработчик «сайт обновился».** После выпуска новой версии у пользователя может быть открыта старая вкладка: она ссылается на чанки со старыми хешами, а их на хостинге больше нет. [`CustomErrorHandler`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/core/services/errors-handling/error-handler.ts#L28-L44) смотрит на первую строку сообщения:

```ts adev/src/app/core/services/errors-handling/error-handler.ts
if (this.isOnline && firstLine?.match(/chunk-(.*?)\.js/)) {
  // Trying to load a chunk that doesn't exist anymore
  // Users should reload the app.
  this.openErrorSnackBar();
  this.analyticsService.reportError('Chunk loading error');
}
```

И показывает «Our docs have been updated, reload the page to see the latest» с кнопкой «Reload». Мы проверили обе половины. В Chrome на angular.dev `import('/chunk-NOPE1234.js')` падает с `TypeError: Failed to fetch dynamically imported module: https://angular.dev/chunk-NOPE1234.js` — под шаблон подходит. А в нашем магазине ленивый маршрут с несуществующим модулем привёл ошибку навигации в `ErrorHandler`. Нашему магазину после деплоя (шаг 20.9) пригодится то же самое: корзина, оформление и вход — ленивые чанки.

**Плавную смену страниц без лишнего.** `onViewTransitionCreated` со `skipTransition()` для смены одних query-параметров (шаг 2, вы могли попробовать это в нашем каталоге).

**Мета-теги заголовка.** `og:title` и `twitter:title` в `TitleStrategy` — превью ссылок в соцсетях и мессенджерах будут с названием страницы. Пригодится, когда «Ход конём» перейдёт на SSR.

**Проверки содержимого при сборке.** Битая ссылка на якорь в статье — ошибка сборки, а не 404 у читателя.

## Что мы бы сделали иначе

**Переприсваивание сигнала.** В [`Tutorial`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/features/tutorial/tutorial.component.ts#L100) поле объявлено сигналом, а потом заменяется целиком:

```ts adev/src/app/features/tutorial/tutorial.component.ts
canRevealAnswer: Signal<boolean> = signal(false);
…
private async loadEmbeddedEditor() {
  const nodeRuntimeSandbox = await injectNodeRuntimeSandbox(this.environmentInjector);
  this.canRevealAnswer = computed(() => this.nodeRuntimeState.loadingStep() > LoadingStep.BOOT);
  …
}
```

Шаблон читает `canRevealAnswer()` в `[disabled]` кнопки «Reveal Answer». Компонент OnPush: о том, что в поле теперь другой сигнал, ему никто не сообщает — шаблон увидит новый `computed`, только когда компонент проверят по другой причине. На живом сайте кнопка включается (мы видели: `disabled` стал `false` на этапе «Installing packages»), но держится это на соседях, а не на коде кнопки. `NodeRuntimeState` внедрён в поле с самого начала, и проще объявить `readonly canRevealAnswer = computed(…)` сразу. Это место не изменилось и на `be309d5`.

**Три загрузки вместо одной.** Мы открыли [angular.dev/playground](https://angular.dev/playground) и записали запросы: `metadata.json` и `source-code.json` шаблона «hello world» — по три раза. В [`PlaygroundComponent`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/features/playground/playground.component.ts#L66-L106) к загрузке ведут три пути: эффект по входу `templateId` вызывает `changeTemplate` (загрузка), `changeTemplate` ставит в адрес `?templateId=…` — вход меняется, эффект выполняется снова (загрузка), а цепочка `forkJoin(...).pipe(switchMap(() => this.loadTemplate(…)))` загружает шаблон ещё раз. Эффект пишет в адрес, из которого сам же читает. Источник правды должен быть один — как в таблице админки, где сортировку и страницу хранит только адрес, а компонент лишь читает входы и переходит по ссылкам (шаг 17.2).

**`Number.isNaN` у строки.** [`AlertManager`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/editor/alert-manager.service.ts#L77-L85) читает счётчик вкладок из `localStorage`:

```ts adev/src/app/editor/alert-manager.service.ts
const countStoredInLocalStorage = this.localStorage?.getItem(WEBCONTAINERS_COUNTER_KEY);
if (!countStoredInLocalStorage || Number.isNaN(countStoredInLocalStorage)) {
  return 0;
}
return Number(countStoredInLocalStorage);
```

`Number.isNaN` не приводит аргумент к числу: `Number.isNaN('abc')` — `false` (проверили в Node.js). Испорченное значение пройдёт проверку, и метод вернёт `NaN`. Нужно `Number.isNaN(Number(…))`. TypeScript не помог: параметр `Number.isNaN` объявлен как `unknown`.

**Слушатели, которые копятся.** `startDevServer` в `NodeRuntimeSandbox` при каждом вызове добавляет `webContainer.on('server-ready', …)`, а функцию отписки, которую возвращает `on`, не сохраняет. Каждый перезапуск сервера кнопкой ⟳ — ещё один слушатель на тот же контейнер.

**Ошибки — все в 404.** `withNavigationErrorHandler` ведёт на «Страница не найдена» любую ошибку `HttpClient`, включая 500 и обрыв сети (шаг 2). Комментарий `TODO` в коде это признаёт. Наш `gameTitleResolver` различает 404 и остальное — вот что бы мы оставили.

**Окружение туториалов без lock-файла** — шаг 5: `^22.2.0-next` и `npm install` у каждого ученика.

**«Мягкая 404»** — шаг 4: хостинг отвечает 200 на любой адрес.

**Мелочи.** Два стиля состояния в одной папке (открытые записываемые сигналы рядом с `asReadonly`, шаг 3). `ThemeManager` вызывает глобальный `window.matchMedia`, хотя в проекте есть токен `WINDOW` (работает, потому что вызов под `isPlatformBrowser`). В навигации туториала `<a [routerLink]><button>…</button></a>` — по спецификации HTML внутри ссылки не должно быть интерактивного содержимого.

## Что у нас вышло не хуже

Не всё в angular.dev лучше нашего. Версии зависимостей в курсе точные. Ошибки резолвера мы различаем. Состояние в сервисах объявлено одним стилем. А на шаге 2 вы видели, что код сайта решает те же задачи теми же средствами, что «Ход конём»: резолверы, `withComponentInputBinding`, `TitleStrategy`, сигналы в сервисах, `injectAsync`, `@defer`. Курс учил тому, как пишут на Angular его авторы.

## Проверьте себя

::: task
1. Почему изменения на ветке `22.2.x` подписаны «(cherry picked from commit …)»?
2. Что произойдёт с кнопкой «Reveal Answer», если поле `canRevealAnswer` объявить `readonly canRevealAnswer = computed(…)` в начале класса?
3. В `localStorage` под ключом `numberOfWebcontainers` лежит `"abc"`. Что вернёт `getStoredCountOfWebcontainerInstances()`?
4. Что общего у адаптера Navigation API и `withExperimentalPlatformNavigation` и почему от второго пришлось отказаться в Firefox?
:::

::: hint Ответы
1. Изменение сначала делают в основной ветке `main`, потом переносят коммитом-копией в ветку выпуска, откуда собирается сайт и выходят патч-версии 22.2.x.
2. Шаблон с первой проверки будет читать один и тот же `computed`, который зависит от `loadingStep`. Когда шаг загрузки сменится, сигнал сам пометит компонент — кнопка включится без помощи соседей.
3. `NaN`: `Number.isNaN('abc')` — `false`, проверка пропустит строку, а `Number('abc')` — `NaN`.
4. Оба связывают навигацию роутера с Navigation API браузера, чтобы вкладка показывала загрузку, а «Стоп» отменял переход. Возможность роутера экспериментальная, и в Firefox до 159 она роняла вкладку при переходе к якорю — сайт откатился на обычную историю браузера.
:::
