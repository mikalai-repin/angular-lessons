---
title: Старый Angular
description: Что вы встретите в проектах, начатых до Angular 17, чем это заменено и как перевести код.
---

Курс написан на Angular 22, а проекты, которые вы откроете на работе, часто начаты на 12–16-й версии. На этой странице собрано всё старое, что встречается в курсе во врезках «Вы встретите в старом коде»: что это, чем его заменили, с какой версии и какой миграцией перевести. Шаг курса в последнем столбце — там врезка с примером. Как выглядит и как переводится старое приложение целиком — в шаге [«Проект старше сигналов»](step:21-reading-code/07-legacy-code).

**Работает ли старый код в Angular 22?** Почти всё в таблицах ниже работает. Устаревший (`@deprecated`) API пока на месте, но его собираются убрать. Исключения отмечены в столбце «Когда» словом «удалён».

Версии взяты из пакетов `@angular/*`: теги `@developerPreview`, `@deprecated` и `@publicApi` в типах, `migrations.json` и схемы `ng new`. Миграция — команда `ng generate @angular/core:<имя>`, если не сказано иначе. Пометка «сам» означает, что `ng update` выполняет эту миграцию при обновлении до указанной версии без вашей просьбы.

## Приложение и компоненты

| Было | Сейчас | Когда | Миграция | Шаг |
|---|---|---|---|---|
| `@NgModule` с `declarations`, `imports`, `bootstrap` | standalone-компоненты, `imports` в `@Component` | standalone: 14 — developer preview, 15 — стабильные, 19 — по умолчанию | `standalone` | [1.2](step:01-first-app/02-first-component), [5.1](step:05-components/01-component) |
| `platformBrowserDynamic().bootstrapModule(AppModule)` | `bootstrapApplication(App, appConfig)` | `bootstrapApplication`: 14 — developer preview, 15 — стабильный; `platformBrowserDynamic` в 22 `@deprecated` | `standalone` (режим «Bootstrap the application using standalone APIs») | [21.7](step:21-reading-code/07-legacy-code) |
| `standalone: true` в `@Component` | ничего: это значение по умолчанию | 19 | 19 — сам (`explicit-standalone-flag`) | [1.2](step:01-first-app/02-first-component) |
| `standalone: false` | компонент объявлен в модуле — признак старого проекта | 19 — `ng update` дописывает его всем компонентам из `declarations` | `standalone` | [21.7](step:21-reading-code/07-legacy-code) |
| `game-card.component.ts`, класс `GameCardComponent` | `game-card.ts`, `GameCard` | `ng generate` без суффикса — 20 | — | [5.1](step:05-components/01-component) |

## Шаблоны

| Было | Сейчас | Когда | Миграция | Шаг |
|---|---|---|---|---|
| `*ngIf`, `else` с `<ng-template>` | `@if`, `@else if`, `@else` | блоки: 17 — developer preview, 18 — стабильные; `NgIf` устарела в 20 | `control-flow`, в 21 — сам | [4.1](step:04-control-flow/01-if) |
| `*ngFor` с `trackBy` | `@for (…; track …)`, `@empty` | `NgForOf` устарела в 20 | `control-flow`, в 21 — сам | [4.2](step:04-control-flow/02-for) |
| `[ngSwitch]`, `*ngSwitchCase` | `@switch`, `@case` | устарели в 20 | `control-flow`, в 21 — сам | [4.5](step:04-control-flow/05-switch) |
| `[ngClass]`, `[ngStyle]` | `[class.x]`, `[class]`, `[style.x]` | не устарели; руководство по стилю советует привязки | `ngclass-to-class`, `ngstyle-to-style` | [2.3](step:02-templates/03-attr-class-style) |
| «в шаблоне нельзя `typeof` и шаблонные строки» | можно | — | — | [2.1](step:02-templates/01-interpolation) |
| `::ng-deep` | входы, переменные CSS, глобальные стили | не рекомендуется для нового кода | — | [5.8](step:05-components/08-styles) |

## Входы, выходы, запросы, хост

| Было | Сейчас | Когда | Миграция | Шаг |
|---|---|---|---|---|
| `@Input() game!: Game` | `input()`, `input.required()` | `input()`: 17.1 — developer preview, 19 — стабильный; `@Input({ required })` — 16 | `signal-input-migration` | [5.2](step:05-components/02-inputs) |
| `@Output() add = new EventEmitter()` | `output()` | 17.3 — developer preview, 19 — стабильный | `output-migration` | [5.3](step:05-components/03-outputs) |
| пара `@Input() value` + `@Output() valueChange` | `model()` | 17.2 — developer preview, 19 — стабильный | — | [5.4](step:05-components/04-model) |
| сеттер с `coerceBooleanProperty` | `input(…, { transform: booleanAttribute })` | `transform` у `@Input` — 16.1 | — | [5.5](step:05-components/05-input-transforms) |
| `@HostBinding`, `@HostListener` | поле `host` в `@Component` / `@Directive` | не устарели; руководство по стилю советует `host` | — | [5.7](step:05-components/07-host), [7.5](step:07-directives-pipes/05-directive) |
| `@ViewChild`, `@ViewChildren`, `QueryList` | `viewChild()`, `viewChildren()` | 17.2 — developer preview, 19 — стабильные | `signal-queries-migration` | [6.2](step:06-lifecycle/02-view-child) |
| `@ContentChildren` и `changes.subscribe` | `contentChildren()` | 17.2 — developer preview, 19 — стабильные | `signal-queries-migration` | [6.5](step:06-lifecycle/05-content-children) |

Три миграции сигнального API сразу — `ng generate @angular/core:signals`.

## Внедрение зависимостей

| Было | Сейчас | Когда | Миграция | Шаг |
|---|---|---|---|---|
| `constructor(private http: HttpClient)` | `private readonly http = inject(HttpClient)` | `inject()` в полях — с 14 (раньше только в фабриках) | `inject` | [6.1](step:06-lifecycle/01-lifecycle), [8.2](step:08-services-di/02-first-service) |
| `@Inject(TOKEN)` в конструкторе, строка-ключ `{ provide: 'apiUrl' }` | `inject(TOKEN)`, `InjectionToken` | — | `inject` | [8.5](step:08-services-di/05-tokens) |
| `providedIn: 'any'`, `providedIn: SomeModule` | `'root'`, `@Service()`, `providers` компонента или маршрута | устарели | — | — |
| `@Injectable({ providedIn: 'root' })` | `@Service()` | `@Service()` — 22; `@Injectable` не устарел | `service` | [8.2](step:08-services-di/02-first-service) (основной текст) |
| `APP_INITIALIZER` | `provideAppInitializer()` | устарел в 19 | `provide-initializer` — по желанию при `ng update` до 19 | [14.3](step:14-auth/03-session) |

## Реактивность и обнаружение изменений

| Было | Сейчас | Когда | Миграция | Шаг |
|---|---|---|---|---|
| zone.js, `"polyfills": ["zone.js"]` | зонлесс, сигналы | 18 — экспериментальный, 20.2 — стабильный, 21 — в `ng new` по умолчанию | нет; [руководство](https://angular.dev/guide/zoneless). В 21 `ng update` сам дописывает `provideZoneChangeDetection()` | [3.1](step:03-signals/01-problem), [19.4](step:19-internals/04-zone) |
| `NgZone.run`, `runOutsideAngular`, `onStable` | не нужны: в зонлесс `NgZone` — пустышка | — | — | [19.4](step:19-internals/04-zone) |
| `ChangeDetectionStrategy.Default` | `OnPush` по умолчанию, `Eager` — где нужно | 22: `Default` → `Eager` (`@deprecated`), `OnPush` по умолчанию | 22 — сам: `Eager` всем компонентам без стратегии (`change-detection-eager`) | [6.9](step:06-lifecycle/09-change-detection), [21.7](step:21-reading-code/07-legacy-code) |
| `markForCheck()`, `detectChanges()` для «починки» | сигналы | — | — | [6.9](step:06-lifecycle/09-change-detection) |
| поле класса + `subscribe` | `signal`, `computed`, `toSignal` | сигналы: 16 — developer preview, 17 — стабильные | — | [3.1](step:03-signals/01-problem) |
| состояние в `BehaviorSubject` и `async` в шаблоне | сервис на сигналах | — | — | [21.7](step:21-reading-code/07-legacy-code) |
| `ngOnDestroy` для уборки | `DestroyRef` | 16 | — | [6.4](step:06-lifecycle/04-destroy-ref) |
| `destroy$` + `takeUntil` | `takeUntilDestroyed()` | 16 — developer preview, 19 — стабильный | — | [12.6](step:12-rxjs/06-cleanup) |
| `import { map } from 'rxjs/operators'` | `import { map } from 'rxjs'` | RxJS 7.2 | — | [12.2](step:12-rxjs/02-operators) |

## Роутинг

| Было | Сейчас | Когда | Миграция | Шаг |
|---|---|---|---|---|
| `RouterModule.forRoot(routes)`, `AppRoutingModule` | `provideRouter(routes, with…())` | `provideRouter`: 14.2 — developer preview, 15 — стабильный | `standalone` | [10.1](step:10-routing/01-routes) |
| `ActivatedRoute.paramMap.subscribe` | входы маршрута, `withComponentInputBinding()` | 16 | — | [10.3](step:10-routing/03-params) |
| `loadChildren` с модулем, `RouterModule.forChild` | `loadChildren` с маршрутами, `loadComponent` | — | `route-lazy-loading` (обычные маршруты → `loadComponent`) | [10.6](step:10-routing/06-lazy-loading) |
| классы-гарды `implements CanActivate` | функции `CanActivateFn` | интерфейсы классов устарели в 15.2 | в 16 `ng update` сам убирает `implements` | [10.7](step:10-routing/07-guards) |
| `canLoad` | `canMatch` | устарел | — | [10.7](step:10-routing/07-guards) |
| провайдеры ленивого модуля | `providers` маршрута | — | — | [17.5](step:17-admin/05-section-service) |

## HTTP

| Было | Сейчас | Когда | Миграция | Шаг |
|---|---|---|---|---|
| `HttpClientModule` в `imports` | `provideHttpClient()` | `provideHttpClient`: 15; модуль `@deprecated` с 18 | 18 — сам: `provideHttpClient(withInterceptorsFromDi())` | [11.2](step:11-http/02-http-client) |
| `XMLHttpRequest` по умолчанию, `withFetch()` | `fetch` по умолчанию | 22: `withFetch()` `@deprecated` | 22 — сам: `withXhr()` в каждый `provideHttpClient()` без `withFetch()` | [11.2](step:11-http/02-http-client) |
| интерцептор-класс, `HTTP_INTERCEPTORS` | функция `HttpInterceptorFn`, `withInterceptors()` | `withInterceptors`: 15 | — | [12.7](step:12-rxjs/07-interceptors) |

## Формы

| Было | Сейчас | Когда | Миграция | Шаг |
|---|---|---|---|---|
| `[(ngModel)]` и `FormsModule` | Signal Forms (`form`, `[formField]`) | Signal Forms стабильны в 22; `ngModel` не устарел | — | [13.1](step:13-forms/01-form-model) |
| `FormBuilder`, `this.fb.group(…)` в `ngOnInit` | Signal Forms; реактивные формы остаются | не устарели | — | [13.11](step:13-forms/11-reactive-forms) |

## Анимации, тесты, сборка

| Было | Сейчас | Когда | Миграция | Шаг |
|---|---|---|---|---|
| `@angular/animations`, `trigger()`, `provideAnimations()` | `animate.enter`, `animate.leave`, CSS | устарел в 20.2, удалить собираются в 23 | — | [15.1](step:15-performance/01-enter-leave) |
| Karma и Jasmine, `jasmine.createSpy` | Vitest, `vi.fn()` | Vitest в `ng new` по умолчанию — 21 | — | [16.1](step:16-testing/01-why-tests), [16.5](step:16-testing/05-test-doubles) |
| `RouterTestingModule` | `provideRouter` | `@deprecated` | `router-testing-module-migration` | [16.7](step:16-testing/07-route-tests) |
| `fakeAsync`, `tick`, `fixture.detectChanges()` после каждого действия | `whenStable()`, `vi.useFakeTimers()` | `fakeAsync` и `tick` работают только с zone.js; в зонлесс фикстура обновляет экран сама | — | [16.9](step:16-testing/09-tests-inside) |
| `@angular-devkit/build-angular:browser` (webpack) | `@angular/build:application` (esbuild) | новый сборщик — по умолчанию в 17 | по желанию при `ng update` до 18: `use-application-builder` | [20.1](step:20-real-project/01-angular-cli) |
| `fullTemplateTypeCheck`, `$any(…)` | `strictTemplates` | `fullTemplateTypeCheck` удалён | 22 — сам: `strictTemplates: false`, где опции нет | [20.4](step:20-real-project/04-strict-templates) |
| Angular Universal, `@nguniversal/*` | `@angular/ssr` | последний Universal — 16.2 | — | [20.7](step:20-real-project/07-ssr) |
| SSR без гидратации | `provideClientHydration()` | 16 — developer preview, 17 — стабильная | — | [20.8](step:20-real-project/08-hydration) |

## NgRx

| Было | Сейчас | Шаг |
|---|---|---|
| `StoreModule.forRoot`, `forFeature` | `provideStore`, `provideState` | [18.7](step:18-ngrx/07-classic-store) |
| `store.select(…)` и `async` | `store.selectSignal(…)` | [18.7](step:18-ngrx/07-classic-store) |
| `createAction` по одному, классы действий | `createActionGroup` | [18.7](step:18-ngrx/07-classic-store) |
| эффекты-классы, `@Effect()`, `EffectsModule` | функциональные эффекты, `provideEffects` | [18.8](step:18-ngrx/08-effects) |

## Что `ng update` делает сам

При обновлении через основную версию `ng update` выполняет обязательные миграции этой версии. Из того, что касается старого кода:

| Версия | Миграция | Что меняет |
|---|---|---|
| 16 | `migration-v16-guard-and-resolve-interfaces` | убирает `implements CanActivate` и другие интерфейсы гардов и резолверов |
| 18 | `migration-http-providers` | `HttpClientModule` → `provideHttpClient(withInterceptorsFromDi())` |
| 19 | `explicit-standalone-flag` | `standalone: false` у компонентов, директив и пайпов из модулей, убирает `standalone: true` |
| 21 | `control-flow-migration` | `*ngIf`, `*ngFor`, `*ngSwitch` → `@if`, `@for`, `@switch` |
| 21 | `bootstrap-options-migration` | `provideZoneChangeDetection()` в запуск приложения, где не было своей настройки |
| 22 | `change-detection-eager` | `ChangeDetectionStrategy.Eager` у компонентов без стратегии, `Default` → `Eager` |
| 22 | `http-xhr-backend` | `withXhr()` в `provideHttpClient()` без `withFetch()` |
| 22 | `strict-templates-default` | `strictTemplates: false` в `tsconfig.json`, если опции не было |

Порядок перевода старого проекта на современный Angular — в шаге [21.7](step:21-reading-code/07-legacy-code), список всех миграций — [angular.dev/reference/migrations](https://angular.dev/reference/migrations).
