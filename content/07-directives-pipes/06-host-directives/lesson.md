---
title: Композиция директив
startFrom: custom
focus: shared/in-view.ts
files: [main.ts, app.ts, app.html, app.css, shared/in-view.ts, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/tooltip.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
api: [hostDirectives, 'output({ alias })', 'subscribe()']
---

В практикуме главы 6 мы написали `LoadMore`: кнопку «Показать ещё», которая срабатывает сама, когда покупатель докрутил до неё. Внутри — `IntersectionObserver`, `afterNextRender` и `DestroyRef`. В практикуме этой главы то же самое понадобится обложкам: загружать картинку, когда карточка появилась на экране. Копировать наблюдатель второй раз не будем — вынесем его в директиву `InView`, которую можно поставить на любой элемент:

```html
<div (appInView)="…">
```

А потом соберём из неё `LoadMore`. Директивы, которые компонент подключает к своему хосту сам, называются **хост-директивами** (host directives), а сам приём — **композицией директив** (directive composition).

## Что изменилось в коде

Появился `shared/in-view.ts` с заготовкой. В `load-more.ts` — `TODO`: код наблюдателя оттуда уйдёт в директиву.

## Директива `InView`

```ts shared/in-view.ts
// Сообщает, что хост-элемент появился на экране: <div (appInView)="…">
@Directive({ selector: '[appInView]' })
export class InView {
  // В шаблоне выход называется как селектор: (appInView)="…"
  readonly visible = output({ alias: 'appInView' });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    // IntersectionObserver — API браузера: создаём его после отрисовки, когда хост уже в документе
    afterNextRender(() => {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.visible.emit();
        }
      });
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
```

Код наблюдателя — из `LoadMore`, почти без изменений. Новое — в объявлении выхода.

В шаге 5 вход директивы назывался так же, как селектор, — и одного атрибута хватало, чтобы и включить директиву, и передать ей текст. С выходом так тоже можно: `(appInView)="…"` подходит под селектор `[appInView]`. Angular сопоставляет селекторы атрибутов не только со статическими атрибутами, но и с именами привязок — входов `[x]` и выходов `(x)`. Поэтому отдельный атрибут `appInView` писать не нужно.

Но внутри класса поле `appInView` читалось бы странно: `this.appInView.emit()`. Поэтому поле называется `visible`, а для шаблона у выхода есть **псевдоним** (alias) — `output({ alias: 'appInView' })`, как `alias` у входов в главе 5.

## Хост-директива

Можно было бы поставить директиву прямо в шаблоне `App`: `<app-load-more appInView (appInView)="showMore()">`. Но «срабатывает при появлении» — свойство самой кнопки «Показать ещё», а не того, кто её использует. Пусть `LoadMore` подключает наблюдатель сам:

```ts shared/load-more/load-more.ts {4,11-12}
@Component({
  selector: 'app-load-more',
  // InView работает на хосте <app-load-more>, как если бы родитель написал там appInView
  hostDirectives: [InView],
  templateUrl: './load-more.html',
  styleUrl: './load-more.css',
})
export class LoadMore {
  readonly more = output();

  constructor() {
    // Директива на том же хосте — её экземпляр выдаёт inject
    inject(InView).visible.subscribe(() => this.more.emit());
  }
}
```

`hostDirectives` — список директив, которые Angular создаст на хосте компонента при каждом его использовании. Селектор `InView` здесь не важен: атрибута `appInView` у `<app-load-more>` нет, директива всё равно на месте. Хост-директивы есть и у директив: `@Directive({ hostDirectives: [...] })` — это пригодится в практикуме.

Как `LoadMore` узнаёт, что `InView` сработала? Директива стоит на том же элементе, поэтому `inject(InView)` выдаёт её экземпляр — так же, как `inject(ElementRef)` выдаёт сам элемент. Подробно о том, что и откуда умеет выдавать `inject()`, — в главе 8.

У выхода есть метод `subscribe(функция)` — подписаться из кода, а не из шаблона. Отписываться не нужно: когда `InView` уничтожается, её выход забывает всех подписчиков сам.

::: task
1. В `shared/in-view.ts` напишите директиву `InView` с селектором `[appInView]` и выходом `visible` с псевдонимом `appInView`. Перенесите в неё наблюдатель из `LoadMore`.
2. В `LoadMore` подключите `InView` через `hostDirectives`, а в конструкторе подпишитесь на `visible` и вызывайте `more`. Всё остальное из конструктора `LoadMore` удалите.
:::

## Что получилось

Снаружи — ничего нового, и это хороший знак: прокрутите превью вниз, и вторая порция игр появится сама, как в главе 6. А «Показать ещё» по щелчку работает как раньше: шаблон `LoadMore` не менялся. Зато `LoadMore` сократился до трёх строк поведения, а наблюдатель теперь можно поставить на что угодно.

## Эксперимент: кто создаётся первым

Добавьте `console.log` в начало конструкторов `InView` и `LoadMore`:

```
InView: конструктор
LoadMore: конструктор
```

Хост-директивы создаются раньше компонента, к которому подключены. Поэтому в конструкторе `LoadMore` экземпляр `InView` уже есть, и `inject(InView)` его находит.

## Эксперимент: выходы хост-директивы

Попробуйте подписаться на `InView` снаружи, в `app.html`:

```html
<app-load-more (more)="showMore()" (appInView)="log()" />
```

(`log()` — метод `App` с `console.log`.) Прокрутите вниз: `log()` молчит, ошибок нет. Входы и выходы хост-директивы по умолчанию **закрыты**: это детали устройства `LoadMore`, снаружи их не видно. А `(appInView)` на элементе без такого выхода Angular считает обычным событием DOM — его никто никогда не отправит.

Откройте выход явно:

```ts shared/load-more/load-more.ts
hostDirectives: [{ directive: InView, outputs: ['appInView'] }],
```

Теперь при прокрутке в консоли сообщение от `log()`. Так же открываются входы: `inputs: ['имя']`, а `'appInView: seen'` открыл бы выход под другим именем — `(seen)`. Верните `hostDirectives: [InView]` и уберите `log()`.

## Эксперимент: директива дважды

Напишите в `app.html` `<app-load-more appInView (more)="showMore()" />` и добавьте `InView` в `imports` у `App`. Теперь `InView` подходит к элементу дважды: по селектору и как хост-директива. Лог в конструкторе `InView` покажет одно создание: Angular не создаёт вторую копию той же директивы на элементе. Уберите эксперимент.

## Эксперимент: компонент как хост-директива

Попробуйте `hostDirectives: [InView, Rating]`:

```
ERROR RuntimeError: NG0310: Host directive Rating cannot be a component.
```

На элементе может быть только один компонент, и у `<app-load-more>` он уже есть — сам `LoadMore`. Хост-директивами бывают только директивы.

::: tip Композиция вместо наследования
Поведение можно было бы передать и наследованием: `class LoadMore extends InView`. Но класс наследует только от одного родителя, а хост-директив может быть сколько угодно: «появился на экране», «подсказка», «перетаскивание». Каждая — отдельный кусок поведения, который подключается одной строкой. Поэтому библиотеки, например Angular CDK, дают поведение (перетаскивание, меню, работу с фокусом) отдельными директивами: их ставят на элемент в шаблоне или подключают к своему компоненту через `hostDirectives`.
:::
