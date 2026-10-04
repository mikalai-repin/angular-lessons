# Современный Angular: что верно для версии 22

Angular сильно изменился с 2023 по 2026 год. В интернете и в памяти языковых моделей много кода для Angular 2–17. Этот документ — опора для автора курса: **что проверено** для установленной версии и **что в курсе запрещено**.

Правило: любое утверждение об API проверяется по `.d.ts` и `fesm2022/*.mjs` в `node_modules/@angular/*` установленной версии. Новое проверенное — добавлять сюда с источником.

```bash
# Поиск по типам: экспорты собраны списками `export { … }` в конце файлов, поэтому grep по «export declare function X» их не находит
python3 - <<'EOF'
import re, glob
for f in glob.glob('node_modules/@angular/*/types/*.d.ts'):
    t = open(f).read()
    for m in re.finditer(r'declare (?:function|const|class|interface|enum) (debounced)\b', t):
        print(f, t[max(0, m.start() - 800):m.end() + 200])
EOF
```

zsh: шаблоны с `[`, `?`, `*` интерпретируются как glob. Для поиска удобнее Python (как в курсе PixiJS).

## Проверено (Angular 22.2.1, 2026-10-03)

| Факт | Источник |
|---|---|
| Последняя версия — 22.2.1 (30.09.2026); ветки 20.3 и 21.2 ещё получают исправления | `npm view @angular/core time` |
| `@angular/compiler-cli` и `@angular/build` требуют `typescript >=6.0 <6.1` | `npm view … peerDependencies` |
| Зонлесс включён по умолчанию: токен `ZONELESS_ENABLED` имеет фабрику `() => true`. `provideZonelessChangeDetection()` (публичный с 20.2) можно указывать явно; `provideZoneChangeDetection()` возвращает zone.js | `core/fesm2022/_pending_tasks-chunk.mjs`, `core.d.ts` |
| Если указать оба провайдера, Angular пишет предупреждение NG0408 | `core/fesm2022/core.mjs` |
| **OnPush — стратегия по умолчанию.** `ChangeDetectionStrategy` = `OnPush` (0) и новое значение `Eager` (1) — «проверять всегда», замена старого `Default` | `ChangeDetectionStrategy` в `core/types/_debug_node-chunk.d.ts` («NOTE: OnPush is enabled by default») |
| Новый декоратор **`@Service()`** — сервис, который автоматически доступен в DI (`autoProvided` по умолчанию `true`; можно `factory`). `@Injectable({ providedIn: 'root' })` тоже работает | `ServiceDecorator` в `core` |
| `injectAsync(() => import('./x'), { prefetch: onIdle })` — ленивая загрузка сервиса (публичный с 22.0). Сервис должен быть `providedIn: 'root'` или `@Service()` | `core` |
| `debounced(source, wait)` — ресурс с задержкой поверх сигнала. **Экспериментальный** (22.0) | `core` |
| `resource`, `rxResource` (`@angular/core/rxjs-interop`), `httpResource` (`@angular/common/http`) — публичные с 22.0 | теги `@publicApi 22.0` |
| `linkedSignal` — публичный с 20.0 | `core` |
| **Signal Forms** — `@angular/forms/signals`: `form`, `FormField` (директива `[formField]`), валидаторы `required`, `email`, `min`, `max`, `minLength`, `maxLength`, `pattern`, `validate`, `validateAsync`, `validateHttp`, `validateStandardSchema`, `applyEach`, `applyWhen`, `disabled`, `hidden`, `readonly`, `debounce`, `submit`, `schema`. Публичные с 22.0 | `forms/types/signals.d.ts` |
| Прототип с `form(model, p => required(p.name))` и `[formField]` работает в JIT: `valid()` меняется при вводе | `spikes/jit-preview` |
| `@angular/animations` — **устаревший** пакет: «Use `animate.enter` and `animate.leave` instead». Компилятор знает `animate.enter`/`animate.leave` | предупреждение npm при установке, `compiler.mjs` |
| `NgIf`, `NgFor` (`NgForOf`) и др. — `@deprecated 20.0`, «Use the `@if` block instead. Intent to remove in a future major release» | `common/types/_common_module-chunk.d.ts` |
| `providedIn: NgModule` и `providedIn: 'any'` — устарели | `core.d.ts` |
| Экспорты роутера: `withComponentInputBinding`, `withViewTransitions`, `withInMemoryScrolling`, `withHashLocation`, `withPreloading`, `withNavigationErrorHandler`, `withRouterConfig`; `withRouterResources` — **developer preview** (22.2) | `router/types/router.d.ts` |
| HTTP: `provideHttpClient`, `withFetch`, **`withXhr`**, `withInterceptors`, `withInterceptorsFromDi`, `withXsrfConfiguration`, `withNoXsrfProtection` | `common/types/http.d.ts` |
| `@angular/core/rxjs-interop`: `toSignal`, `toObservable`, `takeUntilDestroyed`, `outputFromObservable`, `outputToObservable`, `pendingUntilEvent`, `rxResource` | `core/types/rxjs-interop.d.ts` |
| В `core` есть `inputBinding`, `outputBinding`, `twoWayBinding` (привязки при `createComponent`), `afterRenderEffect`, `afterNextRender`, `afterEveryRender`, `provideAppInitializer`, `provideBrowserGlobalErrorListeners`… | экспорты `core.mjs` |
| Без JIT-трансформа сигнальные входы в JIT не работают; трансформ `angularJitApplicationTransform` экспортируется из корня `@angular/compiler-cli` (пакет только ESM) | прототип |
| TypeScript 5.9 (Monaco 0.57) и 6.0 проверяют код с типами Angular 22 без ошибок | прототип |
| **`HttpClient` по умолчанию работает через `FetchBackend`**; `withFetch()` — `@deprecated` («not required anymore»); старое поведение — `withXhr()` | `common/fesm2022/_module-chunk.mjs`, `common/types/http.d.ts` |
| **`ng new` 22.2** (`@schematics/angular@22.2.1`): `main.ts` → `bootstrapApplication(App, appConfig)`; `app.ts` (`App`, `templateUrl: './app.html'`, `styleUrl: './app.css'`, `title = signal(...)`, `protected readonly`); `app.config.ts` с `provideBrowserGlobalErrorListeners()` и `provideRouter(routes)`; `app.routes.ts`; по умолчанию `zoneless: true`, `standalone: true`, `routing: true`, `style: css`, `testRunner: vitest`, `fileNameStyleGuide: 2025` (имена без `.component`) | шаблоны и `schema.json` пакета |
| `tsconfig.json` из `ng new`: нет `"strict": true` — в **TypeScript 6 строгий режим включён по умолчанию**; есть `experimentalDecorators: true`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `module: preserve`; `angularCompilerOptions`: `strictInjectionParameters`, `strictInputAccessModifiers` (`strictTemplates` не указан — проверить, включён ли по умолчанию) | `workspace/files/tsconfig.json.template` |
| Angular CLI 22 требует **Node 22.22.3+ / 24.15+ / 26+** | сообщение `npx @angular/cli@22.2.1 new` |
| В JIT: `@Service()`, `httpResource` (в т. ч. `{ url, params }` от сигналов, отмена устаревших запросов), `withComponentInputBinding` + `input.required()`, `loadComponent`, `@let`, `@if (...; as x)`, `routerLinkActive` работают | `checks/ch00-sandbox.mjs` |
| Без `@Component`: `NG0906: The App is not an Angular component, make sure it has the \`@Component\` decorator.`; компонент без `selector` получает селектор по умолчанию `ng-component` (`NG05104: The selector "ng-component" did not match any elements`); NG05104 при запуске выводится дважды: `ERROR RuntimeError…` от `ErrorHandler` и отклонённый промис `bootstrapApplication` | эксперименты главы 1 |
| `bootstrapApplication` разрешается `ApplicationRef` уже после первой отрисовки (в `.then` DOM на месте, сразу после вызова — нет); хост получает `ng-version="22.2.1"` | эксперименты главы 1 |
| `provideBrowserGlobalErrorListeners()` = слушатели `error` и `unhandledrejection` на `window` → `ErrorHandler` + `preventDefault()`, снимаются при уничтожении приложения. Ошибки в обработчиках шаблона Angular передаёт в `ErrorHandler` и без него | `_pending_tasks-chunk.mjs`, эксперимент |
| Глобальный `ng` (`getComponent`, `getContext`, `applyChanges`, `ɵgetSignalGraph`…) публикуется только при `ngDevMode` | `publishDefaultGlobalUtils` |
| Компилятор: функция шаблона `App_Template(rf, ctx)`, `rf & 1` — создание, `rf & 2` — обновление; для элементов без директив — `ɵɵdomElementStart`/`ɵɵdomElementEnd`, вызовы цепочкой; атрибуты в `consts` (`[1, 'header']`, `1` = `AttributeMarker.Classes`); JIT и AOT (`ngc`) дают одинаковую функцию, JIT добавляет префиксы `jit___…_N`; AOT обрабатывает стили при сборке (`[_ngcontent-%COMP%]`) | эксперименты главы 1, `ngc` |
| Ошибки JIT: NG0303 «Can't bind to 'x' since it isn't a known property of 'y' (used in the 'Catalog' component template)» и NG0304 «'x' is not a known element» — через `console.error`, приложение продолжает работать; NG0303 повторяется для каждого элемента `@for`; `@for` без `track` — «Errors during JIT compilation of template for Catalog: @for loop must have a "track" expression»; обязательный вход без значения — NG0950; исключение в выражении шаблона — `ERROR TypeError…` без места в шаблоне | эксперименты на песочнице |
| **Выражения шаблона в 22.2**: работают шаблонные строки, `typeof`, `void`, `in`, `**`, стрелочные функции, spread `[...arr]`, регулярные выражения, `this`. Ошибки компиляции: присваивания (`Bindings cannot contain assignments`), `++` (`Unexpected end of expression`), `new` (`Unexpected token 'Date'`), `;` (`Binding expression cannot contain chained expression`), `&` (`Unexpected token '&'`). `Math`/`window`/`console`/`JSON` → `ctx.Math` → `ERROR TypeError: Cannot read properties of undefined (reading 'round')`, приложение не отрисовывается; в AOT — `TS2339: Property 'Math' does not exist on type 'App'` | эксперименты главы 2, `ngc` |
| Интерполяция: `undefined`/`null` → пустая строка, `false` → `false`, объект → `[object Object]` | эксперимент главы 2 |
| **Обнаружение изменений после событий**: обёртка обработчика `wrapListenerIn_markDirtyAndPreventDefault` вызывает `markViewDirty` **до** обработчика. Поэтому изменение **обычного поля** в обработчике `(click)` (даже `(click)="plain = plain + 1"`) обновляет экран при OnPush + зонлесс. Без обработчиков в шаблоне (`{{ box.value }}` при наборе) экран не обновляется; `(input)="0"` — обновляет | `_debug_node-chunk.mjs`, эксперименты главы 2 |
| Метод в шаблоне вызывается один раз за проверку компонента (в dev-режиме повторной проверки `checkNoChanges` в зонлесс-приложении не видно) | эксперимент главы 2 |
| `[aria-label]="…"` без `attr.` работает: компилятор генерирует `ɵɵariaProperty` → атрибут (или вход директивы с таким именем). `[ariaLabel]` и `[role]` тоже пишут атрибуты (свойства DOM). `[data-id]`, `[colspan]` → NG0303; в AOT опечатка `[scr]` → NG8002 | `core`, эксперименты главы 2 |
| `[attr.x]="null"` удаляет атрибут; `[class]` (строка, массив, объект) и `[style]` (строка, объект) сохраняют статический `class`/`style`; `[style.width.%]`, `[style.font-size.em]` работают | эксперименты главы 2 |
| Санитизация: `[innerHTML]` удаляет `<script>`, `onerror`, `javascript:` → `unsafe:javascript:…`; предупреждения `WARNING: sanitizing HTML stripped some content, see https://angular.dev/best-practices/security#preventing-cross-site-scripting-xss` и `WARNING: sanitizing unsafe URL value javascript:alert(3) (see …)`; `<p>`, `<i>`, `<a href="https://…">` остаются; `[src]` компилируется с `ɵɵsanitizeUrl` | эксперименты главы 2 |
| **`@let` в JIT не проверяется**: чтение до объявления, присваивание в обработчике, повтор имени — без ошибок. AOT (`strictTemplates`): NG8015 `Cannot assign to @let declaration`, NG8016 `Cannot read @let declaration 'x' before it has been defined`, NG8017 `Cannot declare @let called 'x' as there is another symbol…`, NG8112 (не используется). Без `;` — ошибка и в JIT: `Incomplete @let declaration "x"`. `@let`, используемый в одном представлении, компилируется в обычную `const` в блоке обновления | эксперименты главы 2, `ngc` |
| AOT `strictTemplates`: `protected readonly inStock = 12` даёт литеральный тип → `inStock === 0` — TS2367 («types '12' and '0' have no overlap»). Нужен `: number`. `private`-поля в шаблоне AOT 22.2 **принимает** (руководство по стилю всё равно советует `protected`) | `ngc` |
| AOT: `$event.target` у `(input)` на `<input>` — `HTMLInputElement`, у `(click)` на `<div>` — `EventTarget \| null`, у `(keydown.enter)` `$event` — `Event` (не `KeyboardEvent`) | `ngc` |
| `(keydown.enter)` не срабатывает на Shift+Enter; `(keydown.shift.enter)`, `(keydown.escape)` работают. Неактивная кнопка не генерирует `click`. Ошибка в имени метода обработчика — `ERROR TypeError: ctx.addToKart is not a function` только при событии | эксперименты главы 2 |
| Руководство по стилю (angular.dev/style-guide): `protected` для членов, которые читает шаблон; `readonly` — для свойств, которые задаёт Angular (`input`, `output`, запросы); обработчики называть по действию (`saveUserData`, не `handleClick`); `class`/`style` вместо `NgClass`/`NgStyle` | angular.dev, 2026-10-04 |

## Проверить при написании соответствующих глав

- [x] Что генерирует `ng new` в 22.2 — см. таблицу выше. `provideZonelessChangeDetection` в шаблоне **нет** (зонлесс по умолчанию).
- [x] `HttpClient` по умолчанию на `fetch` — см. таблицу.
- [x] `withFetch` — устарел.
- [ ] `strictTemplates` по умолчанию в Angular 22 (в `tsconfig.json` из `ng new` не указан) — этап 5 и глава 18.
- [ ] Поведение `@defer` в JIT — глава 14.
- [x] Отладочный глобальный объект `ng` — есть в dev-режиме, см. таблицу.
- [ ] Значения по умолчанию в `httpResource` (что в `value()` во время загрузки и при ошибке) — глава 11.
- [ ] Что такое `withRouterResources` и стоит ли его показывать (developer preview) — глава 10.
- [ ] `declareExperimentalWebMcpTool`, `provideExperimentalWebMcpForms` — экспериментальное, в курс не берём, но упомянуть можно.
- [ ] Поддерживаются ли ещё `ngOnChanges` и другие хуки без предупреждений (да — но проверить формулировки в документации).
- [ ] Стабильность `@angular/forms/signals` относительно реактивных форм: какие формы предлагает `ng generate` и документация как основные.

## Запрещено в коде уроков

Ниже — то, что ученик **не должен писать**. Такое показываем только во врезке «Вы встретите в старом коде» и только когда ученик уже знает современный вариант.

| Не пишем | Пишем | Почему |
|---|---|---|
| `@NgModule`, `declarations`, `bootstrapModule` | standalone-компоненты, `bootstrapApplication`, `imports` в `@Component` | standalone — по умолчанию с v19 |
| `standalone: true` в декораторе | ничего | значение по умолчанию, лишний шум |
| `*ngIf`, `*ngFor`, `*ngSwitch`, `[ngSwitch]` | `@if`, `@for (… ; track …)`, `@switch` | устарели в 20.0 |
| `@Input()`, `@Output() x = new EventEmitter()` | `input()`, `input.required()`, `output()`, `model()` | сигнальный API |
| `@ViewChild`, `@ContentChildren` | `viewChild()`, `contentChildren()` | сигнальные запросы |
| `@HostBinding`, `@HostListener` | поле `host: { … }` в `@Component`/`@Directive` | рекомендация стиля Angular |
| `constructor(private http: HttpClient)` | `private readonly http = inject(HttpClient)` | `inject()` |
| `ngOnDestroy` для отписки, `Subject` + `takeUntil` | `DestroyRef`, `takeUntilDestroyed()` | |
| zone.js, `NgZone.run`, `ChangeDetectorRef.detectChanges()` для «починки» | сигналы, зонлесс | зонлесс по умолчанию |
| `changeDetection: ChangeDetectionStrategy.OnPush` в каждом компоненте | ничего | OnPush по умолчанию в v22 |
| `@angular/animations`, `trigger()`/`state()` | `animate.enter`, `animate.leave`, CSS | пакет устарел |
| `HttpClientModule` | `provideHttpClient()` | |
| `RouterModule.forRoot` | `provideRouter(routes, with…())` | |
| классовые гарды `implements CanActivate` | функции `CanActivateFn` | |
| `ngClass`, `ngStyle` | `[class.x]`, `[class]`, `[style.x]` | проще и быстрее; рекомендация стиля |
| `providedIn: 'any'` / `NgModule` | `'root'`, `@Service()`, `providers` компонента | устарели |
| `async` пайп как основной способ получить данные | сигналы, `httpResource`, `toSignal` | `async` показываем в главе про RxJS |
| `EventEmitter` в сервисах | сигналы или `Subject` | |

Отдельно о **реактивных формах** (`FormGroup`, `FormControl`): основной путь курса — Signal Forms. Реактивные формы показываем в одном шаге главы 13 как то, что встретится почти в любом существующем проекте.
