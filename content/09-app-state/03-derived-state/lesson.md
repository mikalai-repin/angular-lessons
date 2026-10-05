---
title: Производное состояние
startFrom: custom
files: [main.ts, core/cart-store.ts, core/shop-config.ts, cart/mini-cart/mini-cart.html, layout/header/header.html, cart/mini-cart/mini-cart.css, app.ts, app.html, app.css, cart/mini-cart/mini-cart.ts, layout/header/header.ts, layout/header/header.css, core/favorites-store.ts, core/analytics.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
focus: core/cart-store.ts
api: [производное состояние, 'computed()', цепочка computed, deliveryPrice]
---

Мини-корзина пока показывает одну сумму и строку про доставку. Настоящей корзине нужно больше: сколько стоят товары, сколько доставка, сколько всего к оплате и сколько покупатель сэкономил на акциях. Эти числа понадобятся шапке, мини-корзине, а в главе 13 — странице оформления заказа. Где их считать?

В коде шага в `mini-cart.html` — комментарий `TODO` на месте будущих итогов. Стили итогов (`.summary`) уже лежат в `mini-cart.css`.

## Хранить или вычислять

Сумму к оплате можно было бы хранить в состоянии рядом с позициями и обновлять в каждом действии. Тогда каждое действие должно помнить про сумму, доставку и выгоду — и однажды кто-то добавит пятое действие и забудет. Можно обновлять сумму эффектом, который следит за позициями. Документация Angular предостерегает именно от этого: «избегайте эффектов для распространения изменений состояния» — получите лишние проходы обнаружения изменений, а то и бесконечные циклы обновлений.

Правильный ответ мы знаем с главы 3: всё, что можно вычислить из состояния, — **производное состояние**, и оно вычисляется `computed`. В состоянии корзины остаются только позиции. Остальное — функции от них:

```
       state (позиции)
       │
       ├─ count
       ├─ savings
       └─ subtotal ─┬─ deliveryLeft
                    ├─ delivery ─┐
                    └────────────┴─ total
```

Каждый `computed` пересчитывается сам, когда меняется то, что он прочитал, и только если его кто-то читает. Забыть обновить его невозможно — обновлять нечего.

## Итоги корзины

Сначала — стоимость доставки. Это настройка магазина, место ей рядом с порогом бесплатной доставки в `SHOP_CONFIG`:

```ts core/shop-config.ts {3,11}
export interface ShopConfig {
  freeDeliveryFrom: number; // с какой суммы заказа доставка бесплатная, ₽
  deliveryPrice: number; // сколько стоит доставка до этой суммы, ₽
  …
}

export const SHOP_CONFIG = new InjectionToken<ShopConfig>('SHOP_CONFIG', {
  factory: () => ({
    freeDeliveryFrom: 5000,
    deliveryPrice: 390,
    …
  }),
});
```

Теперь сами итоги. Бывший `total` — сумма по ценам игр — становится `subtotal`, а `total` теперь значит «к оплате»:

```ts core/cart-store.ts {1-3,5-8,10-12,14}
// Сумма по ценам игр — её показывает шапка
readonly subtotal = computed(() =>
  this.items().reduce((sum, item) => sum + item.game.price * item.quantity, 0),
);
// Сколько покупатель экономит на играх со скидкой: разница со старой ценой
readonly savings = computed(() =>
  this.items().reduce((sum, item) => sum + ((item.game.oldPrice ?? item.game.price) - item.game.price) * item.quantity, 0),
);
// Доставка: бесплатно от порога, иначе по тарифу. У пустой корзины доставки нет
readonly delivery = computed(() =>
  this.items().length === 0 || this.subtotal() >= this.config.freeDeliveryFrom ? 0 : this.config.deliveryPrice,
);
// К оплате: товары плюс доставка
readonly total = computed(() => this.subtotal() + this.delivery());
```

`deliveryLeft` теперь считается от `subtotal`. Обратите внимание: `delivery` и `total` читают другие `computed` — так получается цепочка из схемы. Порядок объявления полей важен только тем, что поле нельзя прочитать до инициализации; внутри функции `computed` читает соседей, когда его вычисляют, а к этому времени все поля уже есть.

В мини-корзине вместо «Итого» и строки про доставку — список итогов `<dl>`:

```html cart/mini-cart/mini-cart.html
<dl class="summary">
  <dt>Товары, {{ cart.count() }} шт.</dt>
  <dd>{{ cart.subtotal() | price }}</dd>
  <dt>Доставка</dt>
  <dd>
    @if (cart.delivery() > 0) {
      {{ cart.delivery() | price }}
    } @else {
      бесплатно
    }
  </dd>
  <dt class="total">Итого</dt>
  <dd class="total">{{ cart.total() | price }}</dd>
</dl>
@if (cart.savings() > 0) {
  <p class="muted">Скидки по акциям: вы экономите {{ cart.savings() | price }}</p>
}
@if (cart.deliveryLeft() > 0) {
  <p class="muted">До бесплатной доставки: {{ cart.deliveryLeft() | price }}</p>
}
```

Шаблон только читает готовые числа. Ни одного вычисления — его не нужно повторять в шапке, на странице оформления и в тестах.

::: task
1. В `core/shop-config.ts` добавьте настройку `deliveryPrice` — 390 ₽.
2. В `core/cart-store.ts` переименуйте `total` в `subtotal`, добавьте `savings`, `delivery` и новый `total` — к оплате. `deliveryLeft` считайте от `subtotal`.
3. В шапке (`layout/header/header.html`) покажите `subtotal` — стоимость товаров.
4. В `mini-cart.html` замените «Итого» и строку про доставку итогами: товары, доставка, итого, выгода по акциям и сколько осталось до бесплатной доставки.
:::

## Что получилось

Если в корзине остались игры с прошлого шага, очистите её. Положите «Остров сокровищ» два раза:

```
Товары, 2 шт.      3 980 ₽
Доставка             390 ₽
Итого              4 370 ₽
Скидки по акциям: вы экономите 1 000 ₽
До бесплатной доставки: 1 020 ₽
```

«Остров сокровищ» стоит 1 990 ₽ вместо 2 490 ₽ — отсюда выгода. Добавьте «Зельеваров»: товаров на 6 470 ₽, доставка «бесплатно», итого 6 470 ₽, строка «До бесплатной доставки» исчезла. Шапка показывает «В корзине: 3 · 6 470 ₽» — стоимость товаров, без доставки.

## Эксперимент: сколько раз считается subtotal

`subtotal` читают пятеро: шапка, мини-корзина, `delivery`, `deliveryLeft` и `total`. Добавьте в него строку журнала (для этого стрелочную функцию придётся записать с телом):

```ts core/cart-store.ts
readonly subtotal = computed(() => {
  console.log('subtotal пересчитан');
  return this.items().reduce((sum, item) => sum + item.game.price * item.quantity, 0);
});
```

При запуске — одна строка. «В корзину» — ещё одна, «+» в мини-корзине — ещё одна: пять читателей, одно вычисление на каждое изменение корзины. `computed` хранит результат, и все читатели получают его из кэша, пока позиции не изменились. Щёлкните сердечко избранного и наберите букву в поиске — ни одной новой строки: эти сигналы `subtotal` не читал, и они его не касаются. Уберите журнал.

::: tip Один объект или несколько сигналов
Итоги можно было бы отдать одним `computed`, который возвращает объект `{ subtotal, delivery, total }`. Но каждый пересчёт создаёт новый объект, а `computed` сравнивает значения через `Object.is` — и все, кто читал объект, обновятся, даже если поменялось одно поле. Отдельные сигналы-числа отсекаются по равенству поштучно: если доставка осталась бесплатной, `delivery` вернёт тот же `0`, и шаблон, который читает только его, проверять незачем. Для «объекта представления» можно задать свою функцию сравнения `equal` (глава 3), но обычно отдельные `computed` проще.
:::
