---
title: Пререндер и @defer
noSolution: true
focus: game/game-page.html
api: [outputMode static, PendingTasks, ApplicationRef.attachView, кэш передачи HTTP, '@defer (when …)', 'prefetch on idle', firebase.json]
---

angular.dev — статический сайт: HTML каждой страницы строится при сборке, а хостинг только раздаёт файлы. Это `outputMode: "static"` из практикума 20.10, только страниц не 42, а 1 626. Откройте [angular.dev/guide/signals](https://angular.dev/guide/signals) и посмотрите исходный код страницы (Ctrl+U или ⌘+⌥+U): весь текст статьи уже в HTML, до всякого JavaScript.

В этом шаге — как сборка строит столько страниц, как приложение дожидается асинхронной статьи, что приезжает в браузер и какие части страницы сайт сознательно не рендерит на сервере.

## Как сборка находит 1 626 страниц

В практикуме 20.10 сборка споткнулась о `games/:id`: маршрут с параметром не говорит, какие адреса бывают, и понадобился `getPrerenderParams`. У angular.dev маршрутов с параметрами нет. Каждая статья, каждая страница справочника API — отдельный маршрут с готовым путём, построенный из данных (шаг 2). Карта маршрутов **сама** и есть список страниц, и одного правила `{path: '**', renderMode: RenderMode.Prerender}` хватает.

Переадресации из `REDIRECT_ROUTES` пререндер превращает в страницы с `<meta http-equiv="refresh">` (шаг 2). А `'**'` пререндерить нечего: у него нет конкретного адреса. Что тогда отдаёт хостинг — в конце шага.

## Статья при сборке

Статьи пишут в Markdown, а приложение получает готовый HTML. Превращение — до сборки Angular: скрипт [`shared-docs/pipeline/guides/index.mts`](https://github.com/angular/angular/blob/fb7711f/adev/shared-docs/pipeline/guides/index.mts) прогоняет каждый `.md` через `marked` и подсветку `shiki` и пишет рядом `.md.html`. Заодно он проверяет: файл с BOM в начале или ссылка на якорь, которого нет в статье, — сборка падает с ошибкой. Это тот же приём, что `npm run validate` у этого курса: ошибку в тексте ловит сборка, а не читатель.

Дальше пререндер запускает приложение в Node.js для каждого адреса. Резолвер просит статью, `ContentLoader` делает `HttpClient.get('assets/content/guide/signals/overview.md.html')`. Сервера нет — кто ответит? Сборщик CLI: на время пререндера он подменяет `fetch`, и запросы к файлам сборки отдаются прямо из памяти (в `@angular/build` это `patchFetchToLoadInMemoryAssets`). Поэтому `maxResponseBodySize` поднят до 4 МБ (шаг 1): через `HttpClient` на сервере проходят целые статьи.

## `PendingTasks`: дождаться статьи

Статью на страницу вставляет [`DocViewer`](https://github.com/angular/angular/blob/fb7711f/adev/shared-docs/components/viewers/docs-viewer/docs-viewer.component.ts#L87-L93):

```ts adev/shared-docs/components/viewers/docs-viewer/docs-viewer.component.ts
constructor() {
  effect(async () => {
    const removeTask = this.pendingTasks.add();
    await this.renderContentsAndRunClientSetup(this.docContent());
    removeTask();
  });
}
```

Эффект читает вход `docContent` и асинхронно вставляет HTML: кладёт его в `innerHTML` хоста и создаёт внутри компоненты — оглавление, хлебные крошки, иконки, а в браузере ещё примеры кода и кнопки «Копировать».

Зачем `pendingTasks.add()`? Сервер сериализует страницу в HTML, когда приложение **стабильно** — нет ожидающих задач (шаг 11.10: так `resource` держит сервер, пока идёт запрос). Эффект с `await` для Angular — обычная функция, которая вернула промис: о том, что работа ещё идёт, он не знает. Без задачи сервер мог бы сохранить страницу до того, как статья вставлена, — с пустым `<main>`. `PendingTasks` (`@publicApi 20.0`) говорит прямо: «подожди, я ещё не закончил». Это первый в курсе случай, когда задачу добавляют руками: до сих пор это делали за нас ресурсы и `HttpClient`.

Компоненты внутри статьи создаёт [`renderComponent`](https://github.com/angular/angular/blob/fb7711f/adev/shared-docs/components/viewers/docs-viewer/docs-viewer.component.ts#L321-L351) — так же, как наш `Confirmation` создаёт окно в шаге 17.7: `createComponent` с `hostElement` (готовый элемент из статьи) и `appRef.attachView`. Комментарий объясняет, зачем `attachView`: для обнаружения изменений и чтобы сериализация при пререндере увидела компонент.

## Что приезжает в браузер

Мы скачали HTML статьи о сигналах с живого сайта: 264 938 байт, из них 85 895 — содержимое `<script id="ng-state">`. Внутри — одна запись кэша передачи HTTP (шаг 20.8):

```json
{
  "u": "assets/content/guide/signals/overview.md.html",
  "s": 200,
  "b": "\n  <div class=\"docs-decorative-header-container\">…"
}
```

`u` — адрес, `s` — статус, `b` — тело ответа: вся статья ещё раз, строкой. Мы открыли страницу в Chrome и посмотрели запросы: при первой загрузке запроса к `assets/content/` нет — `HttpClient` взял ответ из `ng-state`. Переход по меню к статье о `linkedSignal` — уже обычный запрос `GET /assets/content/guide/signals/linked-signal.md.html`: дальше сайт работает как приложение.

Что происходит со статьёй, которую прислал сервер? Мы проверили наблюдателем за DOM, поставленным до скриптов страницы: элемент `<main class="docs-viewer">` после гидратации тот же, а все 153 узла внутри него заменены новыми. В браузере эффект `DocViewer` выполняется снова и вставляет ту же статью из `ng-state` заново, вместе с компонентами. Содержимое `innerHTML` Angular не создавал своими инструкциями и «принять» при гидратации не может — гидратируется каркас вокруг статьи.

Цена простоты: статья едет в странице дважды (в разметке и в `ng-state`) и вставляется дважды. Зато код один для сервера и браузера, а первый показ — мгновенный и с текстом, который видят поисковики.

## `@defer`: что не рендерить на сервере

В шаблоне [`app.component.html`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/app.component.html) три блока `@defer`:

```html adev/src/app/app.component.html
@defer (when isBrowser) {
  <adev-progress-bar />
  <docs-top-level-banner … />
}
…
<!--
  Avoid rendering cookies popup on the server,
  since there is no benefit of doing this and
  it requires additional state management.
-->
@defer (when isBrowser) {
  <docs-cookie-popup />

  @defer (when displaySearchDialog(); prefetch on idle) {
    @if (displaySearchDialog()) {
      <docs-search-dialog (onClose)="displaySearchDialog.set(false)" />
    }
  }
}
<router-outlet />
```

Полоса загрузки, баннер, окно о cookie — на сервере смысла не имеют: окно зависит от согласия в `localStorage`, которого на сервере нет. В HTML с живого сайта ни `<adev-progress-bar>`, ни `<docs-cookie-popup>` нет.

Строго говоря, условие `isBrowser` здесь скорее документирует намерение. При серверном рендеринге и пререндере блоки `@defer` всегда показывают `@placeholder` (или ничего), а триггеры не запускаются — так сказано в документации `@defer` и видно в коде (`shouldTriggerDeferBlock` возвращает `false`, если `ngServerMode`). В браузере `isBrowser` истинно с первой же проверки — блок загрузится сразу. Попутно его код уходит в отдельный чанк.

Вложенный блок — поиск. **`when displaySearchDialog()`** — загрузить и создать, когда диалог впервые открыли; **`prefetch on idle`** — скачать код заранее, когда браузер свободен (шаг 15.5). А `@if` внутри — потому что, как мы видели в шаге 15.4, сработавший `@defer` к заглушке не возвращается: закрыть диалог может только `@if`.

На главной [`home.component.html`](https://github.com/angular/angular/blob/fb7711f/adev/src/app/features/home/home.component.html#L51-L82) — ещё четыре блока: демо во вкладках «Signals», «Control Flow», «Deferrable Views», «Hydration». Каждое — `@defer (on idle)` вокруг `<ng-template ngTabContent>`. Вкладки — из нового пакета **`@angular/aria`** (`ngTabs`, `ngTab`, `ngTabPanel`): по коду пакета шаблон `ngTabContent` создаётся, когда его панель стала видимой, а с `[preserveContent]="true"` остаётся и после переключения на другую вкладку. Два уровня лени: `@defer` откладывает **код** демо до простоя браузера, вкладка — **создание** до первого показа.

У нас то же сочетание на странице игры (открыта в редакторе): `@defer (on viewport; prefetch on idle)` вокруг отзывов внутри нашей вкладки «Отзывы» (шаг 15.5). Разница в порядке: у нас `@defer` внутри вкладки, у angular.dev — снаружи шаблона вкладки.

## Хостинг

Сайт лежит на Firebase Hosting, правила — в [`firebase.json`](https://github.com/angular/angular/blob/fb7711f/adev/firebase.json). Мы сверили их с заголовками ответов живого сайта:

- файлы с хешем в имени (`main-ID7VRVI6.js`, `chunk-…js`) — `Cache-Control: public,max-age=31536000,immutable`: год в кэше, имя меняется вместе с содержимым (шаг 20.3);
- страницы — `max-age=3600`: час;
- на всех страницах — `Cross-Origin-Opener-Policy` и `Cross-Origin-Embedder-Policy`, как в `ng serve` из шага 1: их требует встроенный редактор (шаг 5);
- и одно правило переписывания: `"source": "**", "destination": "/index.html"`.

Последнее правило — ответ на вопрос про `'**'`. Мы запросили [angular.dev/guide/no-such-page](https://angular.dev/guide/no-such-page) без браузера: статус **200** и HTML главной страницы (`<title>Home • Angular</title>`). В браузере приложение запускается, роутер не находит маршрут и показывает `NotFound` с результатами поиска. Человек видит «Page Not Found», а поисковый робот — ответ 200: адреса нет, а сервер говорит, что всё в порядке. Такое называют «мягкой 404». В практикуме 20.10 мы решили, что такое правило должно отдавать `index.csr.html` — оболочку без пререндеренной страницы. angular.dev отдаёт пререндеренную главную, и браузер начинает с чужой разметки.

## Проверьте себя

::: task
1. Почему `angular.dev` не нужен `getPrerenderParams`, а нашему магазину в 20.10 был нужен?
2. Уберите мысленно `pendingTasks.add()` из `DocViewer`. Что может оказаться в пререндеренном HTML статьи?
3. Вы открыли статью по прямой ссылке, а потом перешли по меню на другую. Сколько запросов к `assets/content/` сделает браузер?
4. Зачем внутри `@defer (when displaySearchDialog())` ещё `@if (displaySearchDialog())`?
:::

::: hint Ответы
1. У сайта все маршруты с готовыми путями: их построили из данных навигации и справочника. Список страниц — сама карта маршрутов. У нас был `games/:id`, и сборка не знала, какие `id` бывают.
2. Пустой `<main>`: эффект вставляет статью после `await`, а сервер, не видя ожидающих задач, мог бы сериализовать страницу раньше.
3. Один — для второй статьи. Первую `HttpClient` взял из кэша передачи в `ng-state`.
4. `@defer` срабатывает один раз и к заглушке не возвращается. Создать диалог при первом открытии — его работа, а убирать и показывать — работа `@if`.
:::
