---
title: Коллекции
focus: core/cart-store.ts
url: /cart
api: [withEntities, entityConfig, addEntity, updateEntity, removeEntity, removeAllEntities, setAllEntities, entityMap]
---

Посмотрите на методы корзины: почти каждый ищет позицию в массиве по id игры. `add` — `find`, потом `map`, чтобы заменить одну позицию; `setQuantity` — `map`; `remove` — `filter`; `quantityOf` — отдельная `Map` ради быстрого поиска. Это однообразный код, который пишут для любого списка «чего-то с id»: товаров, заказов, пользователей. В NgRx для него есть готовое дополнение — **коллекции сущностей** (entities).

## Что изменилось в коде

Ничего: код — решение прошлого шага.

## Коллекция сущностей

**Сущность** (entity) — объект, у которого есть id. Коллекцию сущностей Signal Store хранит не массивом, а двумя полями состояния:

```
entityMap  { 1: позиция, 4: позиция }
           id → сущность
ids        [4, 1]
           порядок
```

По `entityMap` позицию находят по id сразу, без перебора. По `ids` — знают порядок. Массив сущностей по порядку тоже есть — производное `entities`.

Добавляет коллекцию часть `withEntities` из `@ngrx/signals/entities`. У позиции корзины своего `id` нет: её ключ — `game.id`. Об этом коллекции надо сказать — функцией `selectId`. Тип сущности и `selectId` собирает `entityConfig`:

```ts core/cart-store.ts
const cartItems = entityConfig({
  entity: type<CartItem>(),
  selectId: (item) => item.game.id,
});

export const CartStore = signalStore(
  { providedIn: 'root' },
  withEntities(cartItems),
  // …
);
```

`type<CartItem>()` из `@ngrx/signals` — функция, которая ничего не делает и возвращает `undefined`. Она нужна, чтобы передать **тип** там, где ожидается значение: `entity` в настройках нужен только TypeScript. У сущностей, у которых есть поле `id`, всё проще: `withEntities<Game>()` — без `selectId`.

## Изменения — готовыми функциями

Менять коллекцию руками не нужно: для всех обычных случаев есть функции. Каждая возвращает **функцию обновления** — ту самую, что мы передавали в `patchState` (`({ items }) => ({ … })`), только готовую:

| Функция | Что делает |
|---|---|
| `addEntity(сущность)` | добавляет в конец; если такой id уже есть — ничего |
| `updateEntity({ id, changes })` | меняет поля одной сущности: объект или функция от неё |
| `removeEntity(id)` | убирает по id |
| `removeAllEntities()` | очищает коллекцию |
| `setAllEntities(массив)` | заменяет коллекцию целиком |

Есть и другие: `prependEntity` (в начало), `setEntity` (добавить или заменить), `upsertEntity` (добавить или дополнить), варианты для нескольких сущностей — `addEntities`, `updateEntities`, `removeEntities`. Всем, где из сущности нужен id, передают тот же `cartItems` — по нему функция знает `selectId`.

Методы корзины становятся короче:

```ts core/cart-store.ts
const quantityOf = (game: Game): number =>
  store.entityMap()[game.id]?.quantity ?? 0;

add(game: Game) {
  if (available(game) <= 0) {
    return;
  }
  if (quantityOf(game) === 0) {
    patchState(store, addEntity({ game, quantity: 1 }, cartItems));
  } else {
    patchState(
      store,
      updateEntity(
        { id: game.id, changes: (item) => ({ quantity: item.quantity + 1 }) },
        cartItems,
      ),
    );
  }
  track('В корзину', game.title);
},

setQuantity(game: Game, quantity: number) {
  const allowed = Math.min(Math.max(quantity, 1), game.inStock);
  patchState(
    store,
    updateEntity({ id: game.id, changes: { quantity: allowed } }, cartItems),
  );
},

remove(game: Game) {
  patchState(store, removeEntity(game.id));
},

clear() {
  patchState(store, removeAllEntities(), { promo: null });
},
```

`_quantities` больше не нужен: `entityMap` — и есть «id → позиция». А `clear` показывает, что `patchState` принимает **несколько** обновлений подряд: функцию коллекции и объект `{ promo: null }`. Они применяются по очереди, а сигналы меняются один раз — в конце.

## Начальное состояние — в хуке

`withEntities` начинает с пустой коллекции, и функцию начального состояния ему не передать. Сохранённую корзину загрузим в `onInit`:

```ts core/cart-store.ts
withHooks({
  onInit(store) {
    patchState(store, setAllEntities(loadCart(), cartItems));
    // эффекты — как были
  },
}),
```

## Компоненты

Поля `items` больше нет — есть `entities`, `entityMap` и `ids`. Три места в магазине читали `cart.items()`: шаблон корзины, оформление заказа и его гард.

::: task
1. В `core/cart-store.ts` объявите `cartItems` через `entityConfig` и замените `withState` на `withEntities(cartItems)`; `CartState` больше не нужен.
2. Везде в хранилище `items()` → `entities()`; `quantityOf` — через `entityMap()`, `_quantities` удалите.
3. Перепишите `add`, `setQuantity`, `remove`, `clear` на `addEntity`, `updateEntity`, `removeEntity`, `removeAllEntities`.
4. В `onInit` загрузите корзину: `patchState(store, setAllEntities(loadCart(), cartItems))`; в эффекте сохранения — `store.entities()`.
5. В `cart-page.html` и `checkout.ts` — `cart.entities()` вместо `cart.items()`, в гарде `checkout-guards.ts` — `cart.ids().length > 0`.
:::

## Что получилось

Корзина работает как раньше — и хранит позиции коллекцией. Формат в `localStorage` не изменился: эффект сохраняет `entities()` — тот же массив «снимок игры и количество», поэтому сохранённая корзина прошлых глав загрузится.

## Эксперименты

**`addEntity` не добавляет дважды.** В `add` замените условие `quantityOf(game) === 0` на `true` — пусть `add` всегда зовёт `addEntity`. Нажмите «В корзину» у одной игры два раза: в консоли «Корзина: Шахматы «Классика» × 1» и больше ничего. Позиция с этим id уже есть — `addEntity` молча не делает ничего, ни ошибки, ни предупреждения. Для «добавить или поменять» есть `setEntity` и `upsertEntity`. Верните условие.

**Что поменялось — то и сообщило.** Добавьте в `onInit` эффект, который читает только порядок:

```ts
effect(() => console.log('ids:', JSON.stringify(store.ids())));
```

Нажмите «В корзину» у одной игры, потом у неё же ещё раз, потом у другой. Строк `ids:` — три: `[]` при запуске, `[8]` и `[8,34]`. На втором нажатии количество выросло, а `ids` — нет: `updateEntity` поменял только `entityMap`, а `patchState` записывает лишь те поля состояния, которые изменились. Кто читает `ids`, лишний раз не пересчитывается. Уберите эффект.

::: tip Как в настоящем проекте
Сущности — для коллекций, где важен поиск по id и частые точечные изменения: списки, таблицы, кэш загруженных записей. Для корзины из пяти позиций выигрыш скромный — она здесь, чтобы показать приём на знакомом коде. Если у хранилища несколько коллекций, их различают именем: `withEntities({ entity: type<Order>(), collection: 'order' })` даёт `orderEntityMap`, `orderIds`, `orderEntities`, а функции изменения получают `{ collection: 'order' }`.
:::

::: deep Под капотом: функции обновления
`addEntity(сущность, cartItems)` ничего не меняет сама: она возвращает функцию «состояние → изменения». `patchState` вызывает её с текущим состоянием. Внутри — копия `entityMap` и `ids`, изменение копии и ответ: оба поля, только `entityMap` или пустой объект, если ничего не поменялось. Пустой ответ `patchState` не записывает никуда — поэтому `addEntity` с занятым id проходит бесследно. Поскольку это обычные функции, их можно собирать в свои: например, «поднять игру в начало» — это `removeEntity` и `prependEntity` подряд (так сделаем в практикуме).
:::
