---
title: Промокод
startFrom: custom
files: [main.ts, core/cart-store.ts, core/promo-codes.ts, cart/mini-cart/mini-cart.ts, cart/mini-cart/mini-cart.html, cart/mini-cart/mini-cart.css, app.ts, app.html, app.css, layout/header/header.ts, layout/header/header.html, layout/header/header.css, core/favorites-store.ts, core/analytics.ts, core/shop-config.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
focus: core/cart-store.ts
api: ['linkedSignal()', source, computation, previous, состояние интерфейса, ленивость]
---

У «Хода конём» два промокода: `KNIGHT10` — минус 10 % от стоимости товаров и `CHESS500` — минус 500 ₽, если товаров в корзине на 3 000 ₽ и больше. Добавим в мини-корзину поле промокода, а в хранилище — применённый промокод и скидку по нему.

В коде шага — готовый файл `core/promo-codes.ts` и комментарии `TODO` в `cart-store.ts`, `mini-cart.ts` и `mini-cart.html`:

```ts core/promo-codes.ts
// Промокоды магазина. В главе 13 их будет проверять сервер (GET /api/promo/:code), пока список — в коде
export type Promo =
  | { code: string; percent: number } // скидка в процентах от суммы товаров
  | { code: string; amount: number; minTotal: number }; // скидка в рублях при сумме товаров от minTotal

// Чем закончилась попытка применить промокод: применён, нет такого, мала сумма товаров
export type PromoResult = 'applied' | 'unknown' | 'min-total';

export function findPromo(text: string): Promo | undefined { … }
```

`Promo` — объединение двух видов промокода. Какой перед нами, TypeScript узнаёт по полю: после проверки `'percent' in promo` он знает, что есть `percent`, а в ветке `else` — что есть `amount` и `minTotal`.

## Правила промокода

Разложим, что здесь состояние, а что — производное:

- **применённый промокод** покупатель выбирает сам — это состояние, его записывает действие `applyPromo`;
- **скидка** — функция от промокода и суммы товаров: `computed`;
- и одно правило, которое связывает их: если сумма товаров **упала ниже порога** `CHESS500` — например, покупатель убрал игру, — промокод снимается. Сам он не вернётся, даже если сумма снова вырастет: покупатель применит его заново.

Последнее правило — то, ради чего в главе 3 появился `linkedSignal`: **изменяемое состояние, которое пересматривается, когда меняется источник**. Просто `computed` не подходит — в него не записать применённый промокод. Просто `signal` не подходит — его никто не пересмотрит, когда изменится сумма.

## Промокод в хранилище

```ts core/cart-store.ts {2-8}
// Применённый промокод. Сумма товаров стала меньше порога промокода — он снимается и сам не вернётся
private readonly promoState = linkedSignal<number, Promo | null>({
  source: this.subtotal,
  computation: (subtotal, previous) => {
    const promo = previous?.value ?? null;
    return promo && 'minTotal' in promo && subtotal < promo.minTotal ? null : promo;
  },
});
readonly promo = this.promoState.asReadonly();
```

Полная форма `linkedSignal` вам знакома по `shownCount` из главы 6, но там `computation` просто сбрасывал значение. Здесь он **пересматривает** прошлое:

- `source: this.subtotal` — когда меняется сумма товаров, значение пересчитывается;
- `computation(subtotal, previous)` получает новое значение источника и прошлое состояние: `previous.source` — прошлую сумму, `previous.value` — промокод, который был применён. При самом первом вычислении `previous` нет — промокода тоже нет;
- если у промокода есть порог и сумма ниже — `null`, иначе — тот же промокод;
- между изменениями источника `promoState` — обычный изменяемый сигнал: `set` из действия записывает в него промокод.

Типы `<number, Promo | null>` — источника и значения — указаны явно. Без них TypeScript выводит тип значения из `computation`, а тот возвращает `previous.value` — тип, который ещё только выводится. Получается `{}`, и на `'minTotal' in promo` компилятор отвечает `TS2638: Type '{}' may represent a primitive value, which is not permitted as the right operand of the 'in' operator`.

Скидка — `computed`, а сумма к оплате теперь её учитывает:

```ts core/cart-store.ts
// Скидка по промокоду, ₽
readonly promoDiscount = computed(() => {
  const promo = this.promo();
  if (!promo) {
    return 0;
  }
  return 'percent' in promo ? Math.round((this.subtotal() * promo.percent) / 100) : promo.amount;
});
// К оплате: товары минус промокод плюс доставка
readonly total = computed(() => this.subtotal() - this.promoDiscount() + this.delivery());
```

Объявите `promoState` после `subtotal`: инициализатор поля берёт `this.subtotal`, и до объявления там ещё `undefined` (TypeScript скажет `TS2729: Property 'subtotal' is used before its initialization`).

## Действия

```ts core/cart-store.ts
// Применить промокод. Ответ — получилось ли, а если нет, то почему
applyPromo(text: string): PromoResult {
  const promo = findPromo(text);
  if (!promo) {
    return 'unknown';
  }
  if ('minTotal' in promo && this.subtotal() < promo.minTotal) {
    return 'min-total';
  }
  this.promoState.set(promo);
  return 'applied';
}

removePromo() {
  this.promoState.set(null);
}
```

И ещё одна строка — в `clear()`:

```ts core/cart-store.ts {3,4}
clear() {
  this.state.set([]);
  // Очистили корзину — начинаем заново: промокод тоже снимаем
  this.promoState.set(null);
}
```

Почему это не правило в `linkedSignal`, станет ясно из эксперимента в конце шага.

Действие отвечает **что произошло**, а не текстом сообщения. Слова «Нет такого промокода» — дело интерфейса: в другом месте их скажут иначе.

## Поле промокода

Текст ошибки — состояние интерфейса из шага 1: он нужен только мини-корзине. Поэтому он живёт в компоненте:

```ts cart/mini-cart/mini-cart.ts
// Состояние интерфейса: почему не применился промокод. Оно нужно только этому компоненту
protected readonly promoError = signal('');

protected applyPromo(text: string) {
  const result = this.cart.applyPromo(text);
  this.promoError.set(
    result === 'unknown'
      ? 'Нет такого промокода'
      : result === 'min-total'
        ? 'Сумма товаров меньше, чем нужно для этого промокода'
        : '',
  );
}
```

В шаблоне — строка промокода в итогах (после «Товары») и поле, пока промокод не применён:

```html cart/mini-cart/mini-cart.html
@if (cart.promo(); as promo) {
  <dt>
    Промокод {{ promo.code }}
    <button class="icon-button" aria-label="Убрать промокод" (click)="cart.removePromo()">×</button>
  </dt>
  <dd>−{{ cart.promoDiscount() | price }}</dd>
}
```

```html cart/mini-cart/mini-cart.html
@if (!cart.promo()) {
  <div class="promo">
    <input
      #promoInput
      class="promo-input"
      placeholder="Промокод"
      aria-label="Промокод"
      (input)="promoError.set('')"
      (keydown.enter)="applyPromo(promoInput.value)"
    />
    <button class="link-button" (click)="applyPromo(promoInput.value)">Применить</button>
  </div>
  @if (promoError()) {
    <p class="promo-error">{{ promoError() }}</p>
  }
}
```

`(input)="promoError.set('')"` убирает ошибку, как только покупатель начал исправлять код.

::: task
1. В `core/cart-store.ts`: закрытый `promoState` — `linkedSignal` от `subtotal` с правилом порога, открытый `promo` — только для чтения, `promoDiscount`, `total` со скидкой. Действия `applyPromo(text)` и `removePromo()`; `clear()` снимает и промокод.
2. В `MiniCart`: сигнал `promoError` и метод `applyPromo(text)`.
3. В `mini-cart.html`: строка промокода в итогах, поле с кнопкой «Применить» и сообщение об ошибке.
:::

## Что получилось

Очистите корзину и положите «Драконью почту» (1 290 ₽). Проверьте по порядку:

1. Введите `шах` и нажмите Enter — «Нет такого промокода». Начните печатать — сообщение исчезло.
2. Введите ` chess500 ` (с пробелами, строчными) — «Сумма товаров меньше, чем нужно для этого промокода»: товаров на 1 290 ₽, а нужно от 3 000 ₽.
3. Добавьте «Зельеваров» — товаров на 3 780 ₽. Примените `CHESS500`: в итогах «Промокод CHESS500 −500 ₽», итого 3 670 ₽ (3 780 − 500 + 390 за доставку).
4. Уберите «Драконью почту» крестиком. Товаров на 2 490 ₽ — меньше порога: строка промокода исчезла, снова видно поле.
5. Верните «Драконью почту» — снова 3 780 ₽, но промокода нет: правило снимает, но не возвращает.
6. Примените `KNIGHT10` — минус 10 % от товаров. Нажмите «Очистить корзину» и положите любую игру — промокода нет.

Промокод не сохраняется в `localStorage`: после ⟳ корзина на месте, а промокод придётся ввести снова. Это решение, а не недосмотр: обычно магазин проверяет промокод заново при каждом визите — в главе 13 это будет делать сервер.

## Эксперимент: сброс по пустой корзине

А почему не написать правило «корзина опустела — промокод снимается» тем же `linkedSignal`? Попробуем. Замените `promoState` (и уберите строку с `promoState.set(null)` из `clear()`):

```ts core/cart-store.ts
readonly isEmpty = computed(() => this.items().length === 0);
private readonly promoState = linkedSignal<boolean, Promo | null>({
  source: this.isEmpty,
  computation: () => null,
});
```

Положите игру, примените `KNIGHT10`, нажмите «Очистить корзину» и положите игру снова. Промокод **на месте**: «Промокод KNIGHT10 −89 ₽» у «Тихой охоты».

Дело в ленивости. `linkedSignal` пересчитывается, только когда его читают, и смотрит, изменился ли источник **с прошлого чтения**. Пока корзина пуста, мини-корзины нет на экране, и промокод не читает никто. `isEmpty` побывал `true`, но этого тоже никто не видел. Когда игра вернулась, мини-корзина прочитала промокод, `linkedSignal` спросил `isEmpty` — тот пересчитался в `false`, то же, что и в прошлый раз. Отсечение по равенству: источник «не изменился», пересчитывать нечего.

Отсюда правило: **`linkedSignal` реагирует на значения источника, которые успел прочитать, а не на историю переходов**. «Сумма сейчас ниже порога» — условие на значение, для `linkedSignal` подходит: какой бы путь ни прошла сумма, при чтении проверяется текущая. «Корзина опустела» — событие, переход. Его место — в действии, которое этот переход совершает: в `clear()`. Верните код шага.

::: deep Под капотом: узел linkedSignal
Узел `linkedSignal` устроен как узел `computed` (глава 3) с двумя добавками: он хранит `sourceValue` — значение источника при прошлом вычислении, и умеет принимать запись. При чтении узел опрашивает своих производителей: изменилась ли версия хоть одного с прошлого раза. Если да — вызывает `computation(source, { source: sourceValue, value })` и запоминает новый `sourceValue`. `set` и `update` сначала приводят узел в актуальное состояние (если источник уже изменился, `computation` выполнится до записи), затем кладут новое значение — версия узла растёт, только если оно отличается от прежнего. Источник запись не трогает. Поэтому значение из `set` живёт до следующего изменения источника — и ни мгновением дольше.

В 22.2 у `linkedSignal` есть и опция `set(value, rawSet)` — своя функция записи вместо стандартной: можно проверить или поправить значение перед тем, как записать его через `rawSet`.
:::
