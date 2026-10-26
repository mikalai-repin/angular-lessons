---
title: Маршруты из данных
noSolution: true
focus: app.routes.ts
api: [mapNavigationItemsToRoutes, export default, RedirectCommand, withNavigationErrorHandler, canceledNavigationResolution, isActive, skipTransition, RouteReuseStrategy, UrlSerializer]
---

Наш `app.routes.ts` открыт в редакторе: дюжина маршрутов, каждый написан руками. У angular.dev страниц больше полутора тысяч. Писать их по одной никто не стал — маршруты **строятся из данных**. Разберём, как, и посмотрим на настройки роутера, которых у нас нет.

## Корень

Конец [`routing/routes.ts`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/routing/routes.ts#L128-L164) — вся карта сайта:

```ts adev/src/app/routing/routes.ts
export const routes: Route[] = [
  {
    path: '',
    component: MainComponent,
    children: [
      {path: '', loadComponent: () => import('../features/home/home.component'), data: {label: 'Home'}},
      {path: PAGE_PREFIX.DOCS, redirectTo: DEFAULT_PAGES.DOCS},
      {path: PAGE_PREFIX.REFERENCE, redirectTo: DEFAULT_PAGES.REFERENCE},
      {path: PAGE_PREFIX.PLAYGROUND, loadComponent: () => import('../features/playground/playground.component'), …},
      ...SUB_NAVIGATION_ROUTES,
      ...API_REFERENCE_ROUTES,
      ...FOOTER_ROUTES,
      updateGuidePageRoute,
      ...REDIRECT_ROUTES,
    ],
  },
  {
    path: '**',
    loadComponent: () => import('../features/not-found/not-found').then((m) => m.NotFound),
    data: {label: 'Page not found'},
  },
];
```

Всё, кроме 404, — дети одного маршрута с пустым путём и компонентом [`MainComponent`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/main.component.ts). Его шаблон — один `<router-outlet />`. Зачем пустая обёртка? Ради одного входа:

```ts adev/src/app/main.component.ts
readonly search = model<string | undefined>('');

constructor() {
  effect(() => {
    const search = this.search();
    if (search !== undefined) {
      this.displaySearchDialog.set(true);
      this.searchService.searchQuery.set(search);
    }
  });
}
```

`withComponentInputBinding` кладёт query-параметр `?search=` во вход компонента маршрута — как наш `?q=` в каталоге (шаг 10.4). `MainComponent` — компонент маршрута для **любой** страницы сайта, поэтому ссылка вида [angular.dev/?search=linkedSignal](https://angular.dev/?search=linkedSignal) открывает поиск с готовым запросом. Мы проверили на живом сайте: диалог поиска открылся, в поле — `linkedSignal`, ниже — результаты.

## Маршрут из пункта меню

Пункты меню лежат в [`navigation-entries/index.ts`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/routing/navigation-entries/index.ts) — 1 839 строк вида `{label: 'Overview', path: 'guide/signals', contentPath: 'guide/signals/overview'}`. Маршруты из них строит функция [`mapNavigationItemsToRoutes`](https://github.com/angular/angular/blob/fb7711f/adev/shared-docs/utils/navigation.utils.ts#L94-L123) из `@angular/docs`:

```ts adev/shared-docs/utils/navigation.utils.ts
navigationItems
  .filter((route) => Boolean(route.path) && !isExternalLink(route.path!))
  .map((navigationItem) => {
    const route = {path: navigationItem.path, ...additionalRouteProperties};
    route.data = {...navigationItem, ...route.data};
    route.resolve = {
      'docContent': (snapshot: ActivatedRouteSnapshot) => {
        return snapshot.data['contentPath'] !== undefined
          ? inject(DOCS_CONTENT_LOADER).getContent(snapshot.data['contentPath'])
          : undefined;
      },
      ...route.resolve,
    };
    return route;
  });
```

Три приёма в нескольких строках:

- **Весь пункт меню — в `data` маршрута.** Название (`label`) потом прочитает стратегия заголовка, путь к статье (`contentPath`) — резолвер, родительский пункт (`parent`) — заголовок и хлебные крошки. Маршрут знает о себе всё, что знает меню.
- **Резолвер — стрелочная функция прямо в маршруте.** `inject` внутри работает: резолвер выполняется в контексте внедрения, как наш `gameTitleResolver` (шаг 10.8).
- **`additionalRouteProperties`** — что добавить каждому маршруту группы. В `routes.ts` у статей это `loadComponent` с `DocsComponent` и `data: {displaySecondaryNav: true}`, у туториалов — `Tutorial` и `hideFooter: true`. Сотни маршрутов — один ленивый компонент: его код загрузится один раз.

Так же строятся справочник API — из `manifest.json`, который сборка получает из исходников фреймворка ([`manifest.helper.ts`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/features/references/helpers/manifest.helper.ts)), — страницы CLI и подвал. Зачем всё это? **Один источник правды**: меню и маршруты не могут разойтись. Новая статья — это пункт меню и файл `.md`, а маршрут, заголовок вкладки и крошки появятся сами. Нашему магазину такое ни к чему: страниц мало, и все разные. Маршруты из данных окупаются, когда страниц много и они одинаково устроены.

## `export default` и `loadComponent`

Обратите внимание: `import('../features/home/home.component')` — без `.then((m) => m.Home)`, как у нас. В `home.component.ts` класс объявлен как `export default class Home`, и роутер сам достаёт `default` из загруженного модуля (в коде роутера это делает `ɵmaybeUnwrapDefaultExport`). А `NotFound` экспортирован по имени — для него `.then` на месте.

::: task
Попробуйте в нашем магазине. В `not-found/not-found.ts` напишите `export default class NotFound`, а в `app.routes.ts` уберите импорт `NotFound` и сделайте маршрут `'**'` ленивым:

```ts app.routes.ts
loadComponent: () => import('./not-found/not-found'),
```

Откройте в адресной строке превью `/nope` — «Нет такой страницы» на месте. Теперь уберите `default`. Редактор подчеркнёт `loadComponent`, и в консоли появится строка с меткой `TS`: `Type '() => Promise<typeof import(…)>' is not assignable to type …` — модуль не `Type<unknown>` и не `DefaultExport<Type<unknown>>`. А превью покажет `NG04014: Invalid configuration of route '**'. The component must be standalone.` Сообщение сбивает с толку: роутер получил не класс, а объект модуля. Верните код кнопкой «Сброс».
:::

## Старые адреса не ломаются

[`routing/redirections.ts`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/routing/redirections.ts) — 40 переадресаций с комментарием: «держим их, чтобы не ломались ссылки, которые есть в интернете и над которыми у нас нет власти». Статьи переезжают, а ссылки на них остаются в блогах и ответах на форумах:

```ts adev/src/app/routing/redirections.ts
{path: 'guide/defer', redirectTo: '/guide/templates/defer'},
{path: 'guide/templates/property-binding', redirectTo: '/guide/templates/binding#binding-dynamic-properties-and-attributes'},
{path: 'signal-forms', redirectTo: '/playground?templateId=4-signal-forms'},
```

Цель — всегда абсолютная, со `/` в начале (так требует комментарий в файле), и может вести на якорь внутри статьи или в песочницу с параметром. Наш аналог — `game/:id` → `/games/:id` из шага 10.9. На статическом сайте переадресацию некому сделать на сервере, и пререндер превратил её в отдельную крошечную страницу. Мы запросили [angular.dev/guide/defer](https://angular.dev/guide/defer) без браузера — пришли 288 байт:

```html
<title>Redirecting</title>
<meta http-equiv="refresh" content="0; url=/guide/templates/defer">
```

## Ошибка навигации — на 404

Резолвер статьи может не получить файл: статьи нет или сеть упала. У нас эту ошибку ловит сам `gameTitleResolver` и отвечает «Игра не найдена». angular.dev ловит ошибки всех резолверов в одном месте — в настройках роутера:

```ts adev/src/app/routing/router_providers.ts
withNavigationErrorHandler(({error}) => {
  if (error instanceof HttpErrorResponse) {
    // TODO: Redirect to different pages on different response codes? (e.g. 500 page)
    return new RedirectCommand(inject(Router).parseUrl('/404'));
  }
  return void 0;
}),
```

**`withNavigationErrorHandler`** вызывается, когда навигация упала с ошибкой (здесь — ошибка `HttpClient` в резолвере). Функция выполняется в контексте внедрения и может вернуть **`RedirectCommand`** — тогда вместо ошибки роутер переадресует. Адреса `/404` в карте нет, его поймает `'**'`. Комментарий `TODO` честно признаёт упрощение: и 500, и обрыв сети тоже приведут на «Страница не найдена».

Сама [`NotFound`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/features/not-found/not-found.ts) не просто извиняется: она берёт слова из адреса и ищет их через тот же сервис поиска. Откройте [angular.dev/guide/no-such-page](https://angular.dev/guide/no-such-page) — под «Page Not Found» будут результаты поиска по «guide no such page».

## Пять возможностей роутера

[`router_providers.ts`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/routing/router_providers.ts#L36-L75):

| Возможность | Что делает | У нас |
|---|---|---|
| `withInMemoryScrolling()` | события прокрутки роутера; прокручивает сам сервис `AppScroller` | `scrollPositionRestoration: 'enabled'` |
| `withRouterConfig({canceledNavigationResolution: 'computed'})` | отменённая навигация возвращает историю браузера на прежнее место | — |
| `withNavigationErrorHandler` | ошибка `HttpClient` → `/404` | ошибку ловит резолвер |
| `withViewTransitions({onViewTransitionCreated})` | без анимации, если меняются только query-параметры и якорь | `withViewTransitions()` |
| `withComponentInputBinding()` | `docContent`, `search` — во входы | так же |

**Прокрутка.** Почему не `scrollPositionRestoration: 'enabled'`, как у нас? Статья появляется не сразу после навигации: `DocViewer` вставляет HTML и создаёт в нём компоненты асинхронно. [`AppScroller`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/app-scroller.ts#L59-L80) ловит события `Scroll` роутера, ждёт `appRef.isStable` — приложения без ожидающих задач (шаг 11.10) — и прокручивает в фазе `write` у `afterNextRender`. Ещё он учитывает высоту шапки: отступ 64, 140 или 24 пикселя в зависимости от ширины экрана (`setOffset`).

**Отменённая навигация.** По умолчанию (`'replace'`) роутер, отменив навигацию, просто заменяет текущую запись истории. С `'computed'`, как сказано в документации опции, он пытается вернуться к той же позиции в истории: нажали «Назад», навигацию отменил гард — роутер сделает шаг вперёд, и кнопки браузера останутся честными.

**Плавная смена страниц** — с исключением:

```ts adev/src/app/routing/router_providers.ts
onViewTransitionCreated: ({transition, to}) => {
  const router = inject(Router);
  const toTree = createUrlTreeFromSnapshot(to, []);
  // Skip the transition if the only thing changing is the fragment and queryParams
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
```

`onViewTransitionCreated` вызывается, когда роутер начал переход View Transitions. **`isActive`** (`@publicApi 21.1`) возвращает сигнал «активен ли этот адрес» — то, чем пользуется `routerLinkActive`, только в коде. Если путь тот же и поменялись только query-параметры или якорь, переход пропускается: ни к чему «перелистывать» страницу, когда меняется только сортировка.

::: task
Попробуйте в `app.config.ts` магазина: замените `withViewTransitions()` на вариант с `onViewTransitionCreated`, как выше (импорты `Router`, `createUrlTreeFromSnapshot` и `isActive` — из `@angular/router`). Откройте каталог и смените сортировку: страница обновится без анимации. Щелчок по карточке — анимация на месте.
:::

В консоли при этом появится `AbortError: Transition was skipped. skipTransition() called` — при каждой смене сортировки и при запуске на главной: первая навигация приложения тоже ведёт «на тот же адрес». Это не ошибка вашего кода: пропущенный переход отклоняет свой промис `ready`, а роутер в режиме разработки печатает каждое такое отклонение. В продакшен-сборке консоль молчит — тот же случай, что `AbortError` при быстром наборе в поиске каталога.

## Две стратегии и сериализатор

**`RouteReuseStrategy`.** В шаге 10.11 мы видели, что стандартная стратегия оставляет компонент, если маршрут тот же объект из карты (`future.routeConfig === curr.routeConfig`). У каждого шага туториала свой маршрут — значит, при переходе к следующему шагу компонент `Tutorial` уничтожался бы вместе со встроенным редактором. А редактор запускает в браузере Node.js и `npm install` (шаг 5) — это десятки секунд. [`ReuseTutorialsRouteStrategy`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/features/tutorial/tutorials-route-reuse-strategy.ts) добавляет правило: между двумя страницами туториала компонент переиспользуется. Поэтому `Tutorial` получает новый шаг не в конструкторе, а подпиской на данные маршрута — экземпляр живёт, пока ученик идёт по шагам.

**`TitleStrategy`.** [`ADevTitleStrategy`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/core/services/a-dev-title-strategy.ts) берёт `label` из `data` самого глубокого маршрута, добавляет родителя, если страница называется «Overview», — и пишет тот же заголовок в мета-теги `og:title` и `twitter:title`. В пререндеренном HTML статьи о сигналах так и есть: `<title>Signals • Overview • Angular</title>` и два `<meta>` с тем же текстом — их читают соцсети, когда показывают превью ссылки. Наш `ShopTitleStrategy` (шаг 10.8) делает первую половину.

**`UrlSerializer`.** [`AdevUrlSerializer`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/core/services/routing/adev-url-serializer.ts) перед разбором адреса заменяет `%2F` на `/`. Комментарий объясняет: хостинг раскодирует закодированные косые черты, и клиент делает так же, чтобы при гидратации не открыть другую страницу (скорее всего, 404). Сервер и браузер должны понимать адрес одинаково — та же мысль, что в шаге 20.8.

## Адаптер, которого больше нет

В конце файла — 54 строки функции [`initializeNavigationAdapter`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/routing/router_providers.ts#L94-L147). Она связывает роутер с **Navigation API** браузера: пока Angular переходит на новую страницу, вкладка показывает индикатор загрузки, а кнопка «Обновить» превращается в «Стоп» — как при обычном переходе по ссылке. Роутер этого не умел, и команда сайта написала адаптер сама: перехват события `navigate`, промис, который отклоняется на `NavigationCancel` и `NavigationError`.

Через месяц адаптер удалили — роутер научился этому сам. Чем это кончилось, разберём в шаге 6.

## Проверьте себя

::: task
1. Откуда у вкладки статьи о сигналах заголовок «Signals • Overview • Angular», если в меню пункт называется просто «Overview»?
2. Что увидит пользователь, открыв ссылку `angular.dev/guide/defer` из старой статьи в блоге, и кто это сделает — сервер или Angular?
3. Почему компонент `Tutorial` не может прочитать данные шага один раз в конструкторе?
4. Вы открыли `angular.dev/?search=resource`. Какой компонент получил `resource` и как?
:::

::: hint Ответы
1. `ADevTitleStrategy.buildTitle`: если `label` начинается с «Overview» и у пункта есть родитель, к заголовку спереди добавляется `label` родителя — «Signals».
2. Статью `/guide/templates/defer`. Пререндер сделал для старого адреса страницу с `<meta http-equiv="refresh">`, её отдаёт хостинг — переадресует браузер. Если перейти по старому адресу внутри открытого сайта, переадресует роутер по `REDIRECT_ROUTES`.
3. `ReuseTutorialsRouteStrategy` оставляет тот же экземпляр между шагами туториала: конструктор выполнится один раз, а данные маршрута будут меняться. Их нужно получать подпиской (или, как сделали потом, входами — шаг 6).
4. `MainComponent` — компонент маршрута для всех страниц: `withComponentInputBinding` положил query-параметр `search` в его вход `search` (`model`), а эффект открыл диалог поиска с этим запросом.
:::
