---
title: Хост-элемент
focus: shared/rating/rating.ts
files: [main.ts, app.ts, app.html, app.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
api: [host, ':host', '(keydown.arrowright)']
---

Звёзды фильтра — это элемент управления, как поле ввода или флажок. А у элемента управления есть обязанности, которых у наших звёзд пока нет:

- **клавиатура.** Человек без мыши должен дойти до звёзд клавишей Tab и поменять оценку стрелками;
- **программы чтения с экрана.** Им нужно сказать, что это за элемент («ползунок» или «картинка») и какое у него значение.

Всё это — атрибуты и обработчики самого элемента `<app-rating>`, а не звёзд внутри. Элемент, на котором живёт компонент, — **хост-элемент**. Его создаёт родитель (тег стоит в шаблоне родителя), но управлять им может и сам компонент.

## Поле `host`

В декораторе `@Component` есть поле `host`. Это объект, где ключи — то, что вы написали бы на хост-элементе в шаблоне, а значения — выражения в контексте компонента:

```ts shared/rating/rating.ts {5-14}
@Component({
  selector: 'app-rating',
  templateUrl: './rating.html',
  styleUrl: './rating.css',
  host: {
    '[attr.role]': "readonly() ? 'img' : 'slider'",
    '[attr.aria-label]': "'Рейтинг ' + value() + ' из 5'",
    '[attr.aria-valuenow]': 'readonly() ? null : value()',
    '[attr.aria-valuemax]': 'readonly() ? null : 5',
    '[attr.tabindex]': 'readonly() ? null : 0',
    '[class.readonly]': 'readonly()',
    '(keydown.arrowright)': 'step(0.5)',
    '(keydown.arrowleft)': 'step(-0.5)',
  },
})
```

Синтаксис знаком по главе 2, просто записан в TypeScript:

- `'[attr.role]'` — **привязка хоста** (host binding) к атрибуту. Интерактивные звёзды — `slider` (ползунок), звёзды в карточке — `img` (картинка с подписью);
- `aria-label` — подпись, которую прочитает программа чтения с экрана: «Рейтинг 4.5 из 5»;
- `aria-valuenow` и `aria-valuemax` — текущее и наибольшее значение ползунка. Для картинки они не нужны: `null` у привязки атрибута удаляет атрибут (глава 2);
- `tabindex="0"` ставит элемент в порядок обхода клавишей Tab. Звёзды карточки в него не попадают;
- `'[class.readonly]'` — привязка класса: пригодится в стилях;
- `'(keydown.arrowright)'` — **обработчик события хоста** (host listener) с фильтром клавиш из главы 2.

Кроме привязок, в `host` можно писать статические атрибуты: `role: 'article'` без скобок просто поставит атрибут. Встретим это в следующем шаге.

Обработчик стрелок — новый метод:

```ts shared/rating/rating.ts
// Стрелки на клавиатуре: на ползвезды больше или меньше
protected step(delta: number) {
  if (this.readonly()) return;
  this.value.update((value) => Math.min(Math.max(Math.round(value * 2) / 2 + delta, 0), 5));
}
```

Округление до половинки — на случай, если в модель пришло значение вроде `4.6`.

## Стили хоста: `:host`

Хост-элементу нужен свой вид: рамка фокуса и обычный указатель мыши в режиме `readonly`. Стили компонента действуют на его шаблон, а хост-элемент — не часть шаблона. Для него в CSS компонента есть особый селектор `:host`:

```css shared/rating/rating.css
/* :host — сам элемент <app-rating> */
:host {
  display: inline-flex;
  border-radius: 4px;
}

:host(:focus-visible) {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

:host(.readonly) .star {
  cursor: default;
}
```

- `:host` — сам `<app-rating>`. Незнакомые браузеру элементы по умолчанию строчные (`display: inline`), поэтому задаём `inline-flex`;
- `:host(:focus-visible)` — хост, когда он в фокусе с клавиатуры. В скобках — условие для хоста;
- `:host(.readonly) .star` — звёзды внутри хоста с классом `readonly`. Тот самый класс из `host`.

Подробнее о стилях компонента — в следующем шаге.

::: task
1. Добавьте в декоратор `Rating` поле `host`, как в коде выше, и метод `step`.
2. Допишите в конец `rating.css` правила для `:host`.
:::

## Что получилось

Нажимайте Tab от поля поиска: фокус перейдёт на флажок, потом на звёзды фильтра — вокруг них появится рамка. Стрелка вправо — плюс половина звезды, каталог сразу фильтруется; влево — минус. До звёзд в карточках Tab не доходит, а указатель над ними теперь обычный.

Откройте инструменты разработчика. У фильтра:

```html
<app-rating role="slider" aria-label="Рейтинг 4 из 5" aria-valuenow="4" aria-valuemax="5" tabindex="0">
```

а в карточке «Ночного экспресса»:

```html
<app-rating readonly="" role="img" aria-label="Рейтинг 4.8 из 5" class="readonly">
```

Служебные атрибуты `_ngcontent-…` и `_nghost-…` здесь опущены — о них в конце главы. Атрибут `readonly=""` поставил родитель в своём шаблоне, остальное — сам компонент через `host`.

## `host` или обёртка

Всего этого можно было добиться и без `host`: обернуть звёзды в шаблоне в `<div role="slider" tabindex="0" (keydown.arrowright)="…">`. Но тогда в DOM появился бы лишний элемент, а родитель, поставив на `<app-rating>` класс или атрибут, промахнулся бы мимо настоящего элемента управления. Хост-элемент уже есть — компонент заботится о нём сам.

::: deep Под капотом: hostBindings
Компилятор превращает поле `host` в отдельную функцию `hostBindings` у компонента — маленький «шаблон» для хост-элемента с теми же режимами создания и обновления, что у функции шаблона из главы 1. В выводе `ngc` для `Rating`: в блоке создания — `ɵɵlistener("keydown.arrowright", … ctx.step(0.5))`, в блоке обновления — `ɵɵattribute("role", ctx.readonly() ? "img" : "slider")("aria-label", …)` и `ɵɵclassProp("readonly", ctx.readonly())`. Выполняется она вместе с проверкой родителя: хост-элемент стоит в шаблоне родителя.
:::

::: legacy Вы встретите в старом коде: @HostBinding и @HostListener
```ts
@HostBinding('attr.role') get role() {
  return this.readonly ? 'img' : 'slider';
}

@HostListener('keydown.arrowright')
increase() {
  this.step(0.5);
}
```
Декораторы над полями и методами делают то же, что поле `host`. Они до сих пор работают, но руководство по стилю Angular советует `host`: все привязки хоста видны в одном месте.
:::
