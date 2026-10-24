---
title: Эффекты
startFrom: custom
focus: core/favorites-effects.ts
api: ['@ngrx/effects', createEffect, Actions, ofType, ROOT_EFFECTS_INIT, concatLatestFrom, provideEffects, мета-редьюсер, provideStoreDevtools]
---

После прошлого шага избранное не переживает перезапуск: сохранение в `localStorage` жило в `FavoritesStore`, а редьюсер — чистая функция, побочным эффектам в нём не место. В классическом Store для них есть отдельное место — **эффекты NgRx** (не путать с `effect()` Angular). А заодно посмотрим на то, чем классический Store гордится больше всего, — журнал действий.

## Что изменилось в коде

- `core/favorites-effects.ts` — заготовка эффектов: ключ, функция `readIds` (прочитать и проверить сохранённое), `TODO` для двух эффектов;
- `core/favorites-storage-actions.ts` — готовая группа действий хранилища браузера: `FavoritesStorageActions.restored({ ids })`;
- `core/action-log.ts` — готовый журнал действий, о нём ниже.

## Эффект — поток действий на входе

Store отправляет каждое действие не только редьюсерам, но и в поток **`Actions`**. Эффект NgRx — функция, которая слушает этот поток и что-то делает: обращается к серверу, к `localStorage`, к роутеру. А результат — если он есть — снова действие, которое Store отправит.

```
действие ─▶ редьюсеры ─▶ состояние
    │
    └─▶ эффекты ─▶ localStorage, сервер…
           │
           └─▶ новое действие
```

### Восстановить при запуске

```ts core/favorites-effects.ts
export const restoreFavorites = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      map(() => FavoritesStorageActions.restored({ ids: readIds() })),
    ),
  { functional: true },
);
```

`createEffect(функция, настройки)` — эффект. `functional: true` значит «эффект — функция, а не метод класса». Функция выполняется в контексте внедрения: зависимости — в значениях параметров по умолчанию, как в `withMethods`.

`ofType(…)` — оператор, который пропускает только действия нужных типов. `ROOT_EFFECTS_INIT` — служебное действие: Store отправляет его, когда эффекты запущены. В ответ эффект прочитал `localStorage` и вернул действие `restored` — Store отправит его, а редьюсер положит id в состояние:

```ts core/favorites-feature.ts
on(FavoritesStorageActions.restored, (_, { ids }) => ({ ids })),
```

Почему бы редьюсеру не прочитать `localStorage` самому, в начальном состоянии? Потому что тогда он перестал бы быть чистым: его результат зависел бы не только от состояния и действия. Чистый редьюсер легко тестировать и легко «проиграть заново» — на этом построена отладка, о которой ниже.

### Записывать после изменений

```ts core/favorites-effects.ts
export const saveFavorites = createEffect(
  (actions$ = inject(Actions), store = inject(Store)) =>
    actions$.pipe(
      ofType(GameCardActions.favoriteToggled),
      concatLatestFrom(() => store.select(favoritesFeature.selectIds)),
      tap(([, ids]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))),
    ),
  { functional: true, dispatch: false },
);
```

Эффекту нужны не данные действия, а **состояние после него**. `concatLatestFrom` из `@ngrx/operators` добавляет к каждому действию текущее значение потока: получается пара `[действие, ids]`. Редьюсер к этому моменту уже отработал — эффекты получают действие после редьюсеров. `store.select(…)` — селектор как поток (`Observable`), а не сигнал: здесь мы в мире RxJS.

`dispatch: false` — эффект ничего не возвращает в Store: запись в `localStorage` — конец пути.

### Подключить

```ts app.config.ts
provideEffects({ restoreFavorites, saveFavorites }),
```

::: task
1. В `favorites-effects.ts` напишите `restoreFavorites` и `saveFavorites`.
2. В редьюсер избранного добавьте `on(FavoritesStorageActions.restored, …)`.
3. В `app.config.ts` — `provideEffects({ restoreFavorites, saveFavorites })`.
4. Там же подключите журнал: `provideStore({}, { metaReducers })`, `metaReducers` — из `core/action-log.ts`.
:::

## Журнал действий

Откройте `core/action-log.ts`:

```ts core/action-log.ts
function logActions(reducer: ActionReducer<object>): ActionReducer<object> {
  return (state, action) => {
    const next = reducer(state, action);
    console.log('Действие:', action.type, JSON.stringify(next));
    return next;
  };
}
```

Это **мета-редьюсер** (meta-reducer): функция, которая принимает редьюсер всего Store и возвращает новый — обёртку. Каждое действие проходит через неё: обёртка зовёт настоящий редьюсер и печатает действие и состояние после него. `metaReducers` в настройках `provideStore` — список таких обёрток. Журнал включён только при разработке (`isDevMode()`).

## Что получилось

Перезапустите превью — в консоли:

```
Действие: @ngrx/store/init {}
Действие: @ngrx/store/update-reducers {"favorites":{"ids":[]}}
Действие: @ngrx/effects/init {"favorites":{"ids":[]}}
Действие: [Favorites Storage] Restored {"favorites":{"ids":[…]}}
Angular is running in development mode.
```

Служебные действия Store: создан, добавлены редьюсеры частей, запущены эффекты (`@ngrx/effects/init` — это и есть `ROOT_EFFECTS_INIT`). Следом — наше `Restored` с сохранёнными id. Всё это — до строки «Angular is running…»: избранное на месте ещё до первой отрисовки.

Щёлкните сердечко: `Действие: [Game Card] Favorite Toggled {"favorites":{"ids":[…]}}`. **Любое** изменение состояния — строка в журнале: какое действие, откуда и что стало. Сравните с Signal Store: там `patchState` можно вызвать из любого метода, и такой журнал пришлось бы собирать самим.

## Эксперименты

**Эффект без `dispatch: false`.** Уберите `dispatch: false` у `saveFavorites` и щёлкните сердечко. В консоли:

```
ERROR Error: Effect "saveFavorites()" dispatched an invalid action: [{"gameId":34,"type":"[Game Card] Favorite Toggled"},[34]]
```

По умолчанию Store отправляет всё, что выдал эффект, а наш эффект выдаёт пары `[действие, ids]` — это не действие. Верните настройку. Обратная ошибка опаснее: эффект, который возвращает то же действие, что слушает, отправляет его бесконечно.

**Журнал без своих действий.** Уберите `restoreFavorites` из `provideEffects` и перезапустите превью: в журнале нет `Restored`, сердечки пусты. Состояние меняется **только** действиями — нет действия, нет изменений. Верните.

::: tip Как в настоящем проекте: Redux DevTools
Наш журнал — бедный родственник **Redux DevTools**: расширения браузера, которое показывает каждое действие, состояние до и после, разницу — и умеет «отмотать» приложение к любому прошлому действию, заново проиграв редьюсеры. Подключают его так:

```ts
provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
```

`maxAge` — сколько последних действий помнить, `logOnly` — в собранном приложении только смотреть, без перемотки. Мы проверили: в превью без расширения `provideStoreDevtools` ничего не ломает, только в журнале появляются служебные действия `@ngrx/store-devtools/recompute`. Работу самого расширения в превью курса мы не проверяли — посмотрите на него в настоящем проекте в главе 20. У Signal Store официальной связи с Redux DevTools нет — так сказано в документации NgRx.
:::

::: legacy Вы встретите в старом коде: эффекты-классы
До функциональных эффектов их писали классом: `@Injectable() export class FavoritesEffects { private actions$ = inject(Actions); save$ = createEffect(() => this.actions$.pipe(…), { dispatch: false }); }` и подключали `provideEffects(FavoritesEffects)` или `EffectsModule.forRoot([FavoritesEffects])`. А ещё раньше — декоратором `@Effect()`. Вместо `concatLatestFrom` часто встречается `withLatestFrom` из RxJS — разница в том, что `concatLatestFrom` обращается к Store, только когда пришло действие.
:::
