---
title: Доступ к элементам
focus: app.ts
files: [main.ts, app.ts, app.html, app.css, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
api: ['viewChild()', 'viewChild.required()', 'viewChildren()', ElementRef, read, NG0951]
---

Наберите в поиске «zzz»: каталог пуст, под ним кнопка «Сбросить фильтры». Нажмите её — каталог вернулся. А теперь начните печатать: ничего не происходит. Фокус пропал.

Кнопка была внутри блока `@empty`. Фильтры сброшены, каталог не пуст — и `@empty` удалил кнопку вместе с фокусом. Фокус перешёл на `<body>`, и покупателю нужно снова щёлкать в поле поиска. Хорошо бы вернуть фокус туда самим: после сброса покупатель, скорее всего, будет искать заново.

Для этого нужен метод DOM `focus()`, то есть сам элемент `<input>`. Шаблонные привязки тут не помогут: у элемента нет свойства «в фокусе», которое можно привязать.

## Ссылка из шаблона в класс

У поля поиска уже есть ссылка `#searchBox` — мы завели её в главе 2. В шаблоне её можно использовать прямо в обработчике:

```html
<button class="link-button" (click)="resetFilters(); searchBox.focus()">Сбросить фильтры</button>
```

Это работает. Но сброс фильтров — логика `App`, и решение «после сброса фокус в поиск» — её часть. Если `resetFilters()` позовут откуда-то ещё, фокус должен вернуться и там. Поэтому достанем элемент в класс. Для этого есть **запрос к представлению** (view query) — `viewChild()`:

```ts app.ts {1,4-5,12-13}
import { Component, ElementRef, computed, effect, signal, viewChild } from '@angular/core';

export class App {
  // Поле поиска из шаблона: #searchBox
  private readonly searchBox = viewChild.required<ElementRef<HTMLInputElement>>('searchBox');
  // …

  protected resetFilters() {
    this.query.set('');
    // … остальные фильтры
    this.sortBy.set('default');
    // Кнопка «Сбросить фильтры» сейчас исчезнет вместе с фокусом — вернём фокус в поиск
    this.searchBox().nativeElement.focus();
  }
}
```

Разберём:

- `viewChild('searchBox')` ищет в шаблоне компонента элемент со ссылкой `#searchBox`;
- для обычного элемента результат — `ElementRef`, обёртка над элементом DOM. Сам элемент — в `nativeElement`. Тип элемента Angular не знает, поэтому указываем его сами: `ElementRef<HTMLInputElement>`;
- результат запроса — **сигнал**. Чтобы получить элемент, его вызывают: `this.searchBox()`;
- `viewChild.required` — обязательный запрос: мы уверены, что элемент в шаблоне есть всегда. Тип результата — `ElementRef<…>`, без `undefined`. Обычный `viewChild` вернул бы `ElementRef<…> | undefined`, и перед `.nativeElement` пришлось бы проверять результат;
- поле `private`: шаблону оно не нужно, только классу. И `readonly`, как у входов: значение задаёт Angular.

::: task
Добавьте в `App` запрос `searchBox` и верните фокус в поле поиска в конце `resetFilters()`.
:::

## Что получилось

Снова «zzz» и «Сбросить фильтры»: курсор мигает в поле поиска, можно сразу печатать. Мы проверили: без строки с `focus()` после сброса `document.activeElement` — `BODY`, с ней — поле поиска.

## Запросы — это сигналы

Запросы обновляются вместе с шаблоном: появился элемент — результат запроса изменился. Поэтому их и сделали сигналами: можно читать в `computed` и `effect` и получать новые значения автоматически.

Проверим на `viewChildren()` — запросе всех совпадений сразу. Его результат — массив только для чтения. Искать можно не только по ссылке, но и по классу компонента:

```ts app.ts
private readonly cards = viewChildren(GameCard);
private readonly ratings = viewChildren(Rating);

constructor() {
  effect(() => console.log('Карточек:', this.cards().length, '; Rating:', this.ratings().length));
  // …
}
```

Добавьте `viewChildren` в импорт и откройте консоль:

```
Карточек: 0 ; Rating: 1
Карточек: 12 ; Rating: 1
```

Наберите «кот» — `Карточек: 6`, затем `1`: эффект срабатывает, когда меняется набор карточек на экране. Наберите «zzz» — `0`.

Обратите внимание на два числа.

- **Сначала карточек 0.** Первый запуск эффекта прошёл, когда блок `@for` ещё не создал карточки. Запрос — сигнал, и, как только карточки появились, эффект выполнился снова.
- **`Rating` всего один**, хотя звёзд на странице 13. Запрос к представлению ищет только в **собственном шаблоне** компонента. В шаблоне `App` один `<app-rating>` — фильтр «Рейтинг от». Звёзды карточек лежат в шаблоне `GameCard`, и запрос `App` до них не дотягивается — так же, как стили `App` не дотягиваются до элементов карточки.

Что возвращает запрос, зависит от того, что найдено: для элемента — `ElementRef`, для компонента — экземпляр его класса. Через `viewChild.required(Rating)` можно прочитать `value()` фильтра. Если у компонента нужен именно хост-элемент, укажите это опцией `read`: `viewChild(Rating, { read: ElementRef })` вернёт `ElementRef` элемента `<app-rating>`.

Уберите эксперимент.

## Эксперимент: запрос в конструкторе

Перенесите фокус в конструктор `App`, как будто поле должно получать фокус при запуске:

```ts app.ts
constructor() {
  this.searchBox().nativeElement.focus();
  // …
}
```

Приложение не запустится:

```
ERROR RuntimeError: NG0951: Child query result is required but no value is available.
```

Как и с входами в прошлом шаге: в конструкторе шаблон ещё не создан, искать в нём нечего. Обязательный запрос, прочитанный слишком рано, бросает ошибку. Верните код на место. Когда запрос уже можно читать — в обработчиках событий, эффектах и после отрисовки — разберём в следующем шаге.

::: tip Когда DOM напрямую, а когда шаблон
`nativeElement` — прямой доступ к DOM в обход Angular. Пользуйтесь им для того, что шаблон сделать не может: фокус, прокрутка, замеры, методы вроде `showModal()` или `play()`, сторонние библиотеки. Текст, атрибуты, классы и стили меняйте привязками: иначе Angular не знает об изменении и при следующей проверке может перезаписать его своим значением. И не вставляйте через `nativeElement.innerHTML` данные пользователя — это обходит санитизацию из главы 2.
:::

::: legacy Вы встретите в старом коде: @ViewChild
```ts
@ViewChild('searchBox') searchBox!: ElementRef<HTMLInputElement>;
@ViewChildren(GameCard) cards!: QueryList<GameCard>;
```
До Angular 17.2 запросы объявляли декораторами над полями. Результат был не сигналом, а обычным полем, которое Angular заполнял сам, — и до хука `ngAfterViewInit` (шаг 7) оно было `undefined`. Для нескольких результатов был класс `QueryList` с потоком `changes`. Ещё встретится `{ static: true }` — способ получить элемент раньше, если он не внутри управляющего блока.
:::
