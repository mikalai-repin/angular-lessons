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
| directive | директива | |
| attribute directive | директива атрибута | |
| structural directive | структурная директива | только в `::: legacy` |
| host directive | хост-директива | `hostDirectives` |
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
| query | запрос (к представлению) | `viewChild()` |
| view | представление | |
| view tree | дерево представлений | |
| component tree | дерево компонентов | |
| lifecycle hook | хук жизненного цикла | |
| render | отрисовка, рендер | |
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
| side effect | побочный эффект | действие за пределами сигналов: консоль, `localStorage`, DOM |
| resource | ресурс | `resource`, `httpResource` |
| change detection | обнаружение изменений | |
| zoneless | зонлесс (без zone.js) | |
| dirty | «грязный», помеченный на проверку | |
| observable | Observable, поток | имя класса не переводим |
| subscription | подписка | |
| operator | оператор | RxJS |
| stream | поток | |

## Внедрение зависимостей

| English | Русский | Комментарий |
|---|---|---|
| dependency injection, DI | внедрение зависимостей, DI | |
| service | сервис | |
| injector | инжектор | |
| injection context | контекст внедрения | |
| injection token | токен внедрения | `InjectionToken` |
| root injector | корневой инжектор | |
| environment injector | инжектор окружения | |
| element injector | инжектор элемента | |
| store | хранилище | `CartStore` |

## Роутинг и данные

| English | Русский | Комментарий |
|---|---|---|
| router | роутер | |
| route | маршрут | |
| routing | роутинг, маршрутизация | «роутинг» в тексте, «маршрут» для одного пути |
| route parameter | параметр маршрута | `:id` |
| query parameter | query-параметр | `?q=` |
| router outlet | место вывода маршрута, `router-outlet` | |
| lazy loading | ленивая загрузка | |
| guard | гард | `CanActivateFn` |
| resolver | резолвер | |
| navigation | навигация | |
| deep link | глубокая ссылка | |
| backend | бэкенд | «учебный бэкенд» |
| request / response | запрос / ответ | |
| interceptor | интерцептор | |
| endpoint | адрес API | |
| authentication / authorization | вход (аутентификация) / права доступа (авторизация) | в тексте чаще «вход» и «права» |
| session | сессия | вошёл ли пользователь; восстанавливается после перезагрузки |
| access token / refresh token | токен доступа / refresh-токен | |
| role | роль | `user`, `admin` |
| open redirect | открытый редирект | уязвимость при возврате по `returnUrl` |

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
| form | форма | |
| field | поле | |
| form model | модель формы | сигнал с данными |
| field tree | дерево полей | `FieldTree` |
| validation | валидация, проверка | |
| validator | валидатор | |
| async validation | асинхронная проверка | |
| touched / dirty | «тронуто» / изменено | состояния поля |
| submit | отправка | |
| schema | схема | |
| reactive forms | реактивные формы | `FormGroup` |
| template-driven forms | шаблонные формы | `ngModel` |

## Тесты и инструменты

| English | Русский | Комментарий |
|---|---|---|
| test | тест | |
| test runner | тест-раннер | |
| fixture | фикстура | `ComponentFixture` |
| mock / stub | подмена, заглушка | |
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
