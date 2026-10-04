---
title: 'Практикум: «Показать ещё»'
startFrom: custom
focus: shared/load-more/load-more.ts
files: [main.ts, app.ts, app.html, app.css, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
api: [IntersectionObserver, 'inject(ElementRef)', afterNextRender, DestroyRef, linkedSignal]
---

Сейчас в каталоге 12 игр, и все они рисуются сразу. В главе 11 игры будут приходить с сервера, и их станет больше. Показывать сотню карточек разом — долго и бессмысленно: покупатель редко листает дальше первых рядов. Обычно каталог показывает порцию, а под ней кнопку «Показать ещё». А чтобы не заставлять щёлкать, кнопка срабатывает и сама — когда покупатель докрутил страницу до неё.

Узнать, что элемент появился на экране, помогает API браузера `IntersectionObserver`:

```ts
const observer = new IntersectionObserver((entries) => {
  // entries — что изменилось; isIntersecting — элемент виден
});
observer.observe(element); // следить за элементом
observer.disconnect();     // перестать следить за всеми
```

В коде шага — заготовки: папка `shared/load-more` (в `load-more.ts` и `load-more.html` — `TODO`, `load-more.css` готов), константа `PAGE_SIZE = 6` и комментарии `TODO` в `app.ts` и `app.html`.

::: task
1. **Компонент `LoadMore`** с селектором `app-load-more`: кнопка «Показать ещё» (класс `button`) и выход `more`.
   - Щелчок по кнопке вызывает `more`.
   - `more` срабатывает и без щелчка — когда хост-элемент `<app-load-more>` появился на экране. Следит за этим `IntersectionObserver`.
   - Наблюдатель создаётся, когда хост уже в документе, и отключается, когда компонент уничтожен.
2. **`App`.** Каталог показывает первые `PAGE_SIZE` игр из найденных. `showMore()` добавляет ещё `PAGE_SIZE`. Новый поиск, фильтр или сортировка — снова первая порция.
3. **Шаблон `App`.** Сетка выводит только показанные игры. Под сеткой — `<app-load-more>`, пока показаны не все найденные игры.
:::

::: hint Подсказка 1: хост-элемент и момент
Хост-элемент компонента даёт `inject(ElementRef)` — помните шаг 1? В конструкторе он ещё не вставлен в документ, а `IntersectionObserver` — API браузера, которого нет при серверной отрисовке. Значит, создавать наблюдатель нужно в `afterNextRender`, а отключать — в `DestroyRef.onDestroy`.
:::

::: hint Подсказка 2: inject — снаружи
Хочется написать `inject(DestroyRef)` прямо внутри `afterNextRender`. Попробуйте — `NG0203: The \`DestroyRef\` token injection failed. \`inject()\` function must be called from an injection context…`. Функция в `afterNextRender` выполняется позже, вне контекста внедрения. Получите `ElementRef` и `DestroyRef` в конструкторе, сохраните в переменные, а внутри `afterNextRender` используйте их.
:::

::: hint Подсказка 3: сколько показано
«Сколько показано» — изменяемое состояние, которое должно сбрасываться, когда меняются найденные игры. Это `linkedSignal` из главы 3 — в полной форме, с `source: this.visibleGames` и `computation: () => PAGE_SIZE`. Помните ловушку с литеральным типом: `PAGE_SIZE` — константа `6`, и без явного типа сигнал будет типа `6`. Укажите типы: `linkedSignal<Game[], number>({ … })`. Показанные игры — `computed` со `slice`.
:::

::: hint Подсказка 4: компонент целиком
```ts
export class LoadMore {
  readonly more = output();

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.more.emit();
        }
      });
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
```
:::

## Проверьте себя

- В каталоге 6 карточек, под ними «Показать ещё».
- Прокрутите превью вниз: как только кнопка показалась, карточек стало 12, а кнопка исчезла — все игры показаны, и `@if` убрал `LoadMore`.
- Прокрутите вверх и наберите в поиске «а»: найдено 11 игр, показано снова 6, кнопка вернулась. Сотрите поиск — опять 6 из 12.
- Щёлкните «Показать ещё», не прокручивая, — 12 карточек.
- Смена сортировки и флажок «Только в наличии» тоже возвращают первую порцию.

Почему кнопка — не только украшение: если первая порция почему-то целиком помещается на экране (большой монитор), наблюдатель сработает сразу, покажет вторую порцию — и, если кнопка всё ещё видна, больше не сработает: он сообщает об **изменении** видимости, а она не менялась. Кнопка остаётся запасным путём.

## Итоги главы

| Что | Когда и зачем |
|---|---|
| конструктор, `inject()` | создать поля, сигналы, эффекты, получить объекты Angular. Входов и DOM ещё нет |
| `viewChild()`, `viewChildren()` | элементы и компоненты своего шаблона; результат — сигнал |
| `contentChild()`, `contentChildren()` | компоненты из содержимого, которое вложил родитель |
| `afterNextRender()` | один раз после отрисовки: `showModal()`, наблюдатели, сторонние библиотеки |
| `afterRenderEffect()` | после отрисовки, когда изменились сигналы: замеры |
| `afterEveryRender()` | после каждой отрисовки — редко |
| фазы `earlyRead` / `write` / `mixedReadWrite` / `read` | порядок работы с DOM между компонентами |
| `DestroyRef.onDestroy()` | уборка: таймеры, слушатели, наблюдатели |
| `ngOnInit`, `ngOnChanges`, `ngOnDestroy` | то же самое в старом коде |

И главные идеи:

- у компонента есть жизнь: создание, проверки, уничтожение. `@if` и `@for` создают и уничтожают компоненты постоянно;
- конструктор — слишком рано для входов и DOM. Входы — в `computed` и эффектах, DOM — после отрисовки;
- шаблон и привязки — основной способ работать с DOM. Прямой доступ через `ElementRef` — для того, чего шаблон не умеет;
- что создали сами в обход шаблона — то убираем сами. Слушатели шаблона и `host`, эффекты и запросы Angular убирает за вас.

За главу мы не раз опирались на слова «когда Angular проверяет компонент». Что именно он проверяет, в каком порядке и почему при нажатии «В корзину» не трогает остальные карточки — в необязательном шаге «под капотом». А следующая глава — про директивы и пайпы: как добавить поведение любому элементу и как наконец вывести цену с пробелом между разрядами.
