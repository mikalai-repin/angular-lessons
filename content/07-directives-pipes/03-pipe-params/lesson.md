---
title: Параметры пайпа
startFrom: custom
focus: shared/players-pipe.ts
files: [main.ts, app.ts, app.html, app.css, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/price-pipe.ts, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
api: [параметры пайпа, цепочка пайпов, Intl.PluralRules]
---

Покупатель выбирает настольную игру по двум вопросам: сколько нужно игроков и сколько длится партия. В карточке этого нет, а в окне «Подробнее» — «Игроков 2–5» и «Партия 90 мин». Сделаем, как пишут люди: в карточке коротко — «2–5 игроков · 1 ч 30 мин», в окне подробно — «1 час 30 минут».

Здесь два пайпа: `players` превращает `{ min: 2, max: 5 }` в «2–5 игроков», а `duration` — минуты в часы и минуты. Причём `duration` нужен в двух видах — коротком и длинном. Какой из них, решает шаблон, а передаёт пайпу **параметром**.

## Что изменилось в коде

Новые файлы в папке `shared`:

- `plural.ts` — готовая функция `plural(count, forms)`: выбирает форму слова для числа — «1 игрок», «2 игрока», «5 игроков». Она обычный TypeScript: правила русского языка знает стандартный объект JavaScript `Intl.PluralRules`;
- `players-pipe.ts` и `duration-pipe.ts` — заготовки: формы слов и `TODO` на месте пайпов.

В `game-card.html` и `game-details.html` — `TODO` на месте характеристик.

## Пайп `players`

```ts shared/players-pipe.ts
const PLAYER: WordForms = { one: 'игрок', few: 'игрока', many: 'игроков' };

// Число игроков: { min: 2, max: 4 } → «2–4 игрока», { min: 2, max: 2 } → «2 игрока»
@Pipe({ name: 'players' })
export class PlayersPipe implements PipeTransform {
  transform(players: Game['players']): string {
    const range = players.min === players.max ? `${players.min}` : `${players.min}–${players.max}`;
    // Слово согласуется с последним числом: «2–4 игрока», но «2–5 игроков»
    return `${range} ${plural(players.max, PLAYER)}`;
  }
}
```

Ничего нового по сравнению с `price`: значение слева от `|` — первый аргумент `transform`. Только здесь значение — не число, а объект: пайпу можно передать что угодно.

## Параметры

Параметры пайпа — это следующие аргументы `transform`:

```ts shared/duration-pipe.ts {4}
// Длительность в минутах: 90 → «1 ч 30 мин», а с параметром 'long' — «1 час 30 минут»
@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(minutes: number, format: DurationFormat = 'short'): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    const parts: string[] = [];
    if (hours > 0) {
      parts.push(format === 'short' ? `${hours} ч` : `${hours} ${plural(hours, HOUR)}`);
    }
    if (rest > 0 || hours === 0) {
      parts.push(format === 'short' ? `${rest} мин` : `${rest} ${plural(rest, MINUTE)}`);
    }
    return parts.join(' ');
  }
}
```

В шаблоне параметры перечисляют после имени через двоеточие, в том же порядке:

```html
{{ game().playTime | duration }}          <!-- 90 → «1 ч 30 мин» -->
{{ game().playTime | duration: 'long' }}  <!-- 90 → «1 час 30 минут» -->
```

Так же устроены встроенные пайпы: `currency: 'RUB' : 'symbol' : '1.0-0'` — это вызов `transform(price, 'RUB', 'symbol', '1.0-0')`. Значение по умолчанию у параметра — обычное значение по умолчанию TypeScript.

Параметр может быть любым выражением шаблона — сигналом, полем, вызовом: `duration: format()`. Если параметр изменится, пайп пересчитает результат.

## Карточка и окно

В карточке — строка под звёздами, в окне — характеристики:

```html shared/game-card/game-card.html
<p class="meta">
  <span>{{ game().players | players }}</span>
  <span>{{ game().playTime | duration }}</span>
</p>
```

```html shared/game-details/game-details.html
<dl class="specs">
  <dt>Игроки</dt>
  <dd>{{ game().players | players }}</dd>
  <dt>Партия</dt>
  <dd>{{ game().playTime | duration: 'long' }}</dd>
  …
```

Вместо `@let players` и `@if` для «2» и «2–5» в окне теперь одна строка: эту логику забрал пайп. Отдельные `<span>` в карточке нужны для вёрстки: точку между ними ставит CSS, и в узкой карточке строка переносится между частями, а не посреди «1 ч 30 мин».

::: task
1. Напишите пайп `PlayersPipe` с именем `players`.
2. Напишите пайп `DurationPipe` с именем `duration` и параметром `format`: `'short'` (по умолчанию) или `'long'`.
3. В карточке под звёздами выведите строку `.meta`: число игроков и время партии в коротком формате, каждое в своём `<span>`.
4. В окне «Подробнее» выведите игроков пайпом `players`, а время партии — `duration` в длинном формате. `@let players` больше не нужен.
5. Не забудьте пайпы в `imports` у `GameCard` и `GameDetails`.
:::

## Что получилось

В карточках: «2–5 игроков · 45 мин» у «Острова сокровищ», «1–4 игрока · 1 ч» у «Зельеваров», «2–5 игроков · 1 ч 30 мин» у «Ночного экспресса». Откройте «Строителей замков» и вкладку «Характеристики»: «Игроки 2–4 игрока», «Партия 1 час 10 минут». У шахмат — «2 игрока» и «1 час».

## Цепочка пайпов

Результат одного пайпа можно передать следующему — **цепочкой**:

```html
{{ game().playTime | duration: 'long' | uppercase }}
```

Пайпы выполняются слева направо: сначала `duration` с параметром `'long'`, потом `uppercase` получает его строку. Попробуйте в карточке (добавив `UpperCasePipe` в `imports`): «45 МИНУТ», «1 ЧАС». Уберите после эксперимента.

## Эксперимент: опечатка в параметре

Напишите в карточке `duration: 'lng'`. Превью покажет длинный формат: в `transform` любое значение, кроме `'short'`, ведёт в ветку длинного. JIT не проверяет типы в шаблонах — опечатка прошла молча. В настоящем проекте сборка остановится:

```
TS2345: Argument of type '"lng"' is not assignable to parameter of type 'DurationFormat | undefined'.
```

Тип `DurationFormat = 'short' | 'long'` вместо `string` — это и есть защита от опечаток: компилятор шаблонов проверяет параметры пайпа так же, как аргументы обычной функции. Верните `duration` без параметра.

::: deep Пайп или метод в классе
То же самое можно сделать методом компонента: `{{ formatPlayers(game().players) }}`. Почему пайп лучше?

- пайп работает в любом шаблоне, куда его импортировали. Метод пришлось бы копировать в `GameCard` и `GameDetails` или выносить в общий код и всё равно объявлять в каждом классе;
- пайп **чистый**: Angular не вызывает `transform` повторно, если значение и параметры не изменились. Метод в шаблоне вызывается при каждой проверке компонента.

Что значит «чистый» и когда это важно — в следующем шаге.
:::
