---
title: Состояние и сервисы
noSolution: true
focus: core/browser-storage.ts
api: ['@Service()', 'autoProvided: false', InjectionToken, LOCAL_STORAGE, resource, debounced, linkedSignal, 'httpResource parse', injectAsync]
---

В главе 18 мы закончили правилом: сервиса на сигналах достаточно, пока хранилищ немного и правила помещаются в методы; данные сервера — ресурсам, фильтры — адресу, хранилищу — то, что создаёт сам пользователь. angular.dev — проверка этого правила на большом приложении. Библиотеки состояния в нём нет. Есть 29 классов с `@Service()`, сигналы и несколько токенов. Посмотрим, как этого хватает.

## 29 сервисов

Список легко собрать поиском по `@Service(`. 23 сервиса — `@Service()` без настроек, то есть один экземпляр на приложение (шаг 8.2). Шесть — с `autoProvided: false`:

| Сервис | Где подключён | Почему не корневой |
|---|---|---|
| `ContentLoader`, `ExampleContentLoader` | `app.config.ts`: `{provide: DOCS_CONTENT_LOADER, useClass: ContentLoader}` | их внедряют по токену библиотеки, а не по классу |
| `EditorUiState` | `providers` компонента `EmbeddedEditor` | своё состояние вкладок у каждого редактора |
| `SplitResizerHandler` | `providers` компонента `Tutorial` | разделитель «текст / редактор» одной страницы |
| `ReferenceScrollHandler` | `providers` страницы справочника API | прокрутка одной страницы |

Это те же два приёма, что у нас: `AdminGames` с `autoProvided: false` (шаг 8.4) в `providers` маршрута админки (шаг 17.5) и сервис уровня компонента (шаг 8.6). `autoProvided: false` защищает от ошибки: забыли подключить — `NG0201` сразу, а не тихий общий экземпляр на всё приложение.

## Закрытый сигнал, открытое чтение

[`NodeRuntimeState`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/editor/node-runtime-state.service.ts#L27-L54) — состояние встроенного редактора: шаг загрузки, сброс, ошибка.

```ts adev/src/app/editor/node-runtime-state.service.ts
@Service()
export class NodeRuntimeState {
  private readonly _loadingStep = signal<number>(LoadingStep.NOT_STARTED);
  loadingStep = this._loadingStep.asReadonly();

  private readonly _error = signal<NodeRuntimeError | undefined>(undefined);
  readonly error = this._error.asReadonly();

  setError({message, type}: NodeRuntimeError) {
    type ??= this.getErrorType(message);
    this._error.set({message, type});
    this.setLoadingStep(LoadingStep.ERROR);
  }
  …
}
```

Это наш `CartStore` из главы 9: записывает только сервис, остальные читают через `asReadonly()` (шаг 3.2), а правило «ошибка — значит и шаг загрузки ERROR» живёт в одном методе.

Рядом — [`EmbeddedTutorialManager`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/editor/embedded-tutorial-manager.service.ts#L22-L43) с другим стилем: `readonly tutorialFiles = signal(…)`, `readonly openFiles = signal(…)` — десяток открытых записываемых сигналов. `readonly` защищает поле от замены, но не сигнал от записи: любой, кто внедрил сервис, может вызвать `tutorialFiles.set(…)`. В одном проекте, даже в одной папке `editor/`, два стиля. Это обычное дело для кода, который пишут несколько лет разные люди, — вернёмся к этому в шаге 6.

## Сигнал в токене

Диалог поиска открывают и закрывают четыре компонента: `AppComponent` (сочетание клавиш, Escape, переход на другую страницу, событие закрытия от самого диалога), меню, главная страница и `MainComponent` (`?search=`). Общее состояние — одно логическое значение. Ради него не стали писать класс:

```ts adev/shared-docs/providers/is-search-dialog-open.ts
export const IS_SEARCH_DIALOG_OPEN = new InjectionToken('', {
  factory: () => signal(false),
});
```

Токен с фабрикой, которая возвращает **сигнал**. Все, кто сделал `inject(IS_SEARCH_DIALOG_OPEN)`, получают один и тот же `WritableSignal<boolean>`: шаблон `AppComponent` читает `displaySearchDialog()`, главная вызывает `displaySearchDialog.set(true)`.

`providedIn` не указан, но токен корневой: если у `InjectionToken` есть фабрика, Angular подставляет `providedIn: options.providedIn || 'root'` (так в коде `InjectionToken`). Значит, `providedIn: 'root'` в нашем `BROWSER_STORAGE` можно было не писать — это значение по умолчанию.

Цена приёма — та же, что у открытых сигналов выше: правил нет, писать может кто угодно. Для одного флага это нормально. Появись у диалога правила («не открывать, пока идёт навигация»), понадобился бы сервис с методом.

## `LOCAL_STORAGE` — наш `BROWSER_STORAGE`

Откройте в редакторе `core/browser-storage.ts` и рядом — [`shared-docs/providers/local-storage.ts`](https://github.com/angular/angular/blob/fb7711f/adev/shared-docs/providers/local-storage.ts):

```ts adev/shared-docs/providers/local-storage.ts
export const LOCAL_STORAGE = new InjectionToken<Storage | null>('LOCAL_STORAGE', {
  factory: () => getStorage(inject(PLATFORM_ID)),
});

const getStorage = (platformId: Object): Storage | null => {
  // Prerendering: localStorage is undefined for prerender build
  return isPlatformBrowser(platformId) ? new LocalStorage() : null;
};

/**
 * LocalStorage is wrapper class for localStorage, operations can fail due to various reasons,
 * such as browser restrictions or storage limits being exceeded. A wrapper is providing error handling.
 */
class LocalStorage implements Storage {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  … // так же length, clear, key, removeItem, setItem
}
```

Та же идея, что в шаге 20.7, вплоть до типа `Storage | null` и проверки `isPlatformBrowser`. Одно отличие: вместо самого `localStorage` — обёртка, у которой каждая операция в `try`/`catch`. Комментарий называет причины: ограничения браузера и превышение квоты.

Это не перестраховка. Мы проверили в Chrome: если в настройках запрещено сохранять данные сайтов, уже **чтение свойства** `window.localStorage` бросает `SecurityError: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.` А `setItem` бросает `QuotaExceededError`, когда место кончилось. Что в таком браузере станет с нашим магазином — и как это исправить приёмом angular.dev — практикум этой главы.

## Поиск — наша таблица админки

Сервис [`Search`](https://github.com/angular/angular/blob/fb7711f/adev/shared-docs/services/search.service.ts#L44-L74) — самое плотное место сайта по сигналам:

```ts adev/shared-docs/services/search.service.ts
readonly searchQuery = signal('');

debounceParams = debounced(this.searchQuery, SEARCH_DELAY);

readonly resultsResource = resource({
  params: () => this.debounceParams.value() || undefined, // coerces empty string to undefined
  loader: async ({params}) => this.searchWithQuery(params),
});

readonly searchResults = linkedSignal<SearchResultItem[] | undefined, SearchResultItem[]>({
  source: this.resultsResource.value,
  computation: (next, prev) => (!next && this.searchQuery() ? prev?.value : next) ?? [],
});
```

Сравните с `admin/games-table/games-table.ts` из главы 17 — те же три кирпича:

- **`debounced`** (`@experimental 22.0`, шаг 11.7) — запрос, когда пользователь сделал паузу: у нас 300 мс, здесь `SEARCH_DELAY` — 200.
- **`resource`**, а не `httpResource`: поиск идёт не через `HttpClient`, а через клиент Algolia, который возвращает промис. `params` возвращает `undefined` для пустой строки — ресурс в покое, запроса нет (шаг 11.6).
- **`linkedSignal`** держит прошлые результаты, пока грузятся новые: значения нет, а запрос не пустой — остаётся `prev`. У нас так держит строки таблицы `shown`.

Ещё один `linkedSignal`, `emptyState`, решает, что показать в пустом списке: «начните вводить» или «ничего не найдено». Пока пользователь печатает или идёт запрос, он помнит прошлое состояние — и «ничего не найдено» не мигает на каждой букве.

## `httpResource` с проверкой ответа

[`VersionManager`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/core/services/version-manager.service.ts#L46-L81) — список версий документации в меню (v22, v21…):

```ts adev/src/app/core/services/version-manager.service.ts
// This handle the fallback if the resource fails.
readonly versions = computed(() => {
  return this.remoteVersions.hasValue() ? this.remoteVersions.value() : this.localVersions;
});

remoteVersions = httpResource(
  () => ({
    url: `${ANGULAR_DEV}/assets/others/versions.json`,
    transferCache: false,
    cache: 'no-cache',
  }),
  {
    parse: (json: unknown) => {
      if (!Array.isArray(json)) {
        throw new Error('Invalid version data');
      }
      return json.map(…);
    },
  },
);
```

Три новых для нас детали:

- **`parse`** — функция, через которую проходит ответ, прежде чем стать значением ресурса. Она получает `unknown` и может проверить данные: не массив — исключение. Мы проверили на нашем магазине: если `parse` бросает, `status()` ресурса — `'error'`, `hasValue()` — `false`, в `error()` — брошенная ошибка. Ровно на этом держится запасной вариант: `versions` берёт список с сервера, а если его нет или он испорчен — локальный JSON из сборки.
- **`transferCache: false`** — не класть этот ответ в `ng-state` при пререндере (шаг 20.8). Список версий должен быть свежим, а не замороженным на момент сборки.
- **`cache: 'no-cache'`** — настройка Fetch API: перепроверить ответ у сервера, даже если он есть в кэше браузера. Работает, потому что в Angular 22 `HttpClient` по умолчанию ходит через `fetch` (шаг 11.2).

## Кэш промисов

[`ContentLoader`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/core/services/content-loader.service.ts#L19-L45) загружает статьи и помнит их — но не ответы, а **промисы**:

```ts adev/src/app/core/services/content-loader.service.ts
let promise = this.cache.get(path);
if (!promise) {
  promise = firstValueFrom(this.httpClient.get(`assets/content/${path}`, {responseType: 'text'}).pipe(…));
  this.cache.set(path, promise);
}
return await promise;
```

Промис попадает в `Map` сразу, до ответа. Два одновременных запроса одной статьи (резолвер и, например, предзагрузка) получат один и тот же промис — запрос уйдёт один. А в `catch` ошибка, кроме 404, удаляет промис из кэша: «404 считаем постоянной, остальные могут быть временными». У нас похожую работу делает `cacheInterceptor` (шаг 12.8): он кэширует ответы по метке `CACHE` для любых запросов. Здесь проще — кэш живёт в единственном сервисе, которому он нужен.

## Неизменяемые обновления

[`SearchHistory`](https://github.com/angular/angular/blob/fb7711f/adev/shared-docs/services/search-history.service.ts#L112-L121) хранит недавние и избранные результаты поиска в `Map` внутри сигнала:

```ts adev/shared-docs/services/search-history.service.ts
private updateHistory(updateFn: (map: Map<string, HistoryItem>) => void): void {
  const history = new Map(this.history());
  updateFn(history);
  this.history.set(history);

  try {
    this.localStorage?.setItem(SEARCH_HISTORY_LS_KEY, JSON.stringify(this.allItems()));
  } catch {}
}
```

Сначала копия, потом изменения, потом `set` — потому что сигнал сравнивает значения через `Object.is`, и изменённая на месте `Map` для него «та же» (шаг 3.4). Ключ в `localStorage` — `docs-search-history-v1`, с версией в имени, «на случай, если модель данных изменится», как наш `hod-konem:cart:v2`. А вокруг `setItem` — ещё один `try`, хотя `LOCAL_STORAGE` и так не бросает: защита в два слоя.

## Ленивые сервисы

Код встроенного редактора — 538 строк одного `NodeRuntimeSandbox` и библиотека WebContainers — нужен только на страницах туториалов и песочницы. Его загружают через `injectAsync` (`@publicApi 22.0`, шаг 8.7):

```ts adev/src/app/editor/inject-node-runtime-sandbox.ts
export function injectNodeRuntimeSandbox(injector: EnvironmentInjector) {
  return runInInjectionContext(injector, () =>
    injectAsync(() => import('./node-runtime-sandbox.service').then((c) => c.NodeRuntimeSandbox))(),
  );
}
```

Зачем обёртка с `runInInjectionContext`? `injectAsync` работает только в контексте внедрения, а редактор нужен в методах после `await` — там контекста уже нет (шаг 8.3). Функция берёт инжектор, запомненный в поле компонента, и вызывает `injectAsync` «как будто» в конструкторе. Первый вызов загрузит модуль и создаст сервис, следующие получат тот же экземпляр.

## Где остался RxJS

`subscribe` в коде — 35 раз, `takeUntilDestroyed` — 24. Почти всё — **события**: `router.events` (заголовок, прокрутка, аналитика), `fromEvent` по ссылкам в статье, потоки вывода процессов в WebContainers. Даже сервис туториалов, где состояние — сигналы, сообщает о смене проекта потоком `tutorialChanged$`: это событие («проект сменился»), а не значение. Состояние — сигналам, события — RxJS: то же разделение, к которому мы пришли в главе 12.

## Проверьте себя

::: task
1. Почему `IS_SEARCH_DIALOG_OPEN` доступен во всём приложении, хотя ни в токене, ни в `app.config.ts` нет `providedIn: 'root'`?
2. Сервер версий вернул `{"error": "maintenance"}`. Что покажет меню версий?
3. Чем кэш промисов в `ContentLoader` лучше кэша ответов, если резолвер и предзагрузка одновременно просят одну статью?
4. Что случится, если в `SearchHistory.updateHistory` заменить `new Map(this.history())` на `this.history()`?
:::

::: hint Ответы
1. У токена есть фабрика, а для такого токена `providedIn` по умолчанию — `'root'`: значение создаёт корневой инжектор, один раз на приложение.
2. Локальный список из сборки: `parse` бросит «Invalid version data» (не массив), ресурс уйдёт в ошибку, `hasValue()` станет `false`, и `versions` вернёт `localVersions`.
3. Промис кладётся в кэш до ответа: второй запрос получит тот же промис и не пойдёт на сервер. Кэш ответов узнал бы об ответе только после первого запроса — ушло бы два.
4. `updateFn` изменит ту же `Map`, а `set` с тем же объектом сигнал сочтёт «без изменений»: `computed` (`allItems`, `items`) не пересчитаются, и список на экране не обновится.
:::
