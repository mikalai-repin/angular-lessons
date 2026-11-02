# Современный Angular: что верно для версии 22

В интернете и в памяти языковых моделей много кода для Angular 2–17. Здесь собрано главное, что верно для установленной версии, и то, что в курсе **запрещено**. Полная таблица проверенных фактов с источниками (около 210 строк: тексты ошибок `NG0xxx`, поведение по главам, устройство внутри) лежит в [archive/verified-facts.md](archive/verified-facts.md). Её не читают целиком, а ищут по слову: `grep -n 'linkedSignal' docs/archive/verified-facts.md`.

Правило: любое утверждение об API проверяется по `.d.ts` и `fesm2022/*.mjs` в `node_modules/@angular/*` установленной версии. Новый проверенный факт записывается строкой в `archive/verified-facts.md` с источником. Сюда он попадает, только если меняет правило для всех глав.

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

## Значения по умолчанию в 22.2.1

- **Версии**: Angular 22.2.1, TypeScript `>=6.0 <6.1` (в TS 6 `strict` включён по умолчанию), RxJS 7.8.2, NgRx 22.0.1. Angular CLI 22 требует Node `^22.22.3 || ^24.15.0 || >=26`. `ng new` из CLI 22.2.1 ставит последние 22.2.x (на 25.10.2026 это 22.2.3).
- **Зонлесс** по умолчанию (`ZONELESS_ENABLED` → `true`). Обычное поле, изменённое в `setTimeout`, экран не обновит даже с `Eager`. Сигнал обновит.
- **OnPush** по умолчанию. `ChangeDetectionStrategy.Eager` — «проверять всегда», `Default` — его `@deprecated` синоним.
- **Обработчик события в шаблоне** вызывает `markViewDirty` до своего тела, поэтому изменение обычного поля в `(click)` экран обновляет.
- **`@Service()`** — новый декоратор (22.0), его даёт `ng g s`. По умолчанию `autoProvided: true` (как `providedIn: 'root'`), с `false` нужен явный провайдер. `@Injectable({ providedIn: 'root' })` не устарел.
- **`HttpClient`** — `providedIn: 'root'`, работает без `provideHttpClient()`; функция нужна для настроек. Бэкенд по умолчанию — `FetchBackend`: `withFetch()` устарел, старое поведение даёт `withXhr()`. XSRF-интерцептор включён по умолчанию.
- **`ng new` 22.2**: `bootstrapApplication(App, appConfig)`, файлы без `.component` (`app.ts`, `app.html`), `protected readonly`, `provideBrowserGlobalErrorListeners()`, Vitest + jsdom, `strictTemplates` включён по умолчанию (в `tsconfig` не указан).
- **Стабильные** (`@publicApi`): `resource`, `rxResource`, `httpResource` (22.0), Signal Forms `@angular/forms/signals` (22.0), `linkedSignal`, `effect` (20.0), `input`/`output`/`model`, сигнальные запросы (19.0), `afterNextRender`/`afterEveryRender` (20.0), `animate.enter`/`animate.leave` (20.2), `injectAsync` (22.0), `withAutoCleanupInjectors` (22.2).
- **Не стабильные**: `debounced` — `@experimental 22.0`; `withViewTransitions` — `@developerPreview 19.0`; `withRouterResources` — `@developerPreview 22.2`; `provideCheckNoChangesConfig` — `@developerPreview 20.0`; `withExperimentalPlatformNavigation` — `@experimental 21.1`.
- **Устарели**: `@angular/animations` (удаление планируется в v23), `NgIf`/`NgFor`/`NgSwitch` (20.0; `NgTemplateOutlet` не устарел), `providedIn: 'any'`/`NgModule`, `withFetch`, `withJsonpSupport` (22.1), `APP_INITIALIZER`, классовые гарды и `canLoad`, `RouterTestingModule`, `flushEffects`, `withIncrementalHydration` (22.0: включена по умолчанию).

## JIT в превью против AOT

Превью компилирует шаблоны в JIT, а настоящая сборка и `ng test` — в AOT. JIT многое пропускает молча:

- ошибки `@let` (NG8015–NG8017), литеральные типы `readonly`-полей (TS2367), необязательные поля в арифметике (TS2532), `@default never;`, опечатки в полях шаблона — всё это ловит только `ngc --strictTemplates` (`tools/e2e/aot-chapter.mjs <глава>`);
- неизвестный элемент или свойство: в JIT это `NG0304`/`NG0303` в консоли во время работы, в AOT — `NG8001`/`NG8002` при сборке;
- у `@defer` в JIT функция загрузки — `null`, поэтому превью изображает чанки через `ɵDEFER_BLOCK_DEPENDENCY_INTERCEPTOR` (см. `architecture.md`);
- у сигналов в JIT нет `debugName`: в AOT его добавляет `signalMetadataTransform`.

Подробности и тексты ошибок ищите в `archive/verified-facts.md` по коду (`NG0950`, `NG8002`…) или по API.

## Открытые вопросы

- [ ] `declareExperimentalWebMcpTool`, `provideExperimentalWebMcpForms` — экспериментальные, в курс не берём, но упомянуть можно.

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
