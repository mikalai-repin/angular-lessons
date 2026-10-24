---
title: Корзина на Signal Store
focus: core/cart-store.ts
url: /cart
api: [withProps, withLinkedState, 'закрытые члены _', InstanceType]
---

Избранное было разминкой: одно поле состояния, одно производное, два метода. Корзина — самое большое хранилище магазина. У неё есть зависимости (настройки магазина и ленивая аналитика), закрытые помощники, длинная цепочка производных значений и промокод на `linkedSignal`, который сам снимается, когда сумма стала меньше порога. Переведём на Signal Store и её — и увидим, как всё это раскладывается по частям.

## Что изменилось в коде

Ничего: код — решение прошлого шага. Избранное уже на Signal Store, корзина — пока класс из главы 9.

## Зависимости — свойства

В классе зависимости были полями: `private readonly config = inject(SHOP_CONFIG)`. В Signal Store для них есть часть **`withProps`** — она добавляет хранилищу любые свойства, не только сигналы:

```ts core/cart-store.ts
withProps(() => ({
  _config: inject(SHOP_CONFIG),
  _analytics: injectAsync(
    () => import('./analytics').then((m) => m.Analytics),
    { prefetch: onIdle },
  ),
})),
```

Функция `withProps` выполняется в контексте внедрения — `inject` и `injectAsync` в ней работают.

Имена начинаются с подчёркивания не случайно. **Член хранилища с `_` в начале — закрытый** (private store member): части ниже его видят, а снаружи хранилища его нет. Так `private` из класса переезжает в Signal Store. Это работает для всего: поля состояния, свойства, вычисляемые значения, методы.

## Производные — по порядку

У корзины много производных, и одни зависят от других: доставка — от суммы, итог — от суммы, доставки и скидки по промокоду. В одной части `withComputed` вычисляемые значения не видят друг друга: объект ещё только собирается. Есть два способа.

**Локальный `computed`.** Значение, которое нужно соседям, объявляем в функции до `return` и возвращаем вместе с остальными:

```ts core/cart-store.ts
withComputed(({ items, _config }) => {
  const subtotal = computed(() =>
    items().reduce((sum, item) => sum + item.game.price * item.quantity, 0),
  );
  return {
    subtotal,
    count: () => items().reduce((sum, item) => sum + item.quantity, 0),
    delivery: () =>
      items().length === 0 || subtotal() >= _config.freeDeliveryFrom
        ? 0
        : _config.deliveryPrice,
    // savings, deliveryLeft, summary, _quantities…
  };
}),
```

Так советует документация NgRx: всё, что относится к одной теме, — в одной части.

**Следующая часть.** Если значению нужно то, что появится только в другой части, оно идёт ниже неё. Так с промокодом — о нём сейчас.

## Промокод — связанное состояние

Промокод — это состояние: его применяют и снимают. Но он ещё и зависит от суммы товаров: стала меньше порога — снимается. В главе 9 это был `linkedSignal` с источником `subtotal`. В Signal Store такое состояние добавляет **`withLinkedState`** (linked state):

```ts core/cart-store.ts
withLinkedState(({ subtotal }) => ({
  promo: linkedSignal<number, Promo | null>({
    source: subtotal,
    computation: (subtotal, previous) => {
      const promo = previous?.value ?? null;
      return promo && 'minTotal' in promo && subtotal < promo.minTotal
        ? null
        : promo;
    },
  }),
})),
```

`promo` становится полем состояния, как поля из `withState`: снаружи — сигнал только для чтения, внутри — меняется через `patchState(store, { promo })`. А `subtotal` для источника берётся из части выше — поэтому `withLinkedState` стоит **после** первого `withComputed`. Скидка по промокоду и итог зависят от `promo` — значит, они в ещё одном `withComputed` ниже.

Получается лестница: каждая ступень опирается на предыдущие.

```
withState         items
withProps         _config, _analytics
withComputed      subtotal, count, delivery…
withLinkedState   promo        ← от subtotal
withComputed      promoDiscount, total
withMethods       quantityOf, add, clear…
withHooks         журнал, localStorage
```

## Методы, которые зовут друг друга

`add` проверяет склад через `available`, а `available` — через `quantityOf`. Внутри одной `withMethods` методы друг друга не видят — так же, как вычисляемые значения. Помогают обычные функции до `return`:

```ts core/cart-store.ts
withMethods((store) => {
  const quantityOf = (game: Game): number =>
    store._quantities().get(game.id) ?? 0;
  const available = (game: Game): number =>
    game.inStock - quantityOf(game);
  const track = (event: string, details: string) =>
    store._analytics()
      .then((analytics) => analytics.track(event, details))
      .catch(() => {});

  return {
    quantityOf,
    available,
    add(game: Game) {
      if (available(game) <= 0) {
        return;
      }
      patchState(store, ({ items }) => { … });
      track('В корзину', game.title);
    },
    // setQuantity, remove, clear, applyPromo, removePromo
  };
}),
```

`track` не попала в объект — значит, её нет даже среди закрытых членов: это просто функция внутри части. А `clear` теперь меняет два поля одним вызовом: `patchState(store, { items: [], promo: null })`.

## Тип хранилища

У класса имя было и значением, и типом: `let cart: CartStore` в тесте корзины из главы 16. `signalStore` возвращает значение — класс, и его имя типом не является. Тип экземпляра добавляют рядом, под тем же именем:

```ts core/cart-store.ts
export type CartStore = InstanceType<typeof CartStore>;
```

TypeScript различает значения и типы: `inject(CartStore)` берёт значение, `let cart: CartStore` — тип. Так советует документация NgRx.

::: task
Перепишите `core/cart-store.ts` на Signal Store. Поведение корзины не меняется — меняется устройство:

1. `withState<CartState>(() => ({ items: loadCart() }))`, где `CartState` — интерфейс с полем `items: readonly CartItem[]`.
2. `withProps` — `_config` и `_analytics`.
3. `withComputed` с локальным `subtotal`: `count`, `savings`, `delivery`, `deliveryLeft`, `summary`, `_quantities`.
4. `withLinkedState` — `promo`, затем `withComputed` — `promoDiscount` и `total`.
5. `withMethods` — все методы класса; помощники `quantityOf`, `available`, `track` — функциями до `return`.
6. `withHooks` — оба эффекта из конструктора в `onInit(store)`.
7. После хранилища — `export type CartStore = InstanceType<typeof CartStore>;`.
:::

## Что получилось

Магазин работает как раньше: «В корзину», количество, промокод `KNIGHT10`, доставка бесплатно от 5 000 ₽, корзина после перезапуска. Компоненты снова не поменялись.

Тесты корзины из главы 16 — тоже: они создают хранилище через `TestBed.inject(CartStore)` и вызывают те же методы. Мы прогнали все 46 тестов магазина на этом шаге — все проходят. Тест не знает и не должен знать, класс внутри или Signal Store.

## Эксперименты

**Закрытое — снаружи.** Попросите в шапке настройки корзины: `protected readonly free = this.cart._config.freeDeliveryFrom;`. TypeScript:

```
Property '_config' does not exist on type '{ items: Signal<readonly CartItem[]>; … }'.
```

Для кода снаружи `_config` не существует. Уберите строку.

**Без типа.** Удалите строку `export type CartStore = …` и объявите в шапке поле `private last?: CartStore;`. TypeScript:

```
'CartStore' refers to a value, but is being used as a type here. Did you mean 'typeof CartStore'?
```

`typeof CartStore` — тип **класса** (с конструктором), а нужен тип экземпляра — это и делает `InstanceType`. Верните строку, уберите поле.

**Два члена с одним именем.** Добавьте во второй `withComputed` рядом с `promoDiscount` строку `count: () => 0,`. TypeScript молчит, магазин запустился, а в консоли:

```
@ngrx/signals: SignalStore members cannot be overridden. Trying to override: count
```

Положите пару игр в корзину: в шапке «В корзине: 0 · 6 480 ₽». Нижний `count` заменил верхний, и шапка показывает его. Предупреждение есть только при разработке — в собранном приложении ошибка останется молча. Уберите строку.

::: deep Под капотом: закрытые члены
Закрытость — заслуга типов. `signalStore` объявляет экземпляр через служебный тип, который выбрасывает ключи, начинающиеся с `_`. Во время выполнения `_config` лежит в экземпляре, как и всё остальное: TypeScript не даст его прочитать, но JavaScript — даст. Так же устроен и `private` в классе TypeScript. Настоящие закрытые поля JavaScript (`#config`) Signal Store не использует: члены хранилища — обычные свойства объекта.
:::
