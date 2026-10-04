---
title: Переменные @for
focus: app.html
files: [main.ts, app.ts, app.html, app.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
api: ['$index', '$first', '$last', '$even', '$odd', '$count']
---

Список в мини-корзине до сих пор — одна строка через запятую. Сделаем из него настоящий список: строка на каждую позицию, номер, количество с кнопками «−» и «+», сумма и кнопка «×», чтобы убрать позицию. Заодно познакомимся с переменными, которые `@for` даёт внутри блока.

## Строки корзины

```html app.html {1-2,4}
@for (item of cart(); track item.game.id) {
  <div class="cart-row" [class.even]="$even">
    <span class="cart-row-title">{{ $index + 1 }}. {{ item.game.title }}</span>
    <button
      class="icon-button"
      aria-label="Убрать одну"
      [disabled]="item.quantity === 1"
      (click)="changeQuantity(item, -1)"
    >
      −
    </button>
    <span>{{ item.quantity }}</span>
    <button
      class="icon-button"
      aria-label="Добавить ещё"
      [disabled]="item.quantity >= item.game.inStock"
      (click)="changeQuantity(item, 1)"
    >
      +
    </button>
    <span class="cart-row-sum">{{ item.game.price * item.quantity }} ₽</span>
    <button class="icon-button" aria-label="Убрать из корзины" (click)="removeFromCart(item)">×</button>
  </div>
}
```

Ключ позиции — `item.game.id`: в корзине одна позиция на игру, и id игры её однозначно определяет. Сам объект `item` для `track` не годится: при каждом изменении количества мы заменяем позицию новым объектом (глава 3, неизменяемые данные), и Angular считал бы её новой.

Методы — в классе, по знакомым правилам: не меняем массив, а заменяем.

```ts app.ts
protected changeQuantity(item: CartItem, delta: number) {
  this.cart.update((items) =>
    items.map((i) => (i.game.id === item.game.id ? { ...i, quantity: i.quantity + delta } : i)),
  );
}

protected removeFromCart(item: CartItem) {
  this.cart.update((items) => items.filter((i) => i.game.id !== item.game.id));
}
```

## Переменные блока

Внутри `@for` Angular объявляет несколько переменных о текущем проходе цикла:

| Переменная | Значение |
|---|---|
| `$index` | номер элемента, с нуля |
| `$count` | сколько всего элементов |
| `$first` | `true` у первого элемента |
| `$last` | `true` у последнего |
| `$even` | `true` у элементов с чётным `$index`: 0, 2, 4… |
| `$odd` | `true` у элементов с нечётным `$index` |

Мы используем две:

- `{{ $index + 1 }}.` — номер позиции. `$index` считает с нуля, людям привычнее с единицы;
- `[class.even]="$even"` — каждая вторая строка на сером фоне, «зебра». Так длинный список легче читать по строкам.

Переменные можно переименовать — пригодится во вложенных циклах, где у внутреннего и внешнего `@for` свой `$index`:

```html
@for (item of cart(); track item.game.id; let i = $index, total = $count) {
  <span>{{ i + 1 }} из {{ total }}</span>
}
```

::: task
1. Добавьте в класс методы `changeQuantity` и `removeFromCart`.
2. Замените в мини-корзине строку `{{ cartSummary() }}` блоком `@for` по `cart()` со строками, как в коде выше.
:::

## Что получилось

Добавьте в корзину «Остров сокровищ» дважды и «Ночной экспресс» один раз. В корзине две строки: `1. Остров сокровищ … 3980 ₽` и `2. Ночной экспресс … 3190 ₽`, первая на сером фоне. «+» у «Ночного экспресса» гаснет на тройке: больше на складе нет. «−» неактивна на единице: чтобы убрать позицию совсем, есть «×».

Уберите «Остров сокровищ» крестиком: «Ночной экспресс» стал номером 1 и тоже получил серый фон. `$index` и `$even` пересчитываются при каждом изменении списка.

## Эксперимент

Выведите в строке все переменные, чтобы увидеть их значения:

```html
<span>{{ $index }}/{{ $count }} first={{ $first }} last={{ $last }} odd={{ $odd }}</span>
```

С тремя позициями получится `0/3 first=true last=false odd=false`, `1/3 first=false last=false odd=true`, `2/3 first=false last=true odd=false`. Уберите строку.

::: tip
«Зебру» можно сделать и чистым CSS: `.cart-row:nth-of-type(odd)` — строки корзины единственные `div` в секции. Переменные `@for` нужнее, когда от положения элемента зависит **содержимое**, а не только стиль: номер, запятая между элементами (`@if (!$last) { , }`), заголовок перед первым элементом.
:::
