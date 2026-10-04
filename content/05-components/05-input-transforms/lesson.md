---
title: Преобразование входов
focus: shared/rating/rating.ts
files: [main.ts, app.ts, app.html, app.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
api: [transform, booleanAttribute, numberAttribute, alias]
---

Звёзды в карточке не должны откликаться на щелчки. Нужен режим «только показать» — вход `readonly`. Хочется, чтобы им было удобно пользоваться, как атрибутом `disabled` у кнопки: просто написать слово, без значения.

```html
<app-rating [value]="game().rating" readonly />
```

## Атрибут — это строка

Начнём с очевидного варианта:

```ts
readonly readonly = input(false);
```

и в `select` — `if (this.readonly()) return;`. Добавьте `readonly` в карточку и щёлкните по звёздам «Драконьей почты». Звёзды по-прежнему меняются!

Дело в том, что `readonly` без квадратных скобок — **статический атрибут**, а не привязка. Angular передаёт во вход его значение как есть, а значение атрибута — всегда строка. У `readonly` без значения это пустая строка `''`, а пустая строка в JavaScript ложна. Превью проглотит это молча. Проверка шаблонов в настоящем проекте не пропустит: `TS2322: Type 'string' is not assignable to type 'boolean'`.

Можно писать `[readonly]="true"`, но это неудобно и непривычно для HTML. Лучше научить вход понимать атрибуты.

## `transform`

У входа есть опция `transform` — функция, через которую проходит каждое новое значение, прежде чем попасть в сигнал:

```ts shared/rating/rating.ts {1,5}
import { Component, booleanAttribute, input, model } from '@angular/core';

export class Rating {
  readonly value = model(0);
  // Только показывать, не давать менять. <app-rating readonly> — то же, что [readonly]="true"
  readonly readonly = input(false, { transform: booleanAttribute });
  // …
}
```

`booleanAttribute` — готовое преобразование из `@angular/core`. Его код — одна строка:

```js
typeof value === 'boolean' ? value : value != null && value !== 'false';
```

То есть `true` и `false` проходят как есть, строка `'false'`, `null` и `undefined` дают `false`, а всё остальное — `true`. В том числе пустая строка: `<app-rating readonly />` теперь значит «только показывать».

Обратите внимание на тип: поле теперь `InputSignalWithTransform<boolean, unknown>`. Читаем мы всегда `boolean`, а передать можно что угодно — преобразование разберётся. Именно поэтому проверка шаблонов перестаёт ругаться на строку.

В `select` добавьте проверку в начало:

```ts shared/rating/rating.ts
protected select(star: number, event: MouseEvent) {
  if (this.readonly()) return;
  // …
}
```

## `numberAttribute`

Вторая готовая функция — `numberAttribute`. Она превращает строку в число: `min="1"` → `1`. Если строка не число, получится `NaN` — или запасное значение, которое можно передать вторым аргументом. Так делают входы, которые удобно задавать прямо в разметке:

```ts
readonly min = input(0, { transform: numberAttribute });
```

```html
<app-quantity min="1" />
```

Этот вход мы напишем сами в практикуме.

## Свои преобразования

`transform` — любая функция одного аргумента. Например, вход, который принимает строку с пробелами по краям, а хранит без них:

```ts
readonly code = input('', { transform: (value: string) => value.trim() });
```

Преобразование вызывается на каждое новое значение от родителя, поэтому оно должно быть быстрым и без побочных эффектов: только вычислить результат из аргумента. У `model()` опции `transform` нет: модель ещё и отправляет значение обратно, а обратного преобразования не существует.

## `alias`

Ещё одна опция входа — `alias`, другое имя для шаблона родителя:

```ts
readonly readonly = input(false, { alias: 'readOnly', transform: booleanAttribute });
```

Теперь родитель обязан писать `readOnly`, а в классе поле по-прежнему `readonly`. Псевдонимы нужны редко — например, чтобы переименовать поле, не ломая шаблоны, которые уже используют компонент. Есть такая опция и у `output()` и `model()`. В нашем коде её не будет.

::: task
1. Добавьте в `Rating` вход `readonly` с `transform: booleanAttribute`.
2. В начале `select` выходите из метода, если `readonly()` истинно.
3. В карточке добавьте атрибут: `<app-rating [value]="game().rating" readonly />`.
:::

## Что получилось

Щелчки по звёздам в карточках больше ничего не меняют. Звёзды фильтра работают как раньше: у `<app-rating>` в фильтре атрибута нет, и `readonly()` — `false`, значение по умолчанию.

Над звёздами карточки указатель мыши по-прежнему превращается в руку — стиль `cursor: pointer` не знает о режиме. Это поправим в шаге про хост-элемент.

::: legacy Вы встретите в старом коде: сеттеры и coerceBooleanProperty
```ts
private _readonly = false;

@Input()
set readonly(value: BooleanInput) {
  this._readonly = coerceBooleanProperty(value);
}
get readonly() {
  return this._readonly;
}
```
До Angular 16.1 у `@Input()` не было `transform`, и преобразование писали сеттером. Функции `coerceBooleanProperty` и `coerceNumberProperty` брали из Angular CDK. Позже появилось `@Input({ transform: booleanAttribute })` — то же, что сейчас, но с декоратором.
:::
