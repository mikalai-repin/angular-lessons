---
title: Классический Store
startFrom: custom
focus: core/favorites-feature.ts
removedInSolution: [core/favorites-store.ts]
api: ['@ngrx/store', createActionGroup, props, createReducer, on, createFeature, createSelector, provideStore, provideState, Store.dispatch, selectSignal]
---

Signal Store появился в NgRx недавно. А большинство существующих проектов на NgRx написаны на **классическом Store** (`@ngrx/store`) — библиотеке, устроенной по образцу Redux. Скорее всего, на работе вы встретите именно его. Чтобы читать такой код, перепишем на нём то, что уже умеем делать иначе, — избранное. Сравнивать будет легко: у избранного одно поле состояния и одно действие.

## Что изменилось в коде

Две заготовки:

- `shared/game-card/game-card-actions.ts` — группа действий карточки игры, пока без действий;
- `core/favorites-feature.ts` — часть состояния «избранное»: начальное состояние и пустой редьюсер.

`core/favorites-store.ts` пока на месте — в конце шага его не станет.

## Одно состояние, действия и редьюсеры

Классический Store устроен иначе, чем всё, что мы делали до сих пор:

- **Одно состояние на всё приложение.** Не хранилище на тему, а один объект: `{ favorites: { ids: [4, 9] } }`. У каждой темы в нём — своя часть под своим ключом.
- **Компоненты не вызывают методы.** Они **отправляют действия** (actions) — объекты «что произошло»: `{ type: '[Game Card] Favorite Toggled', gameId: 4 }`. Знакомо по событиям прошлого шага — события Signal Store переняли эту идею у классического Store.
- **Новое состояние вычисляет редьюсер** — чистая функция «состояние и действие → новое состояние». Чистая — значит, без побочных эффектов: никакого `localStorage`, запросов, `console.log`. И состояние она **не меняет**, а возвращает новое.
- **Читают через селекторы** — функции «состояние → нужная часть».

```
           dispatch(действие)
компонент ───────────────────▶ Store
    ▲                            │ редьюсер
    │ selectSignal(селектор)     ▼
    └─────────────────────── состояние
```

Поток данных идёт по кругу и в одну сторону: действие → редьюсер → состояние → селектор → компонент → действие.

## Действия

```ts shared/game-card/game-card-actions.ts
export const GameCardActions = createActionGroup({
  source: 'Game Card',
  events: {
    'Favorite Toggled': props<{ gameId: number }>(),
  },
});
```

`createActionGroup` — как `eventGroup` из прошлого шага: источник и события. Имена событий пишут словами — `'Favorite Toggled'`, — а создатель действия получает имя в camelCase: `GameCardActions.favoriteToggled({ gameId: 4 })`. `props<…>()` — данные действия: в отличие от событий Signal Store, они лежат прямо в объекте действия, а не в `payload`. Действие без данных — `emptyProps()`.

Действие объявляет **источник** — карточка игры, — поэтому файл лежит рядом с ней. Имя — снова факт («сердечко переключили»), а не команда.

## Часть состояния и редьюсер

```ts core/favorites-feature.ts
export const favoritesFeature = createFeature({
  name: 'favorites',
  reducer: createReducer(
    initialState,
    on(GameCardActions.favoriteToggled, (state, { gameId }) => ({
      ids: state.ids.includes(gameId)
        ? state.ids.filter((id) => id !== gameId)
        : [...state.ids, gameId],
    })),
  ),
  extraSelectors: ({ selectIds }) => ({
    selectCount: createSelector(selectIds, (ids) => ids.length),
  }),
});
```

**`createReducer(начальное, on(…), …)`** — редьюсер. `on(создатель действия, функция)` — что сделать с состоянием на это действие. В отличие от `withReducer` функция возвращает **всё** новое состояние части, а не только изменения.

**`createFeature`** собирает часть состояния (feature): имя — ключ в общем объекте, редьюсер — и селекторы. Простые селекторы она создаёт **сама**: `selectFavoritesState` — вся часть, `selectIds` — по одному на каждое поле. Свои — в `extraSelectors`.

**`createSelector(селекторы…, функция)`** — селектор из других селекторов. Он **запоминает** результат: пока `selectIds` возвращает тот же массив, `ids.length` не пересчитывается. Это как `computed`, только для селекторов.

## Подключить Store

```ts app.config.ts
provideStore(),
provideState(favoritesFeature),
```

`provideStore()` создаёт Store — пустое состояние и поток действий. `provideState(часть)` добавляет в него часть со своим редьюсером. Части можно подключать и в `providers` ленивых маршрутов: их состояние появится, когда раздел загрузится.

## Читать и отправлять

Сервис `Store` из `@ngrx/store` даёт компонентам две вещи:

```ts shared/game-card/game-card.ts
private readonly store = inject(Store);
private readonly favoriteIds = this.store.selectSignal(
  favoritesFeature.selectIds,
);
protected readonly isFavorite = computed(() =>
  this.favoriteIds().includes(this.game().id),
);

protected toggleFavorite() {
  this.store.dispatch(
    GameCardActions.favoriteToggled({ gameId: this.game().id }),
  );
}
```

**`selectSignal(селектор)`** — значение селектора как сигнал: `computed` и шаблоны читают его как любой сигнал. **`dispatch(действие)`** — отправить действие.

::: task
1. В `game-card-actions.ts` добавьте действие `'Favorite Toggled'` с `props<{ gameId: number }>()`.
2. В `favorites-feature.ts` — `on(…)` в редьюсере и `extraSelectors` с `selectCount`.
3. В `app.config.ts` — `provideStore()` и `provideState(favoritesFeature)`.
4. `GameCard`: `isFavorite` — через `selectSignal(favoritesFeature.selectIds)`, метод `toggleFavorite()` с `dispatch`; в шаблоне — `(click)="toggleFavorite()"`.
5. `Header`: `favoritesCount = inject(Store).selectSignal(favoritesFeature.selectCount)`, в шаблоне — `favoritesCount()`.
6. `FavoritesPage`: `ids = inject(Store).selectSignal(favoritesFeature.selectIds)`, в ресурсе и шаблоне — `this.ids()` и `ids().length === 0`.
7. Удалите `core/favorites-store.ts`.
8. Тест карточки (`game-card.spec.ts`) тоже создаёт карточку — добавьте в его `providers` `provideStore()` и `provideState(favoritesFeature)`.
:::

## Что получилось

Сердечки работают, счётчик в шапке растёт, страница «Избранное» показывает отмеченные игры. Но перезапустите превью — избранное пусто. Сохранение в `localStorage` было в `FavoritesStore`, а редьюсер — чистая функция, ему туда нельзя. Где место побочным эффектам в классическом Store — в следующем шаге.

Заметьте, сколько файлов поменялось ради того же поведения: действия, часть состояния, конфигурация, три компонента и тест. С Signal Store компоненты не менялись совсем. Это цена явного потока данных: каждое изменение — действие, которое видно и в коде, и в журнале.

## Эксперименты

**Состояние не меняют.** Перепишите функцию в `on(…)` так, будто массив можно менять на месте:

```ts
(state, { gameId }) => {
  state.ids.push(gameId);
  return state;
},
```

TypeScript молчит: тип состояния изменения на месте не запрещает. Щёлкните сердечко: счётчик остаётся `♥ 0`, в консоли:

```
ERROR TypeError: Cannot add property 0, object is not extensible
```

При разработке Store **замораживает** состояние (`Object.freeze`): изменить его на месте нельзя, только вернуть новое. Это проверка Store во время выполнения — в собранном приложении её нет, и такой редьюсер молча сломал бы подписчиков: тот же массив — значит, «ничего не изменилось». Верните как было.

**Часть не подключена.** Уберите `provideState(favoritesFeature)`. Карточек на главной нет, в консоли — предупреждение и ошибки:

```
@ngrx/store: The feature name "favorites" does not exist in the state, therefore createFeatureSelector cannot access it.
ERROR TypeError: Cannot read properties of undefined (reading 'length')
```

Селекторы ищут `favorites` в общем состоянии и находят `undefined`. Верните строку.

::: legacy Вы встретите в старом коде: модули и `select`
До standalone-приложений Store подключали модулями: `StoreModule.forRoot({})` и `StoreModule.forFeature('favorites', reducer)` в `imports` у `NgModule` — эти имена есть даже в тексте предупреждения выше. Читали состояние потоком: `store.select(selectIds)` — это `Observable`, и в шаблоне его разворачивал пайп `async`: `@if (ids$ | async; as ids)`. Действия раньше объявляли по одному — `createAction('[Game Card] Favorite Toggled', props<…>())`, а ещё раньше — классами. Всё это работает и сейчас, а `selectSignal` и `createActionGroup` — то же самое, только короче.
:::
