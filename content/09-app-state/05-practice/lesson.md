---
title: 'Практикум: правила склада'
startFrom: custom
files: [main.ts, core/cart-store.ts, core/favorites-store.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-details/game-details.html, app.ts, app.html, app.css, cart/mini-cart/mini-cart.ts, cart/mini-cart/mini-cart.html, cart/mini-cart/mini-cart.css, layout/header/header.ts, layout/header/header.html, layout/header/header.css, core/promo-codes.ts, core/analytics.ts, core/shop-config.ts, shared/game-card/game-card.css, shared/game-details/game-details.ts, shared/game-details/game-details.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
focus: core/cart-store.ts
api: [правила в хранилище, действие, 'computed()', localStorage]
---

У «Ночного экспресса» на складе 3 коробки. Положить четвёртую в корзину сейчас нельзя — но только потому, что так написаны шаблоны: карточка и окно «Подробнее» выключают кнопку по `inCart() >= game().inStock`, а `Quantity` в мини-корзине получает `[max]="item.game.inStock"`. Само хранилище о складе не знает. Метод `add` положит и сотую коробку, если его вызовет новый компонент, который про это правило не слышал. А `loadCart()` поверит `localStorage`, хотя остаток мог уменьшиться с прошлого визита.

Правило магазина должно жить в хранилище — там же, где живёт состояние, которое оно охраняет. А шаблоны пусть спрашивают у хранилища.

И второе: избранное до сих пор пропадает после ⟳, хотя корзина уже нет.

В коде шага — комментарии `TODO` в `core/cart-store.ts`, `core/favorites-store.ts` и `game-card.html`.

::: task
1. **Хранилище корзины** (`core/cart-store.ts`):
   - метод `available(game)` — сколько ещё штук игры можно положить в корзину: остаток на складе минус то, что уже лежит;
   - `add(game)` ничего не делает, если класть больше нельзя;
   - `setQuantity(game, quantity)` держит количество в пределах от 1 до остатка на складе, что бы ни пришло снаружи;
   - `loadCart()` уменьшает количество до остатка на складе и отбрасывает игры, которых на складе нет.
2. **Карточка**: кнопка «В корзину» выключена, когда `available` равно нулю. Над кнопкой вместо «Осталось N шт.» в этом случае — «Все N шт. в корзине» (класс `stock stock-few`).
3. **Окно «Подробнее»**: кнопка «В корзину» тоже спрашивает `available`.
4. **Избранное** сохраняется в `localStorage` под ключом `hod-konem:favorites:v1` и восстанавливается при запуске — только id игр, которые есть в каталоге.
:::

::: hint Подсказка 1: available и реактивность
`available` — обычный метод, как `quantityOf`. Он вызывает `quantityOf`, а тот читает сигнал, поэтому шаблон или `computed`, которые вызвали `available`, обновятся вместе с корзиной. В карточке удобно завести `computed`, как `inCart`: `available = computed(() => this.cart.available(this.game()))`.
:::

::: hint Подсказка 2: где проверять склад в add
В самом начале метода, до `state.update`:

```ts
add(game: Game) {
  // Склад пуст или всё, что есть, уже в корзине
  if (this.available(game) <= 0) {
    return;
  }
  …
}
```

Аналитика тоже не получит событие — коробку ведь не положили.
:::

::: hint Подсказка 3: setQuantity и loadCart
```ts
// От одной штуки до остатка на складе — что бы ни пришло снаружи
const allowed = Math.min(Math.max(quantity, 1), game.inStock);
```

В `loadCart()` игра проходит, если она есть в каталоге и `game.inStock > 0`, а количество — `Math.min(quantity, game.inStock)`.
:::

::: hint Подсказка 4: строка «Все N шт. в корзине»
Новая ветка встаёт между «Нет в наличии» и «Осталось N шт.»:

```html
@if (game().inStock === 0) {
  <p class="stock stock-out">Нет в наличии</p>
} @else if (available() === 0) {
  <p class="stock stock-few">Все {{ game().inStock }} шт. в корзине</p>
} @else if (game().inStock <= fewLeft) {
  …
```
:::

::: hint Подсказка 5: избранное
Так же, как корзина в шаге 2, но проще — сохранять можно само состояние, массив id:

```ts
private readonly ids = signal<number[]>(loadFavorites());

constructor() {
  // Побочный эффект: при каждом изменении избранного записываем его в localStorage
  effect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(this.ids())));
}
```

```ts
// Избранное из localStorage: только id игр, которые есть в каталоге
function loadFavorites(): number[] {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(ids) ? ids.filter((id) => GAMES.some((game) => game.id === id)) : [];
  } catch {
    return [];
  }
}
```

Тип `unknown` у результата `JSON.parse` честнее, чем `any`: TypeScript не даст работать со значением, пока вы не проверили, что это массив.
:::

## Проверьте себя

- Очистите корзину. Положите «Ночной экспресс» три раза: кнопка «В корзину» выключилась, над ней «Все 3 шт. в корзине», под ней «В корзине: 3 шт.». В мини-корзине «+» у количества выключен. Откройте «Подробнее» — кнопка там тоже выключена.
- Отметьте сердечком «Драконью почту» и нажмите ⟳: «♥ 1» в шапке и заполненное сердечко на месте.
- Подделайте сохранённую корзину — первой строкой `main.ts`:

  ```ts main.ts
  localStorage.setItem('hod-konem:cart:v1', '[{"id":4,"quantity":99},{"id":7,"quantity":1},{"id":2,"quantity":2}]');
  ```

  В корзине «Ночной экспресс × 3» (99 урезано до остатка) и «Драконья почта × 2», а «Маяка» (id 7, на складе 0) нет. Шапка — «В корзине: 5 · 12 150 ₽». Эффект тут же сохранил исправленную корзину. Удалите строку из `main.ts`.

Заметьте, что шаблоны стали проще: вместо сравнения с остатком — вопрос к хранилищу «сколько ещё можно?». Если правило поменяется — скажем, «не больше двух коробок одной игры в руки», — поправить его придётся в одном месте.

## Итоги главы

| Что | Зачем |
|---|---|
| закрытый `signal` + `asReadonly()` | состояние меняет только хранилище, снаружи — чтение |
| `readonly T[]`, `readonly` поля моделей | TypeScript не даст поменять массив и позиции на месте |
| методы-действия | все изменения и правила — в одном месте |
| `computed` от состояния | производное состояние: итоги, доставка, скидки; не хранится и не устаревает |
| `effect` + `localStorage` | синхронизация с хранилищем браузера — побочный эффект |
| начальное значение сигнала из `loadCart()` | восстановить состояние до первой отрисовки; внешние данные проверять |
| `linkedSignal({ source, computation(source, previous) })` | изменяемое состояние, которое пересматривается при изменении источника |

И главные идеи:

- состояние приложения — в сервисе-хранилище, состояние интерфейса — в компоненте;
- храните минимум: в состоянии — то, что нельзя вычислить, в `localStorage` — то, что нельзя взять из каталога;
- данные из `localStorage` — внешние: могут быть испорчены, устаревшими или чужими;
- эффекты — для связи с внешним миром (`localStorage`, журнал, аналитика), а не для того, чтобы перекладывать значения из сигнала в сигнал;
- `linkedSignal` ленив: он видит значения источника, которые прочитал, а не историю переходов. Переход («корзина опустела») — событие, его место в действии.

Корзина «Хода конём» теперь — настоящее хранилище. В главе 10 «Роутинг» у магазина появятся страницы: каталог, страница игры, корзина. Мини-корзина станет страницей `/cart`, окно «Подробнее» — страницей `/games/:id`, а хранилище останется тем же — ему всё равно, сколько страниц его читают. А перед этим — шаг-обзор: когда сервисов на сигналах достаточно, а когда в проект приходит библиотека состояния.
