# Программа курса

> **Состояние:** курс написан, главы 1–22. Фактические шаги написанных глав (папка шага, что он вводит, с чего начинается) — в [archive/steps.md](archive/steps.md). Этот файл их не повторяет; ищите там по слову: `grep -n 'linkedSignal' docs/archive/steps.md`.

Курс состоит из **трёх частей**:

1. **Основы** (главы 1–8). Компоненты, шаблоны, сигналы, DI. На выходе — витрина магазина на одной странице: карточки, корзина в шапке.
2. **Приложение** (главы 9–18). Состояние, роутинг, HTTP, RxJS, формы, авторизация, анимации, `@defer`, тесты, админка, NgRx. На выходе — полноценный «Ход конём».
3. **Глубже** (главы 19–22). Как Angular устроен внутри, настоящий проект на Angular CLI (AOT, SSR, деплой), разбор кода angular.dev, финальный проект.

Каждая глава — 5–10 **шагов**. Шаг — одна идея и одно небольшое изменение кода с видимым результатом. В конце главы — **практикум**: самостоятельное задание, решение показывается только по кнопке. У каждой главы есть квиз (`quiz.yaml`, 13–15 вопросов).

Врезки **«Под капотом»** — необязательные блоки о внутреннем устройстве. Врезки **«Вы встретите в старом коде»** — как то же самое писали до Angular 17–20 (`*ngIf`, `@Input()`, NgModule, zone.js). Ученику придётся читать старый код, но писать его он не должен.

## Написанные главы

| Глава | Шагов | О чём |
|---|---|---|
| 01-first-app | 7 | Что такое Angular, AOT/JIT; первый компонент, `bootstrapApplication`, `templateUrl`, `ApplicationConfig`, чтение ошибок, вывод компилятора |
| 02-templates | 9 | Интерполяция, привязки свойств, атрибутов, классов и стилей, события, `#ref`, `@let`, санитизация; функция шаблона изнутри |
| 03-signals | 9 | Почему поле не обновляет экран (зонлесс, OnPush); `signal`, `computed`, неизменяемость, `effect`, `untracked`, `linkedSignal`; граф сигналов |
| 04-control-flow | 8 | `@if`, `@for` + `track` и переменные, `@empty`, `@switch`, `ng-template`/`ng-container`; как `track` двигает DOM |
| 05-components | 10 | Компоненты, `input`, `output`, `model`, преобразования входов, проекция, `host`, стили и инкапсуляция |
| 06-lifecycle | 9 | Жизнь компонента, `viewChild`, `afterNextRender`, `DestroyRef`, `contentChildren`, `afterRenderEffect`, хуки; обнаружение изменений |
| 07-directives-pipes | 8 | Встроенные пайпы и локаль, свои пайпы, чистые и нечистые, директивы, `hostDirectives`; определения `ɵdir`/`ɵcmp`/`ɵpipe` |
| 08-services-di | 9 | Зачем DI, `@Service()`, контекст внедрения, провайдеры, `InjectionToken`, иерархия инжекторов, `injectAsync`; DI изнутри |
| 09-app-state | 6 | Хранилище на сигналах, `localStorage`, производное состояние, промокод на `linkedSignal`; обзор библиотек состояния |
| 10-routing | 11 | Маршруты, ссылки, параметры и query-параметры как входы, дочерние и ленивые маршруты, гарды, заголовки, 404, крошки; навигация изнутри |
| 11-http | 10 | Учебный бэкенд, `HttpClient`, `httpResource`, параметры, ошибки и резолверы, `resource`, `debounced`, оптимистичные изменения; ресурс изнутри |
| 12-rxjs | 10 | Observable, операторы, `switchMap`, `toSignal`/`toObservable`, `rxResource`, отписка, интерцепторы, кэш |
| 13-forms | 12 | Signal Forms: модель и поле, правила, асинхронная проверка, массивы, своё поле, отправка; реактивные формы для чтения |
| 14-auth | 10 | `AuthStore`, сессия через `provideAppInitializer`, интерцептор токена, 401, гард с `returnUrl`, роли, refresh-токен, XSS/CSRF/XSRF |
| 15-performance | 9 | `animate.enter`/`animate.leave`, `@defer` и триггеры, `NgOptimizedImage`, большие списки; `@defer` в JIT и AOT |
| 16-testing | 9 | Тесты в превью (`preview: tests`): функции, пайпы, `TestBed`, компоненты, `HttpTestingController`, `RouterTestingHarness`; превью против `ng test` |
| 17-admin | 8 | Админка: вложенные маршруты, таблица с состоянием в адресе, форма от ресурса, провайдеры маршрута, `createComponent`, загрузка файла |
| 18-ngrx | 10 | Signal Store (сущности, свои расширения, `rxMethod`, события) и классический Store (действия, `createFeature`, эффекты) |
| 19-internals | 7 | Ivy и `LView`, обнаружение изменений изнутри, планировщик, zone.js, примитивы сигналов, AOT против JIT |
| 20-real-project | 10 | Перенос в проект Angular CLI: `ng new`, «Скачать», строгие шаблоны, сборка и бюджеты, линтер, `ng test`, SSR и пререндер, гидратация, деплой |
| 21-reading-code | 7 | Разбор angular.dev (коммит `fb7711f`): карта, маршруты из данных, состояние, пререндер, встроенный редактор, ревью; практикум `SafeStorage` |
| 22-final-project | 4 | Финальный проект на выбор: А — сравнение игр и список желаний по ссылке, Б — подарочный набор (мастер на Signal Forms), у обоих `check.ts` и образец; В — своё приложение в проекте CLI с чек-листом |

---

## Карта покрытия API

| Область | API | Главы |
|---|---|---|
| Приложение | `bootstrapApplication`, `ApplicationConfig`, `provide*`, `ErrorHandler`, `provideAppInitializer` | 1, 8, 14 |
| Шаблоны | интерполяция, привязки, события, `#ref`, `@let`, `@if`, `@for`, `@switch`, `@defer`, `ng-content`, `ng-template`, `ng-container` | 2, 4, 5, 15 |
| Компоненты | `@Component`, `input`, `output`, `model`, `host`, стили и инкапсуляция | 5 |
| Сигналы | `signal`, `computed`, `effect`, `untracked`, `linkedSignal`, `resource`, `httpResource`, `rxResource`, `debounced` | 3, 9, 11, 12 |
| DOM и жизненный цикл | `viewChild`, `contentChild(ren)`, `afterNextRender`, `afterRenderEffect`, `DestroyRef`, хуки | 6 |
| Директивы и пайпы | `@Directive`, `hostDirectives`, `@Pipe`, встроенные пайпы, локали | 7 |
| DI | `inject`, `@Service`, `@Injectable`, провайдеры, `InjectionToken`, иерархия, `injectAsync` | 8 |
| Роутер | `provideRouter`, `routerLink`, параметры, `loadComponent`, гарды, резолверы, `withViewTransitions`, провайдеры маршрута, `withAutoCleanupInjectors` | 10, 14, 17 |
| HTTP | `provideHttpClient`, `HttpClient`, `httpResource`, интерцепторы, `withXsrfConfiguration` | 11, 12, 14 |
| RxJS | `Observable`, операторы, `toSignal`, `toObservable`, `takeUntilDestroyed` | 12 |
| Формы | Signal Forms (`form`, `FormField`, валидаторы, `submit`, `schema`); реактивные формы обзорно | 13 |
| Авторизация | `AuthStore`, токен, сессия (`/api/me`), интерцептор `Authorization` и 401, гард входа, `returnUrl`, роли; refresh-токен, cookie, XSRF — обзорно | 14, 17 |
| Анимации и производительность | `animate.enter/leave`, `@defer`, `NgOptimizedImage` | 15 |
| Тесты | `TestBed`, `ComponentFixture`, `HttpTestingController`, `RouterTestingHarness` | 16 |
| NgRx | Signal Store (`signalStore`, `withState`, `withComputed`, `withMethods`, `withHooks`, `withProps`, `withLinkedState`, `withEntities`, `rxMethod`, `signalMethod`, `signalStoreFeature`, события), классический Store (`createActionGroup`, `createFeature`, `createReducer`, `createSelector`, `selectSignal`, `createEffect`, мета-редьюсеры), DevTools — обзорно | 18 |
| Внутреннее устройство | Ivy, `LView`, планировщик, zone.js, примитивы сигналов, инжекторы | 19 |
| Инструменты | CLI, `ng build`, `strictTemplates`, SSR, гидратация, DevTools | 20 |

Не входит в курс (упоминаем ссылкой): Angular Material и CDK (кроме обзора виртуальной прокрутки в 15.7 и `Dialog` в 17.7), i18n (`@angular/localize`), Service Worker / PWA, Angular Elements, микрофронтенды, `upgrade` с AngularJS.

## Объём

22 главы, примерно 160–175 шагов. Ориентир для ученика — 40–50 часов.
