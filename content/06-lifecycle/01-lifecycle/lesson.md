---
title: Когда что происходит
startFrom: custom
base: 05-components/09-practice
baseHash: 'a1fcb1aca682'
focus: shared/game-card/game-card.ts
files: [main.ts, app.ts, app.html, app.css, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
api: [жизненный цикл, constructor, 'inject()', ElementRef, NG0950, NG0203]
---

До сих пор мы описывали, **что** показать, а **когда** это сделать, решал Angular. Мы писали шаблон, а Angular сам создавал элементы, обновлял текст и удалял лишнее. Но иногда нужно вмешаться в определённый момент: поставить фокус в поле, открыть модальное окно, замерить элемент, остановить таймер. Для этого нужно знать, что происходит с компонентом от создания до уничтожения. Это и есть **жизненный цикл** (lifecycle).

В этой главе «Ход конём» получит:

- окно «Подробнее» об игре — настоящее модальное окно с вкладками «Описание» и «Характеристики»;
- таймер «Скидка действует ещё 07:16:10», который останавливается, когда окно закрыто;
- фокус в поле поиска после сброса фильтров;
- кнопку «Показать ещё», которая срабатывает сама, когда вы докрутили каталог до конца.

А в конце главы разберём, когда и какие компоненты Angular проверяет.

## Что изменилось в коде

Код — решение практикума главы 5 с такими добавлениями:

- папка `shared/game-details` — готовый компонент `GameDetails`, окно «Подробнее». Прочитайте его: ничего нового в нём нет. Входы `game` и `inCart`, выходы `add` и `closed`, в шаблоне — обложка, звёзды, цена, кнопка «В корзину» и описание. Окно — элемент `<dialog open>`, а под ним затемнение `<div class="backdrop">`; щелчок по затемнению или по «×» вызывает `closed`;
- в `game-card.css` — стили для кнопки-названия `.title-button`;
- комментарии `TODO` в `game-card.ts`, `game-card.html`, `app.ts` и `app.html`.

## Открываем окно

Окно должно открываться щелчком по названию игры. Название станет кнопкой, а карточка сообщит родителю о щелчке новым выходом:

```ts shared/game-card/game-card.ts {3-4}
readonly add = output();
// Покупатель хочет посмотреть подробности об игре
readonly open = output();
```

```html shared/game-card/game-card.html {2}
<h2 class="title">
  <button class="title-button" (click)="open.emit()">{{ game().title }}</button>
</h2>
```

`App` хранит, какая игра открыта, и показывает окно, только пока она есть:

```ts app.ts {2}
// Игра, открытая в окне «Подробнее»; null — окно закрыто
protected readonly selectedGame = signal<Game | null>(null);
```

```html app.html {1,7,10}
<app-game-card … (open)="selectedGame.set(game)">…</app-game-card>

<!-- в конце <main> -->
@if (selectedGame(); as game) {
  <app-game-details
    [game]="game"
    [inCart]="inCart().get(game.id) ?? 0"
    (add)="addToCart(game)"
    (closed)="selectedGame.set(null)"
  />
}
```

::: task
1. В `GameCard` добавьте выход `open`, а название в шаблоне сделайте кнопкой `.title-button`, которая его вызывает.
2. В `App` добавьте сигнал `selectedGame`, подпишитесь на `(open)` у карточки и выведите `<app-game-details>` в блоке `@if` в конце `<main>`. Не забудьте `GameDetails` в `imports`.
:::

## Что получилось

Щёлкните по «Острову сокровищ»: поверх каталога появится окно с обложкой, ценой и описанием. «В корзину» в окне работает: шапка и карточка под окном обновятся. «×» или щелчок по затемнению закрывает окно.

Окно пока ненастоящее: Esc его не закрывает, а фокус остаётся на странице под окном — нажмите Tab, и он пойдёт по карточкам за затемнением. Это исправим в шаге 3.

## Жизнь компонента

Сигнал `selectedGame` получил игру — `@if` **создал** `GameDetails`. Сигнал стал `null` — `@if` компонент **уничтожил**. Каждое открытие окна — новый экземпляр класса, а между созданием и уничтожением Angular **проверяет** компонент, когда меняются его данные. Вот что происходит при открытии:

```
selectedGame.set(игра)
│
├─ new GameDetails()   конструктор: входов
│                      ещё нет, DOM пуст
├─ game, inCart        Angular пишет входы
├─ проверка            эффекты, затем
│  GameDetails         шаблон: элементы,
│                      тексты, привязки
├─ отрисовка           DOM готов —
│  закончена           afterNextRender
│  …                   проверки при каждом
│                      изменении данных
selectedGame.set(null)
└─ уничтожение         DestroyRef
```

Каждому моменту в этой главе посвящён свой шаг. Начнём с самого первого — конструктора.

## Эксперимент: конструктор и входы

Добавьте в `GameDetails` конструктор, который выводит название игры:

```ts shared/game-details/game-details.ts
constructor() {
  console.log('GameDetails: конструктор', this.game().title);
}
```

Щёлкните по названию игры. Окно не откроется, а в консоли будет:

```
ERROR RuntimeError: NG0950: Input is required but no value is available yet.
```

Конструктор — обычный конструктор класса. Angular вызывает `new GameDetails()` и только потом записывает значения входов. В момент вызова конструктора `[game]="game"` ещё не выполнилось. После этой ошибки представление `App` сломано, и щелчки по другим играм тоже ничего не откроют. Обновите превью кнопкой ⟳.

Тот же вход можно читать в `computed`, `effect` и шаблоне: они выполняются позже, во время проверки, когда входы уже есть.

## Эксперимент: где хост-элемент

Компонент может получить свой **хост-элемент** — `<app-game-details>`. Для этого есть функция `inject()`: она просит у Angular объект по его типу. `inject(ElementRef)` возвращает обёртку над хост-элементом, сам элемент — в поле `nativeElement`. Подробно о `inject()` — в главе 8, а пока используем её как есть:

```ts shared/game-details/game-details.ts
constructor() {
  const host: HTMLElement = inject(ElementRef).nativeElement;
  console.log('конструктор: в документе?', host.isConnected, '; содержимое:', host.innerHTML.length);
  effect(() => {
    const title = host.querySelector('h2')?.textContent;
    console.log('эффект:', this.game().title, '; в документе?', host.isConnected, '; заголовок:', JSON.stringify(title));
  });
}
```

`ElementRef`, `effect` и `inject` добавьте в импорт из `@angular/core`. Откройте «Остров сокровищ»:

```
конструктор: в документе? false ; содержимое: 0
эффект: Остров сокровищ ; в документе? true ; заголовок: ""
```

Хост-элемент уже создан, но пуст и ещё не вставлен в страницу. В эффекте вход есть, хост в документе, элементы шаблона созданы — но заголовок пока пустой: эффекты компонента выполняются до того, как Angular обновит его шаблон (мы видели это в главе 3). Значит, ни конструктор, ни эффект не подходят для работы с готовым DOM. Для неё есть отдельный момент — после отрисовки, шаг 3.

Закройте окно и откройте снова: обе строки появятся ещё раз. Это новый экземпляр `GameDetails`, прежний уничтожен.

## Контекст внедрения

`inject()` работает только в **контексте внедрения** (injection context): в конструкторе и в инициализаторах полей. Ту же границу мы встречали у `effect()` в главе 3. Попробуйте вызвать `inject()` в обработчике события:

```ts shared/game-details/game-details.ts
protected addToCart() {
  const host = inject(ElementRef).nativeElement;
  this.add.emit();
}
```

И в шаблоне `(click)="addToCart()"` у кнопки «В корзину». Нажмите её:

```
ERROR RuntimeError: NG0203: The `ElementRef` token injection failed. `inject()` function must be called from an injection context such as a constructor, a factory function, a field initializer, or a function used with `runInInjectionContext`.
```

Причина та же, что у `effect()`: `inject()` узнаёт, какой компонент сейчас создаётся, а во время щелчка ничего не создаётся. Правило простое: всё, что нужно от Angular, получайте в поле или в конструкторе и сохраняйте в поле класса.

Уберите эксперименты: в `GameDetails` конструктора нет, кнопка «В корзину» вызывает `add.emit()`.

## Что запомнить

- Конструктор — для того, чтобы создать поля, сигналы, эффекты и получить объекты через `inject()`. Входов и DOM в нём ещё нет.
- Входы читайте в `computed`, `effect` и шаблоне.
- Готовый DOM — после отрисовки. Об этом шаг 3, а перед ним — как добраться до элементов шаблона.

::: legacy Вы встретите в старом коде: внедрение через конструктор
```ts
export class GameDetails {
  constructor(private el: ElementRef) {}
}
```
До Angular 14 объекты от Angular получали только параметрами конструктора: Angular смотрел на их типы и передавал нужные. Такой код работает и сейчас, но `inject()` удобнее: не нужен конструктор с длинным списком параметров, поле с зависимостью объявляется там же, где используется, а наследование классов не требует передавать зависимости в `super(...)`.
:::
