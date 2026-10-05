---
title: Встроенные пайпы
startFrom: custom
base: 06-lifecycle/08-practice
baseHash: '95222b384278'
focus: app.config.ts
files: [main.ts, app.ts, app.html, app.css, app.config.ts, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/game-card/game-card.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.css, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, core/models.ts, core/games-data.ts, styles.css]
api: [пайп, currency, percent, date, number, json, slice, LOCALE_ID, registerLocaleData, NG0701]
---

С главы 3 цены в «Ходе конём» выглядят как `15540 ₽`: без пробела между разрядами. Мы обещали это исправить, когда дойдём до пайпов. Дошли.

Эта глава — про два способа расширить шаблон, не создавая новых компонентов. **Пайп** (pipe) превращает значение в текст для показа: число — в цену, миллисекунды — во время. **Директива** (directive) добавляет поведение элементу: подсказку при наведении, наблюдение за появлением на экране.

В этой главе «Ход конём» получит:

- цены с пробелами между разрядами: «1 990 ₽», «15 540 ₽»;
- размер скидки на стикере: «−20 %»;
- в карточке — «2–5 игроков · 45 мин», в окне «Подробнее» — «1 час 30 минут»;
- подсказку при наведении на звёзды и стикеры;
- обложки, которые загружаются, только когда карточка появилась на экране.

А в конце главы разберём, как Angular узнаёт, какие директивы стоят на элементе.

## Что изменилось в коде

Код — решение практикума главы 6. Добавлены только стили на будущее и `TODO`:

- в `styles.css` — стили подсказки `.tooltip` и ленивой картинки `.lazy`. Они понадобятся директивам в шагах 5 и 7: у директивы нет своих стилей, поэтому стили глобальные;
- в `game-card.css` — стиль строки характеристик `.meta` (шаг 3);
- комментарии `TODO` в `app.config.ts`, `app.html`, `game-card.html` и `countdown.html`.

## Пайп

Пайп пишется в шаблоне после значения через вертикальную черту:

```html
{{ game().price | currency }}
```

Слева — значение, справа — имя пайпа. Angular передаёт значение пайпу, а на экран попадает то, что пайп вернул. Сам `game().price` при этом не меняется: пайп только форматирует для показа.

У многих пайпов есть **параметры** — они идут после имени через двоеточие:

```html
{{ game().price | currency: 'RUB' : 'symbol' : '1.0-0' }}
```

Пайп — такой же строительный блок, как компонент: его нужно добавить в `imports` компонента, в шаблоне которого он используется. Встроенные пайпы лежат в пакете `@angular/common`:

| Пайп | Класс | Что делает |
|---|---|---|
| `currency` | `CurrencyPipe` | деньги: `1 990 ₽` |
| `number` | `DecimalPipe` | число по правилам языка: `4,6`, `15 540` |
| `percent` | `PercentPipe` | доля как процент: `0.2` → `20 %` |
| `date` | `DatePipe` | дата и время: `4 октября 2026 г.`, `07:16:10` |
| `uppercase`, `lowercase`, `titlecase` | `UpperCasePipe` … | регистр букв |
| `slice` | `SlicePipe` | часть массива или строки, как `Array.slice` |
| `json` | `JsonPipe` | объект как JSON — для отладки |
| `keyvalue` | `KeyValuePipe` | объект как массив пар `{ key, value }` — для `@for` |
| `async` | `AsyncPipe` | последнее значение `Promise` или `Observable` — глава 12 |

## Локаль

Как писать число — `15,540.00` или `15 540,00` — зависит от языка. Набор таких правил называется **локалью** (locale): разделители разрядов и дробной части, место символа валюты, названия месяцев. Встроенные пайпы берут локаль из `LOCALE_ID`. По умолчанию это `'en-US'`.

Локаль задают в конфигурации приложения:

```ts app.config.ts {1-3,5-6,11-12}
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';

// Правила форматирования для русского языка: разделители, названия месяцев, символ рубля
registerLocaleData(localeRu);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Локаль приложения: по ней форматируют встроенные пайпы
    { provide: LOCALE_ID, useValue: 'ru' },
  ],
};
```

Здесь две разные вещи:

- `{ provide: LOCALE_ID, useValue: 'ru' }` — **провайдер**: запись «когда попросят `LOCALE_ID`, выдай `'ru'`». Такие записи — основа внедрения зависимостей, ему посвящена глава 8. Пока достаточно знать, что значение отсюда получат все пайпы приложения;
- `registerLocaleData(localeRu)` — сами правила. В Angular встроены только правила `en-US`, остальные хранятся отдельными модулями в `@angular/common/locales/` и подключаются явно. Так в сборку попадают только те языки, которые нужны.

## Цена

```html shared/game-card/game-card.html {2,4}
<p class="price">
  {{ game().price | currency: 'RUB' : 'symbol' : '1.0-0' }}
  @if (game().oldPrice; as oldPrice) {
    <s class="old-price">{{ oldPrice | currency: 'RUB' : 'symbol' : '1.0-0' }}</s>
  }
</p>
```

Параметры `currency` по порядку:

- `'RUB'` — код валюты. Без него пайп возьмёт значение `DEFAULT_CURRENCY_CODE`, а оно по умолчанию `'USD'` — какой бы ни была локаль;
- `'symbol'` — как показать валюту: символом (`₽`), кодом (`'code'` → `RUB`) или своей строкой;
- `'1.0-0'` — сколько цифр: «минимум цифр в целой части . минимум после запятой — максимум после запятой». У рубля по умолчанию две цифры копеек, `1 990,00 ₽`. С `'1.0-0'` копеек нет.

Тот же формат цифр понимают `number` и `percent`: `{{ 4.6 | number: '1.1-1' }}` — `4,6`.

## Скидка в процентах

Стикер «Скидка» станет точнее — «−20 %»:

```html app.html {1-2}
@if (game.oldPrice; as oldPrice) {
  <span sticker class="sticker sale">−{{ 1 - game.price / oldPrice | percent }}</span>
}
```

У `|` самый низкий приоритет в выражении шаблона. Пайп получает результат **всего** выражения слева, `1 - 1990 / 2490` ≈ `0.2008`, и показывает `20 %`: по умолчанию `percent` округляет до целых. Знак «−» перед выражением — обычный текст шаблона.

## Время

Таймер `Countdown` из главы 6 форматировал время своей функцией `formatTime`. То же умеет `date`, если передать ему число миллисекунд:

```ts shared/countdown/countdown.ts {2}
// Сколько миллисекунд осталось. Строкой «07:16:10» его сделает пайп в шаблоне
protected readonly left = computed(() => untilMidnight(this.now()));
```

```html shared/countdown/countdown.html
Скидка действует ещё {{ left() | date: 'HH:mm:ss' : 'UTC' }}
```

`date` понимает число как момент времени: столько-то миллисекунд от полуночи 1 января 1970 года по UTC. Если до конца скидки 7 часов 16 минут, это момент «1 января 1970, 07:16 по UTC», а формат `'HH:mm:ss'` берёт из него только часы, минуты и секунды. Второй параметр `'UTC'` — часовой пояс. Без него `date` покажет время в поясе браузера и сдвинет часы. Приём работает, пока до цели меньше суток, — для скидки «до конца дня» этого достаточно.

::: task
1. В `app.config.ts` задайте локаль `ru`: подключите данные локали `registerLocaleData(localeRu)` и добавьте провайдер `LOCALE_ID`.
2. В карточке выведите цену и старую цену пайпом `currency`: в рублях, символом, без копеек. Добавьте `CurrencyPipe` в `imports` у `GameCard`.
3. На стикере скидки выведите её размер в процентах: «−20 %». Добавьте `PercentPipe` в `imports` у `App`.
4. В `Countdown` удалите `formatTime`: `left` возвращает миллисекунды, а время форматирует пайп `date`. Добавьте `DatePipe` в `imports`.
:::

## Что получилось

В карточках — «1 990 ₽» и зачёркнутая «2 490 ₽», на стикерах — «−20 %», «−11 %» и «−13 %». Откройте «Остров сокровищ»: таймер идёт, как и раньше. А в шапке, мини-корзине и в окне «Подробнее» цены ещё старые: их мы приведём в порядок в следующем шаге, и для этого понадобится свой пайп.

## Эксперимент: без локали

Удалите провайдер `LOCALE_ID` из `app.config.ts`. Цены станут `RUB1,990`, а стикеры — `−20%`: правила `en-US`, где разряды отделяют запятой, а знак процента пишут вплотную.

Теперь верните провайдер, но удалите `registerLocaleData(localeRu)`:

```
ERROR RuntimeError: NG02100: InvalidPipeArgument: 'NG0701: Missing locale data for the locale "ru".' for pipe 'PercentPipe'
```

Локаль задана, а правил для неё нет. Первым это заметил `percent` на стикере: пайп поймал ошибку NG0701 «нет данных локали» и сообщил о ней своей, NG02100. Отрисовка `App` на этом оборвалась: от карточек остались пустые рамки с кнопками «В корзину» без обложек и цен, пропали звёзды фильтра. Верните обе строки.

## Эксперимент: приоритет `|`

Заключите пайп в скобки:

```html
−{{ 1 - (game.price / oldPrice | percent) }}
```

На стикере — `−NaN`. Теперь пайп получил только `game.price / oldPrice` и вернул строку `'80 %'`, а `1 - '80 %'` — не число. Скобки вокруг пайпа нужны, когда его результат участвует в выражении дальше: `'Рейтинг ' + (rating | number)`. Уберите скобки.

## Эксперимент: `json`

Пайп `json` пригодится при отладке: он показывает объект целиком. Без него интерполяция покажет `[object Object]`. Добавьте в мини-корзину строку и `JsonPipe` в `imports` у `App`:

```html
<pre>{{ cart() | json }}</pre>
```

Нажмите «В корзину» — увидите массив позиций со всеми полями игры. Уберите строку после эксперимента.

::: tip Как в настоящем проекте
Пайпы и `LOCALE_ID` работают так же. Если приложение переводят на несколько языков, Angular CLI собирает отдельную версию для каждой локали и задаёт `LOCALE_ID` сам — это часть интернационализации (i18n) и пакета `@angular/localize`, в курс она не входит.
:::
