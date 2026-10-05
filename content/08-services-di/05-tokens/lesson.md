---
title: Токены
startFrom: custom
files: [main.ts, core/shop-config.ts, core/cart-store.ts, app.ts, shared/game-card/game-card.ts, shared/price-pipe.ts, app.config.ts, app.html, app.css, layout/header/header.ts, layout/header/header.html, layout/header/header.css, core/demo-cart-store.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/now.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/tooltip.ts, shared/in-view.ts, shared/lazy-image.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, styles.css]
focus: core/shop-config.ts
api: [InjectionToken, токен внедрения, factory, DEFAULT_CURRENCY_CODE, getCurrencySymbol]
---

В коде магазина разбросаны настройки: порог бесплатной доставки — в `cart-store.ts`, «осталось мало» — в карточке, рейтинг «Хита» и размер порции каталога — в `app.ts`. Соберём их в одном месте и будем выдавать через DI, как корзину. Но у объекта настроек нет класса, который мог бы стать токеном. Для этого есть **токен внедрения**.

## InjectionToken

Токен в DI — ключ, по которому ищут зависимость. До сих пор ключом был класс: `inject(CartStore)`. Для значений, у которых класса нет (число, строка, объект настроек, функция), ключ создают явно — `InjectionToken`:

```ts core/shop-config.ts
import { InjectionToken } from '@angular/core';

// Настройки магазина: числа, которые раньше были константами в разных файлах
export interface ShopConfig {
  freeDeliveryFrom: number; // с какой суммы заказа доставка бесплатная, ₽
  fewLeft: number; // при каком остатке на складе писать «Осталось N шт.»
  hitRating: number; // с какого рейтинга игра получает стикер «Хит»
  pageSize: number; // сколько игр показывать сразу и добавлять по «Показать ещё»
}

// Токен — ключ, по которому настройки выдаёт DI. factory — значение, если в провайдерах токена нет
export const SHOP_CONFIG = new InjectionToken<ShopConfig>('SHOP_CONFIG', {
  factory: () => ({ freeDeliveryFrom: 5000, fewLeft: 5, hitRating: 4.8, pageSize: 6 }),
});
```

- **Параметр типа** `<ShopConfig>` — что выдаётся по токену. `inject(SHOP_CONFIG)` вернёт `ShopConfig`, и TypeScript это знает.
- **Строка** `'SHOP_CONFIG'` — только описание для сообщений об ошибках. Ключом служит сам объект токена, а не строка.
- **`factory`** — значение по умолчанию. Токен с фабрикой ведёт себя как `@Service()`: доступен во всём приложении без провайдера, а фабрика вызывается при первом `inject()` — в контексте внедрения, так что внутри можно внедрять другие зависимости.

Имена токенов пишут заглавными буквами, как константы: `SHOP_CONFIG`, `LOCALE_ID`.

Пользоваться токеном так же, как классом:

```ts core/cart-store.ts {2,5}
// Настройки магазина: порог бесплатной доставки
private readonly config = inject(SHOP_CONFIG);
…
readonly deliveryLeft = computed(() => Math.max(this.config.freeDeliveryFrom - this.total(), 0));
```

```ts app.ts {2,6,10}
// Настройки магазина: рейтинг «Хита» и размер порции каталога
private readonly config = inject(SHOP_CONFIG);
…
protected readonly shownCount = linkedSignal<Game[], number>({
  source: this.visibleGames,
  computation: () => this.config.pageSize,
});
…
protected readonly hitRating = this.config.hitRating;
```

Поле `config` в `App` стоит первым. Инициализаторы полей выполняются по порядку: если объявить `config` ниже `hitRating`, в момент `this.config.hitRating` он ещё `undefined`. TypeScript заметит это заранее: `TS2729: Property 'config' is used before its initialization`.

## Зачем токен, если есть константа

`export const SHOP_CONFIG = { … }` и `import` работали бы не хуже — пока настройки одни на всё приложение навсегда. Токен даёт то же, что DI дал корзине: значение можно **подменить**, не трогая тех, кто его читает. Для другого окружения (тестовый сервер, акция «бесплатная доставка от 3000») меняют одну строку в `app.config.ts`; в тесте — подставляют свои числа; части приложения можно выдать свои настройки (следующий шаг).

## Валюта: токен Angular

У Angular тоже есть токены для настроек. `LOCALE_ID` вы знаете с главы 7, а рядом с ним — `DEFAULT_CURRENCY_CODE`: валюта, которую берёт встроенный пайп `currency`, если код не указан. По умолчанию это `'USD'`. Наш пайп `price` пока пишет `'₽'` и `'RUB'` прямо в коде — пусть берёт валюту из того же токена:

```ts shared/price-pipe.ts {6,9-10}
// Цена без копеек в валюте магазина: 1990 → «1 990 ₽»
@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  // Локаль и валюта приложения — те же, по которым работают встроенные пайпы
  private readonly locale = inject(LOCALE_ID);
  private readonly currency = inject(DEFAULT_CURRENCY_CODE);

  transform(value: number): string {
    const symbol = getCurrencySymbol(this.currency, 'narrow', this.locale);
    return formatCurrency(value, this.locale, symbol, this.currency, '1.0-0');
  }
}
```

```ts app.config.ts
// Валюта по умолчанию: по ней работают встроенный пайп currency и наш price
{ provide: DEFAULT_CURRENCY_CODE, useValue: 'RUB' },
```

`getCurrencySymbol(код, формат, локаль)` из `@angular/common` возвращает символ валюты по правилам локали: для `'RUB'` в формате `'narrow'` — `₽`. Теперь и `{{ 1990 | currency }}` без параметров покажет `1 990,00 ₽`, а не доллары.

::: task
1. В `core/shop-config.ts` создайте токен `SHOP_CONFIG` с фабрикой: доставка бесплатная от 5000 ₽, «осталось мало» — от 5 штук, «Хит» — от рейтинга 4,8, порция каталога — 6 игр.
2. Замените константы настройками из токена: `FREE_DELIVERY_FROM` в `CartStore`, `FEW_LEFT` в `GameCard`, `HIT_RATING` и `PAGE_SIZE` в `App`. Константы удалите.
3. В `app.config.ts` добавьте провайдер `DEFAULT_CURRENCY_CODE` со значением `'RUB'`. Пайп `price` берёт валюту из этого токена, а символ — из `getCurrencySymbol`.
:::

## Что получилось

Внешне ничего не изменилось: «До бесплатной доставки: 130 ₽», стикеры «Хит» на тех же играх, порция каталога — шесть карточек, цены в рублях. Но все числа теперь в одном месте, и их можно поменять, не трогая компоненты.

## Эксперимент: акция

Пусть сегодня доставка бесплатная от 3000 ₽. Добавьте в `app.config.ts` провайдер (и импорт `SHOP_CONFIG`):

```ts app.config.ts
{ provide: SHOP_CONFIG, useValue: { freeDeliveryFrom: 3000, fewLeft: 5, hitRating: 4.8, pageSize: 6 } },
```

В мини-корзине вместо «До бесплатной доставки: 130 ₽» — «Доставка бесплатная». Провайдер в конфигурации важнее фабрики токена — так же, как с корзиной в прошлом шаге.

Осторожно: `useValue` в типах Angular — `any`, и TypeScript не проверит, что объект подходит под `ShopConfig`. Забудете поле — ошибки не будет, а в компоненте окажется `undefined`. Если хотите проверку, объявите объект отдельно: `const promo: ShopConfig = { … }` и `useValue: promo`.

## Эксперимент: другой объект токена

Замените в этом провайдере `SHOP_CONFIG` на новый токен с тем же описанием:

```ts app.config.ts
{ provide: new InjectionToken('SHOP_CONFIG'), useValue: { freeDeliveryFrom: 3000, fewLeft: 5, hitRating: 4.8, pageSize: 6 } },
```

Ошибки нет, но доставка снова «до бесплатной 130 ₽»: провайдер молча не действует. Новый `InjectionToken` — другой ключ, хоть описание и совпадает; компоненты просят старый `SHOP_CONFIG` и получают значение из его фабрики. Токен создают один раз, экспортируют и импортируют везде, где он нужен.

## Эксперимент: токен без фабрики

Уберите эксперимент из `app.config.ts`, а у токена удалите `factory`:

```ts core/shop-config.ts
export const SHOP_CONFIG = new InjectionToken<ShopConfig>('SHOP_CONFIG');
```

```
ERROR ɵNotFound: NG0201: No provider found for `InjectionToken SHOP_CONFIG`. Source: Environment Injector.
```

Токен без фабрики — только ключ: значение должен дать провайдер. Так делают, когда у настройки нет разумного значения по умолчанию, — например, адрес сервера. Верните фабрику.

## Эксперимент: евро

Поменяйте в `app.config.ts` валюту на `'EUR'`: в шапке «В корзине: 3 · 4 870 €», в карточках — «1 990 €». Одна строка — и все цены в другой валюте. Верните `'RUB'`.

::: legacy Вы встретите в старом коде: @Inject и строки вместо токенов
С внедрением через конструктор токен указывали декоратором параметра: `constructor(@Inject(SHOP_CONFIG) config: ShopConfig)`. А в совсем старом коде ключом бывала строка: `{ provide: 'apiUrl', useValue: '…' }`. Строки сталкиваются (две библиотеки могут выбрать одну и ту же) и не несут типа — поэтому появился `InjectionToken`.
:::
