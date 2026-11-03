---
title: Проект старше сигналов
startFrom: custom
files: [main.ts, legacy/app.module.ts, legacy/app.component.ts, legacy/app.component.html, legacy/app.component.css, legacy/game-card/game-card.component.ts, legacy/game-card/game-card.component.html, legacy/game-card/game-card.component.css, legacy/services/games.service.ts, legacy/services/cart.service.ts]
focus: legacy/app.module.ts
api: [NgModule, bootstrapModule, 'standalone: false', ChangeDetectionStrategy.Eager, provideZoneChangeDetection, ng update, 'ng generate @angular/core:…']
---

В angular.dev нет ни одного `NgModule` и ни одного `*ngIf` (шаг 1): сайт переписывают под каждую новую версию. Проекты, которые вы откроете на работе, обычно старше. Angular выходит дважды в год, большое приложение живёт годами, и переписывать работающий код никто не торопится. Поэтому в одном проекте часто лежит код трёх-четырёх эпох сразу.

Весь курс мы показывали старые приёмы по одному, во врезках «Вы встретите в старом коде». В этом шаге они собраны вместе: в редакторе — «Ход конём» в том виде, в каком его написали бы на Angular 15. Его можно запустить, сломать и начать переводить на современный Angular, как переводят настоящие проекты: по одному компоненту. Полная таблица «было → стало» с версиями и ссылками на шаги курса — на странице [«Старый Angular»](page:legacy).

## Что поменялось с Angular 14 по 22

Версии и даты — по пакетам `@angular/*` (теги `@developerPreview`, `@deprecated`, `@publicApi` в типах), схемам `ng new` и списку выполненных проектов в [roadmap](https://github.com/angular/angular/blob/fb7711f/adev/src/content/reference/roadmap.md) angular.dev.

| Версия | Что появилось |
|---|---|
| 14 (июнь 2022) | standalone-компоненты (developer preview); `inject()` в полях компонентов и сервисов — раньше только в фабриках |
| 15 (ноябрь 2022) | standalone — стабильный API; в 15.2 интерфейсы классов-гардов устарели |
| 16 (май 2023) | сигналы, `takeUntilDestroyed`, гидратация (developer preview); `DestroyRef`, `@Input({ required: true })` |
| 17 (ноябрь 2023) | `@if`, `@for`, `@defer` (developer preview); сигналы стабильны; `ng new` создаёт standalone-приложение; в 17.1–17.3 — `input()`, `model()`, `viewChild()`, `output()` |
| 18 (май 2024) | управляющие блоки стабильны; экспериментальный зонлесс; `HttpClientModule` устарел |
| 19 (ноябрь 2024) | компоненты standalone по умолчанию; `input()`, `output()`, `model()`, сигнальные запросы стабильны |
| 20 (май 2025) | `*ngIf`, `*ngFor`, `*ngSwitch` устарели; `effect` и `linkedSignal` стабильны; `ng generate` пишет имена без `.component`; в 20.2 — стабильный зонлесс, `@angular/animations` устарел |
| 21 (ноябрь 2025) | `ng new` создаёт зонлесс-приложение с Vitest |
| 22 (июнь 2026) | `OnPush` по умолчанию, `Default` переименован в `Eager`; `@Service()`; Signal Forms, `resource` и `httpResource` стабильны |

Граница проходит по версиям 16–17. Всё, что было до неё, держалось на трёх опорах: модули `NgModule`, zone.js и RxJS для состояния. После неё основа — standalone-компоненты и сигналы.

## Старый «Ход конём»

Начнём с `main.ts`. Приложение запускается не от компонента, а от модуля:

```ts main.ts {7}
import 'zone.js';
import { provideZoneChangeDetection } from '@angular/core';
import { platformBrowser } from '@angular/platform-browser';
import { AppModule } from './legacy/app.module';

platformBrowser()
  .bootstrapModule(AppModule, {
    applicationProviders: [provideZoneChangeDetection()],
  })
```

```ts legacy/app.module.ts {2-3}
@NgModule({
  declarations: [AppComponent, GameCardComponent],
  imports: [BrowserModule, FormsModule],
  providers: [provideHttpClient(withInterceptorsFromDi())],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

**Модуль** (`NgModule`) — класс, который описывает часть приложения. `declarations` — компоненты, которые принадлежат модулю. `imports` — модули, чьё содержимое видят их шаблоны: `BrowserModule` реэкспортирует `CommonModule` с `*ngIf`, `*ngFor` и пайпом `async`, `FormsModule` приносит `ngModel`. `bootstrap` — корневой компонент. У компонента нет своего `imports`: шаблон `AppComponent` видит `<app-game-card>` потому, что карточка объявлена в том же модуле. В большом проекте модулей десятки, и чтобы понять, откуда в шаблоне тег, приходится искать, какой модуль его экспортирует (шаг 5.1).

Дальше — всё, что вы видели во врезках:

- `AppComponent` получает сервисы параметрами конструктора (шаг 8.2), а поля `games` и `loading` — обычные, не сигналы;
- поиск — поток: `Subject` → `debounceTime` → `switchMap` → `subscribe`, отписка — через `destroy$` и `takeUntil` в `ngOnDestroy` (шаг 12.6), операторы импортируются из `rxjs/operators` (шаг 12.2);
- корзина — `BehaviorSubject` в `CartService`, а счётчик в шапке разворачивает пайп `async`;
- поле поиска — `[(ngModel)]` из шаблонных форм (шаг 13.1);
- в шаблонах — `*ngIf` с `<ng-template #list>` и `*ngFor` с `trackBy` (шаги 4.1 и 4.2), `[ngClass]` (шаг 2.3);
- в карточке — `@Input()`, `@Output()` с `EventEmitter` и `@HostBinding` (шаги 5.2, 5.3, 5.7);
- имена — `game-card.component.ts`, `GameCardComponent`, папка `services/` с `*.service.ts` (шаг 5.1).

Почему так больше не пишут, если всё это работает? Обычное поле не сообщает, что изменилось. Поэтому Angular полагался на zone.js: после каждого события, таймера и ответа сервера проверял всё дерево компонентов (шаг 19.4). Состояние, за которым нужно следить, жило в потоках RxJS, а у каждого потока есть подписка, которую нужно не забыть закрыть. Сигнал сам сообщает, какой шаблон устарел. На этом держатся и `OnPush` по умолчанию, и зонлесс: когда приложение на сигналах, проверять всё дерево и подменять API браузера больше незачем.

## Что добавил `ng update`

В редакторе код не совсем такой, каким его написали в Angular 15. Его будто бы провели через `ng update` до 22. Обязательные миграции (схемы, которые переписывают код) `ng update` выполняет сам, при переходе через свою версию. Их правки помечены в коде комментариями «Добавлено при обновлении» (а строка, которая нужна только превью, — «Только в превью»):

| Версия | Миграция | Что поменяла |
|---|---|---|
| 18 | `migration-http-providers` | `HttpClientModule` в `imports` → `provideHttpClient(withInterceptorsFromDi())` в `providers` |
| 19 | `explicit-standalone-flag` | `standalone: false` у компонентов из `declarations` |
| 21 | `control-flow-migration` | `*ngIf`, `*ngFor` → `@if`, `@for` |
| 21 | `bootstrap-options-migration` | `applicationProviders: [provideZoneChangeDetection()]` в `main.ts` |
| 22 | `change-detection-eager` | `changeDetection: ChangeDetectionStrategy.Eager` у каждого компонента без своей стратегии |
| 22 | `http-xhr-backend` | `withXhr()` в `provideHttpClient(…)`: до 22 по умолчанию был `XMLHttpRequest` |

Две миграции мы не применили. Без `control-flow-migration` в шаблонах остались `*ngIf` и `*ngFor`: их и нужно было показать. В проектах, которые остановились на версиях до 21, их много. А `withXhr()` мы не поставили потому, что учебный бэкенд отвечает только на `fetch`. С `XMLHttpRequest` запрос уйдёт мимо него, и вместо JSON придёт страница платформы — `Http failure during parsing`. Так же поведёт себя `HttpClientModule`: в Angular 22 он подключает именно `withXhr()`.

Ещё одна деталь. В проекте Angular 15 первая строка `main.ts` была `platformBrowserDynamic().bootstrapModule(AppModule)` из пакета `@angular/platform-browser-dynamic`. В 22 эта функция `@deprecated`, а `ng new --standalone=false` пишет `platformBrowser()`, как у нас. Строки `import 'zone.js'` в настоящем проекте нет: zone.js подключается в `angular.json` через `"polyfills": ["zone.js"]` (шаг 20.1).

## Опыт 1: без `Eager`

Уберите из `AppComponent` строку `changeDetection: ChangeDetectionStrategy.Eager`. Приложение застынет на «Загружаем…». Введите в поиск «зел» — появятся все шесть игр, а не «Зельевары». Допишите «ь» — теперь «Зельевары». Экран отстаёт на шаг.

Без своей стратегии компонент получает стратегию по умолчанию Angular 22 — `OnPush`. Проверка приложения после ответа сервера по-прежнему происходит: с `Eager` список ведь обновлялся. Но компонент `OnPush` она пропускает, если его никто не пометил (шаг 6.9). Присваивание `this.games = games` его не помечает. А событие в шаблоне помечает: ввод буквы показывает то, что лежит в полях на этот момент, то есть результат прошлого запроса. Ровно поэтому миграция 22 ставит `Eager` всем компонентам: иначе каждый старый проект после обновления сломался бы так же.

То же самое случится, если убрать `provideZoneChangeDetection()` из `main.ts` и вернуть `Eager`. Тогда приложение станет зонлесс (по умолчанию в 22): после ответа сервера проверки не будет совсем, а после ввода буквы экран так же покажет прошлый результат.

Верните строки на место.

## Опыт 2: без zone.js

Закомментируйте `import 'zone.js'`. Экран пустой, в консоли:

```
RuntimeError: NG0908: In this configuration Angular requires Zone.js
```

`provideZoneChangeDetection()` просит обнаружение изменений на зонах, а самой библиотеки нет. Верните импорт.

## Задание: перевести карточку

Старый проект не переписывают за один раз. Компонент за компонентом переводят на новый API, и новое работает рядом со старым. Начнём с `GameCardComponent`.

Сначала уберите из него `standalone: false`. Консоль:

```
Error: Unexpected "GameCardComponent" found in the "declarations" array of the "AppModule" NgModule, "GameCardComponent" is marked as standalone and can't be declared in any NgModule - did you intend to import it instead (by adding it to the "imports" array)?
```

Ошибка подсказывает, что делать дальше. Standalone-компонент модулю не принадлежит, но модуль может его **импортировать**, как другой модуль:

```ts legacy/app.module.ts {2-4}
@NgModule({
  declarations: [AppComponent],
  // Standalone-компонент в модуле не объявляют, а импортируют
  imports: [BrowserModule, FormsModule, GameCardComponent],
```

::: task
Переведите `GameCardComponent` на современный Angular:

1. в `AppModule` перенесите `GameCardComponent` из `declarations` в `imports`;
2. в декораторе уберите `standalone: false` и `changeDetection` (`OnPush` по умолчанию подойдёт: входы станут сигналами), `styleUrls: [...]` замените на `styleUrl`;
3. `@Input() game!: Game` → `input.required<Game>()`, `@Output() add = new EventEmitter<Game>()` → `output<Game>()`;
4. `@HostBinding('class.sold-out')` → поле `host` в `@Component`;
5. в шаблоне — `game()` вместо `game`, `@if` вместо `*ngIf`, `[class.out]` и `[class.ok]` вместо `[ngClass]`.

`AppComponent` не трогайте: в его шаблоне `[game]="game"` и `(add)="addToCart($event)"` остаются такими же.
:::

## Что получилось

Экран тот же, поиск и корзина работают. Но внутри теперь смесь. `AppComponent` — `Eager` на zone.js, с полями и потоками, объявлен в модуле. Карточка — standalone, `OnPush`, с сигнальными входами. Когда поиск приносит новый массив, родитель передаёт карточкам новые объекты, сигнальный вход помечает карточку, и она обновляется.

Такой смеси не нужно бояться. Почти каждый большой проект, который вы откроете, будет в таком промежуточном состоянии.

## Как переводят настоящий проект

1. Обновляют Angular командой `ng update` по одной основной версии (шаг 20.5). Обязательные миграции из таблицы выше выполнятся сами.
2. Переводят на standalone: `ng generate @angular/core:standalone` три раза, с режимами по порядку — «Convert all components, directives and pipes to standalone», «Remove unnecessary NgModule classes», «Bootstrap the application using standalone APIs». Так советует [руководство миграции](https://angular.dev/reference/migrations/standalone); после каждого запуска проект должен собираться и работать.
3. Запускают остальные миграции из `@angular/core`: `control-flow` (если ещё не выполнена), `signal-input-migration`, `output-migration`, `signal-queries-migration` (все три сразу — `signals`), `inject`, `ngclass-to-class`. Полный список — [angular.dev/reference/migrations](https://angular.dev/reference/migrations).
4. Отказываются от zone.js. Отдельной миграции для этого нет. По [руководству](https://angular.dev/guide/zoneless): компоненты должны обновляться без зоны (сигналы, `async`, `markForCheck`), подписки на `NgZone.onStable` и `onMicrotaskEmpty` убирают, `zone.js` — из `polyfills` в `angular.json`, а из `main.ts` — `provideZoneChangeDetection()`: в Angular 22 без него приложение и так зонлесс.
5. По мере того как состояние компонентов переезжает в сигналы, удаляют `changeDetection: ChangeDetectionStrategy.Eager`, который добавил `ng update`.

## Как в настоящем проекте

Кнопка «Скачать» на этом шаге работает как обычно: в README архива к `npm install` добавится `zone.js` — в проекте `ng new` 22 его нет. Строка `import 'zone.js'` в `main.ts` его подключит. В старом проекте он остался бы в `polyfills` файла `angular.json`.

## Проверьте себя

::: task
1. В шаблоне компонента из `declarations` есть `<app-rating>`, а в `imports` этого компонента ничего нет. Где искать, откуда взялся `Rating`?
2. Проект обновили с 21 на 22, и ни один шаблон не сломался, хотя `OnPush` стал стратегией по умолчанию. Почему?
3. Можно ли в `imports` модуля положить standalone-компонент? А объявить его в `declarations`?
:::

::: hint Ответы
1. У компонента из модуля нет своих `imports`: шаблон видит то, что объявлено в его модуле, что экспортируют модули из `imports` этого модуля, и standalone-компоненты из тех же `imports`. Искать нужно модуль, который объявляет компонент, и всё, что он импортирует.
2. Миграция `change-detection-eager` при `ng update` до 22 поставила `ChangeDetectionStrategy.Eager` каждому компоненту без своей стратегии — прежнее поведение сохранилось.
3. Импортировать — можно, так standalone-компонент попадает в старый модуль. Объявить — нельзя: «is marked as standalone and can't be declared in any NgModule».
:::
