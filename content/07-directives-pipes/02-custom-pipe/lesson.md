---
title: Свой пайп
startFrom: custom
focus: shared/price-pipe.ts
files: [main.ts, app.ts, app.html, app.css, shared/price-pipe.ts, shared/rating/rating.ts, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
api: ['@Pipe', PipeTransform, 'inject(LOCALE_ID)', formatCurrency, formatNumber, NG0302]
---

Цены в карточках уже правильные, а в шапке, мини-корзине и окне «Подробнее» — ещё нет. Можно везде написать `currency: 'RUB' : 'symbol' : '1.0-0'`, но таких мест восемь. Решим однажды показывать копейки — придётся найти и поправить все восемь. Формат цены в магазине один, пусть и записан он будет в одном месте — в своём пайпе `price`:

```html
{{ cartTotal() | price }}
```

## Пайп — класс с декоратором

```ts shared/price-pipe.ts
import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';
import { formatCurrency } from '@angular/common';

// Цена в рублях без копеек: 1990 → «1 990 ₽»
@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  // Локаль приложения — та же, по которой форматируют встроенные пайпы
  private readonly locale = inject(LOCALE_ID);

  transform(value: number): string {
    return formatCurrency(value, this.locale, '₽', 'RUB', '1.0-0');
  }
}
```

Разберём по частям:

- декоратор `@Pipe` делает класс пайпом, а `name` — имя, под которым пайп пишут в шаблоне. Имя пишут в camelCase, а класс называют по имени с суффиксом `Pipe` — так их создаёт `ng generate pipe`;
- `transform` — метод, который Angular вызывает: первый аргумент — значение слева от `|`, остальные — параметры пайпа (о них в следующем шаге). Что вернул `transform`, то и покажет шаблон;
- `implements PipeTransform` — интерфейс TypeScript с одним методом `transform`. Он ничего не добавляет в работу пайпа, но TypeScript проверит, что метод есть и назван правильно: опечатка `transfrom` станет ошибкой в редакторе, а не загадкой во время выполнения;
- пайп получает объекты Angular так же, как компонент: через `inject()` в поле. Здесь это локаль — значение `LOCALE_ID` из шага 1.

## Функции форматирования

Внутри — `formatCurrency` из `@angular/common`. Это та самая функция, которую вызывает `CurrencyPipe`: пайп разбирает параметры и передаёт их ей. Её параметры: число, локаль, символ валюты, код валюты и формат цифр. Такие функции есть для каждого встроенного форматирования: `formatNumber`, `formatPercent`, `formatDate`. Они нужны там, где пайпа нет, — в коде класса.

А такое место у нас есть. В главе 5 звёзды рейтинга получили подпись для экранного диктора: `aria-label="Рейтинг 4.6 из 5"` — с точкой, как в JavaScript. Хочется написать в `host` так:

```ts
'[attr.aria-label]': "'Рейтинг ' + (value() | number) + ' из 5'",
```

Но пайпы работают только в шаблоне. В выражениях `host` их нет:

```
ERROR Error: Parser Error: Host binding expression cannot contain pipes['Рейтинг ' + (value() | number) + ' из 5'] in in Component Rating …
```

Поэтому подпись считает `computed` в классе, а число форматирует функция:

```ts shared/rating/rating.ts {1,4-6}
'[attr.aria-label]': 'label()',
…
// Подпись для экранного диктора: «Рейтинг 4,6 из 5». В host пайпы нельзя — форматируем функцией
private readonly locale = inject(LOCALE_ID);
protected readonly label = computed(() => `Рейтинг ${formatNumber(this.value(), this.locale)} из 5`);
```

## Цены по всему магазину

Свой пайп подключается так же, как встроенный: в `imports` каждого компонента, в шаблоне которого он есть. Пайп `price` нужен трём: `App` (шапка и мини-корзина), `GameCard` и `GameDetails`.

```html app.html
<span class="cart">В корзине: {{ cartCount() }} · {{ cartTotal() | price }}</span>
…
<span class="cart-row-sum">{{ item.game.price * item.quantity | price }}</span>
…
<b>Итого: {{ cartTotal() | price }}</b>
…
<p class="muted">До бесплатной доставки: {{ deliveryLeft() | price }}</p>
```

В строке корзины скобки не нужны: `|` выполняется последним, и пайп получит произведение.

::: task
1. В `shared/price-pipe.ts` напишите пайп `PricePipe` с именем `price`.
2. Выведите через него все цены: в шапке, в строках мини-корзины, итог и остаток до бесплатной доставки (`App`), цену и старую цену в карточке (вместо `currency`) и в окне «Подробнее». Добавьте `PricePipe` в `imports` у `App`, `GameCard` и `GameDetails`; `CurrencyPipe` из `GameCard` больше не нужен.
3. В `Rating` замените подпись `aria-label` на `computed` `label` с `formatNumber`.
:::

## Что получилось

Положите в корзину две «Острова сокровищ» и «Ночной экспресс»: в шапке «В корзине: 3 · 7 170 ₽», в мини-корзине «3 980 ₽» и «3 190 ₽», «Итого: 7 170 ₽». Окно «Подробнее» показывает «1 990 ₽». Подпись звёзд на экране не видна; в инструментах разработчика браузера у `<app-rating>` теперь `aria-label="Рейтинг 4,6 из 5"`.

## Эксперимент: забытый импорт

Уберите `PricePipe` из `imports` у `GameCard`:

```
ERROR RuntimeError: NG0302: The pipe 'price' could not be found in the 'GameCard' component. Verify that it is included in the '@Component.imports' of this component.
```

Каталог исчез целиком: без пайпа карточка не может построить свой шаблон, и отрисовка `App` обрывается. Ошибка про неизвестный пайп в превью появляется во время выполнения, а в настоящем проекте — при сборке: `NG8004: No pipe found with name 'price'`.

## Эксперимент: не тот тип

Передайте пайпу строку вместо числа:

```html
{{ game().title | price }}
```

В карточках — `∞ ₽`. Превью не проверяет типы в шаблонах и молча выполнило бессмыслицу. В настоящем проекте сборка остановится:

```
TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

Компилятор шаблонов знает тип параметра `transform` и проверяет каждый вызов пайпа — ещё одна причина указывать типы в `transform`, а не `any`. Верните `game().price`.

::: tip Как в настоящем проекте
`ng generate pipe shared/price` создаёт файл `shared/price-pipe.ts` с классом `PricePipe`, именем `price` и заготовкой `transform`, а рядом — тест `price-pipe.spec.ts`. Курс называет файлы так же.
:::
