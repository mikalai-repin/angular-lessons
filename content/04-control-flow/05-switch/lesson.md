---
title: '@switch'
focus: app.html
files: [main.ts, app.ts, app.html, app.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
api: ['@switch', '@case', '@default', '@default never']
---

У каждой игры есть категория: `family`, `strategy`, `party`, `cooperative` или `kids`. Покажем её бейджем в углу обложки, по-русски. Здесь одно значение и несколько вариантов разметки для него — работа для `@switch`.

## `@switch` и `@case`

```html app.html
<span class="category">
  @switch (game.category) {
    @case ('family') { Семейная }
    @case ('strategy') { Стратегия }
    @case ('party') { Для компании }
    @case ('cooperative') { Кооперативная }
    @case ('kids') { Детская }
  }
</span>
```

`@switch (выражение)` вычисляет значение один раз и сравнивает его с каждым `@case` строгим равенством `===`. Показывается первый совпавший вариант. Как и у `@if`, остальные варианты на страницу не попадают.

Отличия от `switch` в JavaScript:

- `break` не нужен: проваливания в следующий `@case` нет;
- зато можно объединить несколько значений, написав `@case` подряд без тела:

```html
@switch (game.category) {
  @case ('family')
  @case ('kids') { Для всей семьи }
  @case ('party') { Для компании }
}
```

Для `family` и `kids` здесь одна и та же разметка.

## `@default` и `@default never`

`@default { … }` — вариант на случай, если не совпал ни один `@case`. Но у нас случай особый: у `category` в `core/models.ts` ровно пять значений, и все пять перечислены. Хочется, чтобы компилятор **напомнил**, если в модели появится шестая категория, а бейдж о ней не знает. Для этого есть `@default never`:

```html app.html {7}
@switch (game.category) {
  @case ('family') { Семейная }
  @case ('strategy') { Стратегия }
  @case ('party') { Для компании }
  @case ('cooperative') { Кооперативная }
  @case ('kids') { Детская }
  @default never;
}
```

`@default never;` — без тела, с точкой с запятой. Он говорит проверке шаблонов: «после всех `@case` значение не может быть ничем — тип `never`». Мы проверили `ngc`: если удалить `@case ('kids')`, сборка падает с ошибкой

```
error TS2322: Type '"kids"' is not assignable to type 'never'.
```

Как в TypeScript, когда `switch` по объединению типов не разбирает какой-то вариант. Превью такую проверку не делает: в JIT `@default never;` просто ничего не показывает.

::: task
Добавьте в плитку, сразу после обложки, бейдж категории: `<span class="category">` с блоком `@switch` по `game.category`, пятью `@case` и `@default never;`.
:::

::: tip
После форматирования (кнопка «Формат») каждый `@case` займёт три строки: так Prettier оформляет блоки. Это нормально.
:::

## Что получилось

В левом верхнем углу каждой обложки — бейдж: «Семейная» у «Острова сокровищ», «Стратегия» у «Зельеваров», «Детская» у «Тихой охоты», «Кооперативная» у «Маяка».

## `@switch` или словарь

Честно: для бейджа, где меняется только текст, есть способ не хуже — объект-словарь в классе:

```ts
protected readonly categoryNames: Record<Game['category'], string> = {
  family: 'Семейная',
  strategy: 'Стратегия',
  party: 'Для компании',
  cooperative: 'Кооперативная',
  kids: 'Детская',
};
```

и в шаблоне `{{ categoryNames[game.category] }}`. Тип `Record<…>` тоже заставит перечислить все категории. `@switch` выигрывает, когда варианты отличаются **разметкой**: разными элементами, классами, вложенными компонентами. Например, иконка и текст для одной категории и картинка для другой. Мы взяли `@switch`, чтобы познакомиться с ним на простом примере.

::: legacy Вы встретите в старом коде: ngSwitch
```html
<span [ngSwitch]="game.category">
  <ng-container *ngSwitchCase="'family'">Семейная</ng-container>
  <ng-container *ngSwitchDefault>Другое</ng-container>
</span>
```
Три директивы из `@angular/common`: `NgSwitch`, `NgSwitchCase`, `NgSwitchDefault`. Устарели в Angular 20, вместо них — `@switch`.
:::
