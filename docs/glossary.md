# Словарь терминов

Единые переводы для всех уроков. При первом упоминании в уроке пишем: «сигнал (`signal`)», «привязка свойства (property binding)», дальше — только русский термин. Имена классов, функций и декораторов **не переводим**.

Новый термин сначала добавляем сюда, потом используем в уроке. Ориентир для устоявшихся переводов — русскоязычное сообщество Angular; если перевода нет, выбираем понятный и фиксируем здесь.

## Основы

| English | Русский | Комментарий |
|---|---|---|
| framework | фреймворк | |
| component | компонент | |
| template | шаблон | |
| selector | селектор | `app-root` |
| host element | хост-элемент | элемент, на котором живёт компонент |
| decorator | декоратор | `@Component` |
| metadata | метаданные | объект в декораторе |
| standalone component | standalone-компонент | обычно просто «компонент»: других в курсе нет |
| bootstrap | запуск приложения | `bootstrapApplication` |
| application config | конфигурация приложения | `app.config.ts` |
| provider | провайдер | |
| compiler | компилятор | |
| AOT / JIT | AOT / JIT (компиляция заранее / во время выполнения) | расшифровка при первом упоминании |
| dev mode | режим разработки | |
| entry point | точка входа | `main.ts` |
| application reference | ссылка на приложение (`ApplicationRef`) | результат `bootstrapApplication` |
| error handler | обработчик ошибок (`ErrorHandler`) | пометка `ERROR` в консоли |
| global styles | глобальные стили | `styles.css` |
| component styles | стили компонента | `styleUrl`, действуют только на шаблон компонента |
| instruction | инструкция | вызов в скомпилированном шаблоне: `ɵɵdomElementStart`, `ɵɵtext` |
| creation / update mode | режим создания / режим обновления | блоки `rf & 1` и `rf & 2` функции шаблона |
| private API (ɵ) | внутреннее API | имена с префиксом `ɵ`, в коде приложения не используются |

## Шаблоны

| English | Русский | Комментарий |
|---|---|---|
| interpolation | интерполяция | `{{ }}` |
| binding | привязка | |
| property binding | привязка свойства | `[src]` |
| attribute binding | привязка атрибута | `[attr.x]` |
| class / style binding | привязка класса / стиля | |
| event binding | привязка события | `(click)` |
| two-way binding | двусторонняя привязка | `[(value)]` |
| template expression | выражение шаблона | |
| template statement | обработчик в шаблоне | `(click)="add()"` |
| template reference variable | ссылка на элемент в шаблоне | `#input` |
| control flow block | управляющий блок | `@if`, `@for`, `@switch` |
| track expression | выражение отслеживания | `track game.id` в `@for` |
| embedded view / template | встроенное представление / шаблон | `<ng-template>`, тело блока |
| exhaustive check | проверка полноты | `@default never;` |
| deferrable view | отложенный блок | `@defer` |
| trigger | триггер | `on viewport` |
| content projection | проекция содержимого | `<ng-content>` |
| slot | слот | место проекции |
| pipe | пайп | «фильтр» не используем |
| pipe argument / parameter | параметр пайпа | `price \| currency: 'RUB'` |
| pipe chaining | цепочка пайпов | `x \| duration \| uppercase` |
| pure / impure pipe | чистый / нечистый пайп | `pure: false` |
| locale / locale data | локаль / данные локали | `LOCALE_ID`, `registerLocaleData` |
| directive | директива | |
| directive composition | композиция директив | `hostDirectives` |
| attribute directive | директива атрибута | |
| structural directive | структурная директива | только в `::: legacy` и у `*cdkVirtualFor` (15.7) |
| host directive | хост-директива | `hostDirectives` |
| host binding | привязка хоста | `host: { '[class.x]': '…' }` |
| host listener | обработчик события хоста | `host: { '(keydown.enter)': '…' }` |
| fallback content | запасное содержимое | разметка внутри `<ng-content>`, если в слот ничего не передали |
| emulated encapsulation | эмулированная инкапсуляция | `ViewEncapsulation.Emulated`, атрибуты `_ngcontent-…` / `_nghost-…` |
| shadow DOM / shadow root | теневой DOM / теневой корень | `ViewEncapsulation.ShadowDom` |
| view encapsulation | инкапсуляция стилей | |
| sanitization | санитизация (очистка) | |
| sanitizer | санитайзер | часть Angular, которая очищает HTML и URL (`DomSanitizer`) |
| DOM property | свойство DOM | `img.src`, `button.disabled` — то, что меняет привязка `[x]` |
| HTML attribute | атрибут HTML | то, что написано в разметке и читается `getAttribute` |
| event object | объект события | `$event` |
| key event filter | фильтр клавиш | `(keydown.enter)` |
| template variable (`@let`) | переменная шаблона | `@let soldOut = …;` |
| template context | контекст шаблона | экземпляр компонента, `ctx` в скомпилированном шаблоне |

## Компоненты и жизненный цикл

| English | Русский | Комментарий |
|---|---|---|
| input | входной параметр, вход | `input()` |
| required input | обязательный вход | |
| output | событие компонента, выход | `output()` |
| model input | модель (двусторонний вход) | `model()` |
| input transform | преобразование входа | `transform: booleanAttribute` |
| alias | псевдоним (входа, выхода) | `alias: 'x'` |
| data flow | поток данных | «данные вниз — входами, события вверх — выходами» |
| view query | запрос к представлению | `viewChild()`, `viewChildren()` — элементы и компоненты своего шаблона |
| content query | запрос к содержимому | `contentChild()`, `contentChildren()` — то, что родитель вложил в компонент |
| host element | хост-элемент | элемент, на котором «живёт» компонент: `<app-game-card>` |
| view | представление | |
| view tree | дерево представлений | |
| component tree | дерево компонентов | |
| lifecycle | жизненный цикл | создание → проверки → уничтожение |
| lifecycle hook | хук жизненного цикла | `ngOnInit`, `ngOnChanges`, `ngOnDestroy` |
| render | отрисовка, рендер | |
| after-render callback | колбэк после отрисовки | `afterNextRender`, `afterEveryRender`, `afterRenderEffect` |
| render phase | фаза (колбэка после отрисовки) | `earlyRead`, `write`, `mixedReadWrite`, `read` |
| destroy callback | колбэк уничтожения | `DestroyRef.onDestroy` |
| modal dialog | модальное окно | `<dialog>` + `showModal()` |
| dynamic component | динамический компонент, компонент из кода | `createComponent`, `ViewContainerRef.createComponent` (глава 17) |
| host view | хост-представление | `ComponentRef.hostView`: его включают в обнаружение изменений `ApplicationRef.attachView` |
| profiler | профайлер | `ng.ɵsetProfiler`, Angular DevTools |
| parent / child component | родительский / дочерний компонент | |

## Реактивность

| English | Русский | Комментарий |
|---|---|---|
| signal | сигнал | |
| writable signal | изменяемый сигнал | |
| computed signal | вычисляемый сигнал | `computed` |
| linked signal | связанный сигнал | `linkedSignal` |
| effect | эффект | |
| reactive context | реактивный контекст | |
| dependency (signal) | зависимость | что прочитал `computed` |
| producer / consumer | производитель / потребитель | граф сигналов, «Под капотом» |
| active consumer | активный потребитель | узел, в который записываются зависимости при чтении сигнала (глава 3.9) |
| live consumer | живой потребитель | шаблон, эффект и всё, что они читают; держат связи в графе |
| push-pull | push-pull (фазы «разослать пометки» и «вычислить по требованию») | глава 3.9 |
| equality cutoff | отсечение по равенству | `computed` с прежним значением не трогает потребителей |
| derived state | производное состояние | вычисляется из других сигналов (`computed`) |
| application state | состояние приложения | данные, нужные нескольким компонентам и живущие дольше них: корзина, избранное (глава 9) |
| UI state | состояние интерфейса | нужно одному компоненту: текст поиска, открытое окно, сообщение об ошибке |
| read-only signal | сигнал только для чтения | `Signal<T>`, `asReadonly()` |
| persistence | сохранение (состояния) | `localStorage` через `effect` |
| server state | данные сервера | хозяин — сервер; `httpResource`, не хранилище (глава 11) |
| side effect | побочный эффект | действие за пределами сигналов: консоль, `localStorage`, DOM |
| resource | ресурс | `resource`, `httpResource` |
| change detection | обнаружение изменений | |
| zoneless | зонлесс (без zone.js) | |
| dirty | «грязный», помеченный на проверку | |
| change detection strategy | стратегия обнаружения изменений | `OnPush` (по умолчанию в v22), `Eager` |
| check (a component) | проверить (компонент) | выполнить блок обновления его шаблона |
| observable | Observable, поток | имя класса не переводим |
| subscription | подписка | |
| operator | оператор | RxJS |
| stream | поток | |
| unsubscribe | отписка, отписаться | `subscription.unsubscribe()` |
| teardown | функция уборки | функция, которую возвращает функция подписки `new Observable(…)`; её вызывает отписка или завершение (глава 12) |
| emit / next | выдать (значение), прислать | «поток выдал значение»; `next` — имя метода не переводим |
| complete | завершение (потока) | после `complete` значений больше не будет |
| cold / hot observable | холодный / горячий поток | холодный запускает работу для каждого подписчика (`HttpClient.get`), горячий шлёт всем одно и то же и не ждёт подписчиков (`router.events`, `Subject`) |
| subject | `Subject` | имя класса не переводим: поток, в который можно отправлять значения самому |
| marble diagram | диаграмма потока | значения на оси времени: `--a--b--|` |
| higher-order mapping operator | оператор переключения | `switchMap`, `mergeMap`, `concatMap`, `exhaustMap`: значение → внутренний поток |
| subscription leak | утечка подписки | подписка, которая живёт дольше компонента (глава 12) |
| glitch | промежуточное (несогласованное) состояние | `combineLatest` в «ромбе»: значение из старой и новой цены сразу (глава 12, «под капотом») |
| push / pull | проталкивание / вытягивание | поток проталкивает значения подписчикам, сигнал вычисляется, когда его читают |

## Внедрение зависимостей

| English | Русский | Комментарий |
|---|---|---|
| dependency injection, DI | внедрение зависимостей, DI | |
| dependency | зависимость | объект, который компонент получает через DI |
| service | сервис | класс с `@Service()` / `@Injectable` |
| injector | инжектор | |
| provider | провайдер | `{ provide, useClass/useValue/useFactory/useExisting }` |
| token | токен | ключ, по которому DI ищет зависимость: класс или `InjectionToken` |
| inject function | inject-функция | своя функция, которая вызывает `inject()` (`injectNow`) |
| lazy service | ленивый сервис | `injectAsync` |
| platform injector | инжектор платформы | |
| injection context | контекст внедрения | |
| injection token | токен внедрения | `InjectionToken` |
| root injector | корневой инжектор | |
| environment injector | инжектор окружения | |
| element injector | инжектор элемента | |
| store | хранилище | `CartStore`: закрытое состояние, чтение, действия |
| action (store method) | действие | метод хранилища, который меняет состояние: `add`, `clear` |

## Роутинг и данные

| English | Русский | Комментарий |
|---|---|---|
| router | роутер | |
| route | маршрут | |
| routing | роутинг, маршрутизация | «роутинг» в тексте, «маршрут» для одного пути |
| route parameter | параметр маршрута | `:id` |
| query parameter | query-параметр | `?q=` |
| route config / routes | карта маршрутов | массив `Routes` в `app.routes.ts` |
| link commands | команды (ссылки) | `[routerLink]="['/games', id]"` |
| active link | активная ссылка | `routerLinkActive` |
| child routes | вложенные (дочерние) маршруты | `children` |
| layout (component) | макет (раздела) | компонент с меню и `<router-outlet>`: `AdminLayout`, `Account` |
| route providers | провайдеры маршрута | `Route.providers`: свой инжектор окружения для маршрута и его детей (глава 17) |
| redirect | переадресация | `redirectTo` |
| route data | данные маршрута | `data`, `resolve` |
| breadcrumbs | хлебные крошки | практикум главы 10 |
| view transition | плавная смена страниц (View Transitions) | `withViewTransitions()` |
| recognition | распознавание (маршрута) | подбор маршрутов по адресу, «под капотом» главы 10 |
| router outlet | место вывода маршрута, `router-outlet` | |
| lazy loading | ленивая загрузка | |
| guard | гард | `CanActivateFn` |
| resolver | резолвер | |
| navigation | навигация | |
| deep link | глубокая ссылка | |
| backend | бэкенд | «учебный бэкенд» |
| request / response | запрос / ответ | |
| interceptor | интерцептор | `HttpInterceptorFn`: функция, через которую проходит каждый запрос `HttpClient` (глава 12) |
| interceptor chain | цепочка интерцепторов | `withInterceptors([…])`: запрос — сверху вниз, ответ — снизу вверх |
| retry | повтор (запроса) | `retry({ count, delay })` |
| cache | кэш | сохранённые ответы сервера (`cacheInterceptor`, глава 12) |
| cache invalidation | сброс (очистка) кэша | после изменения данных: `ResponseCache.clear()` (глава 17) |
| file upload | загрузка файла | `<input type="file">` + `FormData` → `multipart/form-data` (глава 17) |
| sort order | порядок сортировки | `aria-sort`: `ascending`/`descending` |
| HTTP context | контекст запроса | `HttpContext` + `HttpContextToken`: метки запроса для интерцепторов, на сервер не уходят |
| endpoint | адрес API | |
| API (web API) | API сервера | набор адресов `/api/…`, по которым приложение просит и отправляет данные (глава 11) |
| HTTP client | клиент HTTP | `HttpClient` |
| resource status | статус ресурса | `idle`, `loading`, `reloading`, `resolved`, `error`, `local` |
| loader | загрузчик | функция `loader` у `resource`: получает параметры и `abortSignal`, возвращает промис |
| abort signal | сигнал отмены | `AbortSignal` из `AbortController`; не путать с сигналами Angular |
| race condition | гонка (запросов) | ответ на старый запрос пришёл позже нового |
| skeleton | заглушка загрузки | серые блоки на месте карточек, пока данные грузятся |
| debounce | задержка (поиск с задержкой) | `debounced`: значение догоняет источник, когда тот перестал меняться |
| optimistic update | оптимистичное обновление | показать результат сразу, откатить при ошибке сервера |
| pagination | постраничная загрузка, страницы | параметры `page` и `size` |
| authentication / authorization | вход (аутентификация) / права доступа (авторизация) | в тексте чаще «вход» и «права» |
| session | сессия | вошёл ли пользователь; восстанавливается после перезагрузки |
| access token / refresh token | токен доступа / refresh-токен | в главе 14 «токен» без уточнения — токен доступа (не путать с токеном DI) |
| bearer token | токен в заголовке `Authorization: Bearer …` | «предъявитель»: кто предъявил токен, тот и вошёл |
| JWT (JSON Web Token) | JWT | токен из трёх частей `заголовок.данные.подпись`; данные читает любой, подделать без ключа нельзя |
| claim | поле токена | `sub`, `role`, `exp` в данных JWT |
| token expiration | срок действия токена | `exp`; у учебного бэкенда — `backend: { tokenTtl }` |
| token rotation | ротация refresh-токена | обновление выдаёт новую пару, старый refresh-токен отзывается |
| app initializer | инициализатор приложения | `provideAppInitializer`: запуск ждёт его промис |
| role | роль | `user`, `admin` |
| open redirect | открытый редирект | уязвимость при возврате по `returnUrl` |
| XSS (cross-site scripting) | XSS, внедрение скрипта | чужой скрипт на странице читает всё, что видит код приложения |
| CSRF / XSRF (cross-site request forgery) | CSRF, подделка запроса | чужой сайт отправляет запрос с cookie пользователя; защита в `HttpClient` — XSRF-токен |
| httpOnly cookie | httpOnly-cookie | cookie, которую не видит JavaScript страницы |

## NgRx (глава 18)

| English | Русский | Комментарий |
|---|---|---|
| state management | управление состоянием | |
| Signal Store | Signal Store | имя не переводим; «стор» — только в разговорных фразах |
| store feature | расширение стора | `signalStoreFeature` |
| entity | сущность | `withEntities` |
| action | действие (action) | классический Store |
| reducer | редьюсер | |
| selector | селектор | `createSelector`; не путать с селектором компонента — уточнять «селектор состояния» |
| effect (NgRx) | эффект NgRx | не путать с `effect()` Angular — всегда уточнять |
| dispatch | отправить действие | `store.dispatch` |

## Формы

| English | Русский | Комментарий |
|---|---|---|
| Signal Forms | Signal Forms (формы на сигналах) | `@angular/forms/signals`; имя не переводим |
| form | форма | |
| field | поле | |
| form model | модель формы | сигнал с данными |
| field tree | дерево полей | `FieldTree`: `loginForm.email` |
| field state | состояние поля | `FieldState`: `loginForm.email()` — `value`, `errors`, `touched`… |
| validation | валидация, проверка | в тексте — «проверка», «правило проверки» |
| validator | валидатор, правило проверки | `required`, `email`, `validate` |
| rule (form logic) | правило | всё, что схема задаёт полю: проверки, `hidden`, `disabled` |
| schema path | путь схемы | аргумент функции схемы: `login.email` до создания формы |
| cross-field validation | перекрёстная проверка | правило поля читает соседнее поле (`valueOf`) |
| async validation | асинхронная проверка | |
| pending | ожидание проверки | `pending()`: асинхронная проверка ещё идёт |
| touched / dirty | «тронуто» / изменено | состояния поля |
| hidden / disabled / readonly field | скрытое / отключённое / только для чтения поле | такие поля не проверяются |
| disabled reason | причина отключения | `disabledReasons()` |
| custom form control | своё поле формы | компонент с `FormValueControl`, связанный через `[formField]` |
| submit | отправка | |
| submission error | ошибка отправки | ошибка, которую вернула функция `action` |
| schema | схема | |
| reactive forms | реактивные формы | `FormGroup` |
| form control | контрол | объект реактивной формы: `FormControl` |
| template-driven forms | шаблонные формы | `ngModel` |

## Анимации и производительность (глава 15)

| English | Русский | Комментарий |
|---|---|---|
| enter / leave animation | анимация появления / исчезновения | `animate.enter`, `animate.leave` |
| animation function | функция анимации | `(animate.leave)="collapse($event)"`, событие `AnimationCallbackEvent` |
| Web Animations API | Web Animations API | `element.animate(keyframes, options)` — анимация из кода |
| reduced motion | «меньше движения» | системная настройка, медиазапрос `prefers-reduced-motion` |
| placeholder | заглушка (блок `@placeholder`) | что видно до срабатывания триггера `@defer` |
| loading block | блок загрузки (`@loading`) | что видно, пока грузятся зависимости блока |
| — | спутники `@defer` | `@placeholder`, `@loading`, `@error` вместе |
| image loader | загрузчик (картинок) | `IMAGE_LOADER`, `provideImgixLoader`: адрес картинки нужной ширины |
| error block | блок ошибки (`@error`) | зависимости блока не загрузились |
| prefetch | предзагрузка | `prefetch on idle`: загрузить код блока заранее, показать — по триггеру |
| chunk | чанк | отдельный файл JS сборки, который браузер загружает по требованию |
| dependency function | функция загрузки зависимостей | `…_DepsFn` в скомпилированном шаблоне |
| LCP (Largest Contentful Paint) | LCP — самый крупный элемент первого экрана | `priority` у `NgOptimizedImage` |
| layout shift | сдвиг вёрстки | страница прыгает, когда загрузилась картинка без размеров |
| virtual scrolling | виртуальная прокрутка | в DOM — только видимые строки (`cdk-virtual-scroll-viewport`) |

## Тесты и инструменты

| English | Русский | Комментарий |
|---|---|---|
| test | тест | `it('…', () => …)` |
| test suite | набор тестов | `describe` |
| test file / spec | файл тестов | `*.spec.ts` рядом с проверяемым файлом |
| assertion | утверждение | `expect(значение).toBe(ожидаемое)` |
| matcher | матчер | `toBe`, `toEqual`, `toContain`, `toHaveBeenCalledWith` |
| test runner | тест-раннер | Vitest |
| unit test | модульный тест | одна функция, пайп, сервис или компонент |
| end-to-end (e2e) test | сквозной тест (e2e) | всё приложение в настоящем браузере |
| test pyramid | пирамида тестов | много модульных, меньше интеграционных, мало сквозных |
| testing module | тестовый модуль | то, что настраивает `TestBed.configureTestingModule` |
| test bed | стенд | `TestBed`: маленькое приложение для теста со своим инжектором |
| integration test | интеграционный тест | несколько частей вместе: компонент с шаблоном и сервисами, маршруты с гардами |
| fake backend | поддельный сервер | `provideHttpClientTesting` + `HttpTestingController` |
| auto change detection | автообнаружение изменений | `autoDetect` фикстуры: в зонлесс — включено |
| code coverage | покрытие | `ng test --coverage`: какие строки выполнялись в тестах |
| fixture | фикстура | `ComponentFixture`: компонент, созданный тестом, и управление им |
| test double | тестовый двойник | общее название подмен: заглушка, шпион, подделка |
| mock / stub / fake | подмена, заглушка, подделка | объект вместо настоящей зависимости |
| spy | шпион | `vi.fn()`, `vi.spyOn`: запоминает вызовы |
| unhandled error | ошибка вне тестов | исключение или отклонённый промис, который никто не обработал |
| stable (application) | стабильное приложение | нет ожидающих задач (`PendingTasks`): `whenStable()` |
| harness | обвязка (harness) | `RouterTestingHarness` |
| build | сборка | |
| bundle | бандл | |
| tree-shaking | удаление неиспользуемого кода (tree-shaking) | |
| SSR | серверный рендеринг (SSR) | |
| hydration | гидратация | |
| prerendering | пререндеринг | |

## Магазин «Ход конём»

| English | Русский | Комментарий |
|---|---|---|
| catalog | каталог | |
| game card | карточка игры | `GameCard` |
| cart | корзина | `CartStore` |
| cart item | позиция корзины | |
| checkout | оформление заказа | |
| order | заказ | |
| promo code | промокод | |
| in stock | в наличии | |
| wishlist / favorites | избранное | |
| admin panel | админка | |
| draft | черновик (игры) | `GameDraft`: данные формы админки, числа — `number \| null` |
| change log | журнал изменений | `AdminGames.changes` на сводке админки |
