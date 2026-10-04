---
title: 'Практикум: ленивая картинка'
startFrom: custom
focus: shared/lazy-image.ts
files: [main.ts, app.ts, app.html, app.css, shared/lazy-image.ts, shared/in-view.ts, shared/tooltip.ts, shared/price-pipe.ts, shared/players-pipe.ts, shared/duration-pipe.ts, shared/plural.ts, shared/game-details/game-details.ts, shared/game-details/game-details.html, shared/game-details/game-details.css, shared/game-card/game-card.ts, shared/game-card/game-card.html, shared/game-card/game-card.css, shared/rating/rating.ts, shared/rating/rating.html, shared/rating/rating.css, shared/quantity/quantity.ts, shared/quantity/quantity.html, shared/quantity/quantity.css, shared/tabs/tabs.ts, shared/tabs/tabs.html, shared/tabs/tabs.css, shared/tabs/tab.ts, shared/tabs/tab.html, shared/countdown/countdown.ts, shared/countdown/countdown.html, shared/countdown/countdown.css, shared/load-more/load-more.ts, shared/load-more/load-more.html, shared/load-more/load-more.css, core/models.ts, core/games-data.ts, app.config.ts, styles.css]
api: [директива для img, hostDirectives, '[attr.src]', '(load)']
---

Обложки игр — самые тяжёлые файлы на странице. Сейчас браузер загружает обложку, как только карточка попала в DOM, — даже если до неё ещё листать и листать. В главе 11 игр станет больше, и покупатель, который смотрит первый ряд, будет ждать загрузки картинок, которых не видит.

Сделаем **ленивую картинку**: обложка загружается, только когда карточка появилась на экране, а пока грузится — плавно проявляется, а не выскакивает рывком. Это директива для `<img>`:

```html
<img class="cover" [appLazy]="game().cover" [alt]="game().title" />
```

Всё нужное уже есть: директива `InView` из прошлого шага знает, когда элемент появился на экране, а стили `.lazy` и `.lazy.loaded` лежат в `styles.css` с начала главы:

```css
.lazy {
  opacity: 0;
  transition: opacity 0.4s;
}

.lazy.loaded {
  opacity: 1;
}
```

В коде шага — заготовка `shared/lazy-image.ts` и `TODO` в `game-card.html`.

::: task
1. **Директива `LazyImage`** в `shared/lazy-image.ts`, только для элементов `<img>` с атрибутом `appLazy`.
   - Обязательный вход `appLazy` — адрес картинки.
   - Пока картинка не появилась на экране, у `<img>` нет атрибута `src` — браузер ничего не загружает. Появилась — `src` получает адрес из `appLazy`.
   - У хоста всегда есть класс `lazy`, а когда картинка загрузилась (событие `load`), добавляется класс `loaded`.
   - За появлением на экране следит `InView` — как хост-директива.
2. **Карточка**: обложка — через `[appLazy]` вместо `[src]`. Не забудьте `imports`.
:::

::: hint Подсказка 1: селектор
Селектор может требовать сразу и элемент, и атрибут — как в CSS: `img[appLazy]`. На `<div appLazy>` такая директива не встанет. Встроенная директива Angular для картинок устроена так же: её селектор — `img[ngSrc]`.
:::

::: hint Подсказка 2: состояние
Директиве нужны два сигнала: «была ли картинка на экране» и «загрузилась ли». Адрес для атрибута — `computed`: адрес из входа, если картинка была на экране, иначе `null`. Привязка `[attr.src]` со значением `null` удаляет атрибут — это вы знаете из главы 2.
:::

::: hint Подсказка 3: host
Всё, что директива делает с элементом, описывается в `host`: статический класс — `class: 'lazy'`, привязки — `'[attr.src]'` и `'[class.loaded]'`, обработчик — `'(load)'`. Обработчиком может быть прямо запись в сигнал: `'loaded.set(true)'`.
:::

::: hint Подсказка 4: директива целиком
```ts
@Directive({
  selector: 'img[appLazy]',
  hostDirectives: [InView],
  host: {
    class: 'lazy',
    '[attr.src]': 'src()',
    '[class.loaded]': 'loaded()',
    '(load)': 'loaded.set(true)',
  },
})
export class LazyImage {
  readonly appLazy = input.required<string>();

  private readonly seen = signal(false);
  protected readonly src = computed(() => (this.seen() ? this.appLazy() : null));
  protected readonly loaded = signal(false);

  constructor() {
    inject(InView).visible.subscribe(() => this.seen.set(true));
  }
}
```
:::

## Проверьте себя

- Обложки первых карточек плавно проявляются после запуска превью.
- Щёлкните «Показать ещё», не прокручивая. Откройте инструменты разработчика браузера и найдите карточки последнего ряда: у их `<img>` есть классы `lazy cover`, но нет `src`. Мы проверили в окне превью 500 × 600: после щелчка обложки получили 9 карточек из 12 — кнопка прокрутила страницу, и третий ряд показался.
- Прокрутите вниз: последние обложки проявились, у `<img>` теперь `src` и класс `loaded`.
- Прокрутите вверх и обратно — обложки не загружаются заново и не мигают: `seen` уже `true`.
- Обложка «Маяка» (нет в наличии) — серая и полупрозрачная, как и раньше.

Почему `src` — через `computed`, а не просто `src.set(адрес)` при появлении? Так адрес всегда берётся из текущего значения входа: если родитель передаст другую картинку, `src` поменяется сам.

## Итоги главы

| Что | Зачем |
|---|---|
| `{{ x \| pipe: параметр }}` | преобразовать значение для показа прямо в шаблоне |
| `currency`, `number`, `percent`, `date`, `json` … | встроенные пайпы из `@angular/common` |
| `LOCALE_ID` + `registerLocaleData` | правила форматирования для языка приложения |
| `formatCurrency`, `formatNumber` … | то же форматирование в коде класса и в `host`, где пайпов нет |
| `@Pipe({ name })` + `transform` | свой пайп; параметры — следующие аргументы `transform` |
| чистый / `pure: false` | чистый пересчитывается, только когда изменились аргументы |
| `@Directive({ selector: '[appX]' })` | поведение для любого элемента: `host`, `input()`, `inject(ElementRef)` |
| `hostDirectives` | подключить готовые директивы к хосту компонента или директивы |

И главные идеи:

- пайп превращает данные в текст для показа и ничего не меняет в самих данных. Формат, который нужен в нескольких местах, — свой пайп;
- чистый пайп — кэш по аргументам. Он работает правильно, пока данные заменяют, а не меняют на месте;
- директива — компонент без шаблона: она работает с элементом, на котором стоит. Компонент на элементе может быть один, директив — сколько угодно;
- маленькие директивы с одним поведением складываются в большие через `hostDirectives`, без наследования и копирования.

Директивы и пайпы этой главы получали объекты Angular через `inject()`: `LOCALE_ID`, `ElementRef`, `DestroyRef`, даже другую директиву с того же элемента. Как `inject()` находит нужный объект, откуда он берётся и как сделать свой — тема главы 8 «Сервисы и внедрение зависимостей». А перед ней — необязательный шаг «под капотом»: как Angular находит директивы на элементе и чем компонент отличается от директивы внутри.

::: tip Как в настоящем проекте
Браузер умеет откладывать загрузку картинок и сам — атрибутом `loading="lazy"`. А Angular даёт директиву `NgOptimizedImage` (`<img ngSrc="…">`): она ставит `loading="lazy"` по умолчанию, требует указать размеры картинки (или режим `fill`), чтобы страница не прыгала при загрузке, и умеет работать с сервисами картинок. В настоящем проекте для обложек берите её. Наша `LazyImage` — упражнение на директивы, а заодно у неё есть то, чего нет у `loading="lazy"`: плавное проявление.
:::
