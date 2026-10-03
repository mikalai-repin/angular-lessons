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
