---
title: Своё расширение
startFrom: custom
focus: core/with-storage.ts
api: [signalStoreFeature, type, getState, watchState, PartialStateUpdater]
---

Корзина и избранное делают одно и то же: при создании читают себя из `localStorage`, а потом записывают туда каждое изменение. Код почти одинаковый — `JSON.parse`, проверка прочитанного, `effect` с `JSON.stringify` — и живёт в двух местах. В классе-сервисе общий код выносят в базовый класс или в функцию. В Signal Store есть приём удобнее: **своё расширение** — новая часть `with…`, которую подключают к любому хранилищу так же, как `withState` или `withHooks`.

## Что изменилось в коде

Новый файл `core/with-storage.ts` — заготовка расширения `withStorage`: описание настроек и каркас функции, в `onInit` — `TODO`.

## Расширение — это части, собранные вместе

Своё расширение (custom store feature) делают функцией `signalStoreFeature`. Она принимает части — те же `withState`, `withComputed`, `withHooks` — и склеивает их в одну:

```ts
export function withStorage(key: string) {
  return signalStoreFeature(
    withHooks({
      onInit(store) { … },
    }),
  );
}
```

Подключают его как любую часть: `withStorage('hod-konem:favorites:v1')`.

Но расширению мало знать ключ. Ему нужно ещё:

- **что сохранять.** Избранному — массив id, корзине — позиции по порядку, но не `entityMap` с `ids` по отдельности и не промокод;
- **как восстанавливать.** Прочитанному не доверяем: проверить, отбросить лишнее, превратить в состояние.

Это две функции, и они разные у каждого хранилища. Передадим их в настройках:

```ts core/with-storage.ts
export interface StorageConfig<State extends object> {
  save: (state: State) => unknown;
  restore: (saved: unknown) => Partial<State> | PartialStateUpdater<State>;
}
```

`restore` возвращает то же, что принимает `patchState`: часть состояния или функцию обновления. Корзине так удобно вернуть `setAllEntities(…)`.

## Что расширению нужно от хранилища

Внутри `onInit` расширение зовёт `patchState(store, …)` и `getState(store)`. Чтобы TypeScript это пропустил, он должен знать, какое у хранилища состояние. Это описывают первым аргументом `signalStoreFeature`:

```ts core/with-storage.ts
export function withStorage<State extends object>(
  key: string,
  config: StorageConfig<State>,
) {
  return signalStoreFeature(
    { state: type<State>() },
    withHooks({
      onInit(store) { … },
    }),
  );
}
```

`{ state: type<State>() }` читается так: «подключать к хранилищу, у которого есть состояние типа `State`». Знакомая функция `type` снова передаёт тип там, где ожидается значение. Кроме `state` можно потребовать `props` и `methods`.

`State` здесь — параметр-тип, и указывать его руками не нужно. Его **выводит TypeScript** из хранилища, к которому подключено расширение: в избранном это `{ ids: number[] }`, в корзине — состояние коллекции и промокод. Поэтому `save: ({ ids }) => ids` в избранном проверяется по-настоящему.

## Восстановить и записывать

```ts core/with-storage.ts
onInit(store) {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    patchState(store, config.restore(saved));
  } catch {
    // Не JSON — остаётся начальное состояние
  }
  effect(() =>
    localStorage.setItem(key, JSON.stringify(config.save(getState(store)))),
  );
},
```

**`getState(store)`** собирает текущее состояние в обычный объект: `{ ids: [4, 9] }`. Он читает сигналы всех полей состояния, поэтому эффект перезапускается при любом изменении — и записывает свежий снимок.

Записывать можно и через **`watchState(store, (state) => …)`**. Разница — в моменте. Эффект выполняется позже и один раз на все изменения, сделанные подряд. `watchState` вызывает функцию сразу и на **каждый** `patchState`. Мы проверили: два `toggle` подряд в `onInit` дают три вызова `watchState` — начальное состояние, `[1]`, `[1,2]` — и один вызов эффекта с `[1,2]`. Для `localStorage` промежуточные состояния не нужны — достаточно эффекта. `watchState` нужен, когда важен каждый шаг: журнал изменений, «отменить» и «повторить».

## Подключаем

```ts core/favorites-store.ts
withState<FavoritesState>({ ids: [] }),
withStorage(STORAGE_KEY, {
  save: ({ ids }) => ids,
  restore: (saved) => ({ ids: toIds(saved) }),
}),
```

```ts core/cart-store.ts
withEntities(cartItems),
withStorage(STORAGE_KEY, {
  save: ({ ids, entityMap }) => ids.map((id) => entityMap[id]),
  restore: (saved) => setAllEntities(toCartItems(saved), cartItems),
}),
```

Расширение стоит **после** части, которая добавляет его состояние: иначе ему не с чем работать. Начальное состояние избранного теперь — пустой массив: сохранённое подставит `restore` в `onInit`. Функции `loadFavorites` и `loadCart` больше не читают `localStorage` сами — они только проверяют прочитанное: `toIds(saved)` и `toCartItems(saved)`.

Корзина сохраняет то же, что раньше, — массив «снимок игры и количество». Формат и ключ не изменились: корзина прошлых глав загрузится.

::: task
1. В `core/with-storage.ts` допишите `onInit`: восстановить через `config.restore` и `patchState`, записывать через `effect`, `getState` и `config.save`.
2. В избранном: `withState<FavoritesState>({ ids: [] })`, следом `withStorage(…)`; `withHooks` больше не нужен; `loadFavorites` превратите в `toIds(saved: unknown)`.
3. В корзине: `withStorage(…)` сразу после `withEntities`; из `onInit` уберите загрузку и эффект сохранения (журнал «Корзина: …» оставьте); `loadCart` превратите в `toCartItems(saved: unknown)`.
:::

## Что получилось

Положите игры в корзину, отметьте пару сердечек и перезапустите превью ⟳: «В корзине: 3», «♥ 2» — всё на месте. Мы проверили это сценарием: после перезапуска шапка показывает те же числа. Код сохранения теперь в одном месте, а у каждого хранилища — только то, что у него своё: что сохранять и как проверять прочитанное.

## Эксперименты

**Расширение проверяет хранилище.** В избранном опечатайтесь в `save`: `save: ({ idz }) => idz`. TypeScript:

```
Property 'idz' does not exist on type 'FavoritesState'.
```

`State` выведен из хранилища — расширение знает, какие поля там есть. Верните `ids`.

**Расширение без того, что ему нужно.** Перенесите `withStorage` в избранном **выше** `withState`. TypeScript подчеркнёт `ids` в `save`: `Property 'ids' does not exist on type '{}'`. Выше расширения хранилище пустое, и `State` вывелся как `{}` — пустое состояние. Верните на место.

::: tip Как в настоящем проекте
Свои расширения — главный способ делить код между хранилищами Signal Store: состояние загрузки (`withRequestStatus` из документации NgRx), журнал изменений, синхронизация с `localStorage`, «отменить/повторить». Есть и готовые сторонние наборы — например, `@angular-architects/ngrx-toolkit`: документация NgRx ссылается на его расширение `withDevtools` для Redux DevTools. Документация NgRx советует функции обновления для расширения (`setPending()`, `setFulfilled()`) делать отдельными функциями, а не методами: их можно передать в `patchState` вместе с другими.
:::

::: deep Под капотом: `withFeature`
Наше расширение получает настройки при подключении, а хранилище — только в `onInit`. Иногда расширению нужно что-то из хранилища **сразу**, как аргумент: например, сигнал. Для этого есть `withFeature((store) => withSomething(store.entities))` — функция получает хранилище, собранное частями выше, и возвращает расширение. Так расширение не зависит от того, как называются поля в конкретном хранилище.
:::
