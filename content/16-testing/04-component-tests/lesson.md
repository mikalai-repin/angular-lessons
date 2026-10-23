---
title: Тест компонента
startFrom: custom
preview: tests
focus: shared/game-card/game-card.spec.ts
api: [TestBed.createComponent, ComponentFixture, setInput, whenStable, nativeElement]
---

Компонент — это класс **и** шаблон. Можно создать `GameCard` через `new` и вызывать методы, но так не проверить главного: что покупатель видит на экране и что происходит, когда он щёлкает. Тест компонента делает то же, что покупатель: показывает карточку, читает текст, нажимает кнопки.

## Что изменилось в коде

`shared/game-card/game-card.spec.ts` — заготовка набора `GameCard` без тестов. В отчёте она уже красная:

```text
✗ No test found in suite shared/game-card/game-card.spec.ts
  GameCard
    ✗ No test found in suite GameCard
```

Vitest считает ошибкой набор, в котором нет ни одного теста: скорее всего, тесты забыли написать или не туда вложили.

## Карточка на стенде

```ts shared/game-card/game-card.spec.ts
describe('GameCard', () => {
  let fixture: ComponentFixture<GameCard>;
  let card: HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [GameCard],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(GameCard);
    fixture.componentRef.setInput(
      'game',
      fakeGame({ title: 'Ночной экспресс', inStock: 2 }),
    );
    await fixture.whenStable();
    card = fixture.nativeElement;
  });
});
```

Начало — как у заготовки, которую создаёт `ng generate component`, плюс то, что нужно карточке: роутер, вход и чистое хранилище. Разберём по строкам.

- **`imports: [GameCard]`** — компонент в тестовом модуле, как в `imports` родителя. **`compileComponents()`** дозагружает шаблоны и стили компонентов, если их ещё не скомпилировали. В превью и в проекте CLI их компилирует сборка, и тест работает и без этого вызова. Заготовка CLI его пишет — оставим, как в ней.
- **`provideRouter([])`** — у карточки ссылка `routerLink` на страницу игры, а ей нужен роутер. Маршрутов не нужно: щёлкать по ссылке мы не будем.
- **`TestBed.createComponent(GameCard)`** создаёт карточку и возвращает **фикстуру** — `ComponentFixture<GameCard>`. Это пульт управления компонентом в тесте: `componentInstance` — экземпляр класса, `componentRef` — ссылка на компонент, `nativeElement` — его хост-элемент в DOM.
- **`fixture.componentRef.setInput('game', …)`** задаёт вход — то же, что делает родитель привязкой `[game]="…"`. Вход у карточки обязательный: без него Angular упадёт при первой отрисовке.
- **`await fixture.whenStable()`** — дождаться, пока Angular отрисует карточку. Об этом — ниже.
- **`fixture.nativeElement`** — хост-элемент карточки, в нём весь её шаблон. Ищем внутри обычным `querySelector`.

Карточка на странице — `<app-game-card>`, а на стенде — `<div id="root0">` (номер растёт с каждым тестом: `root1`, `root2`…): `TestBed` создаёт хост из `div`. Хост-привязки работают и на нём: у `div` будут `role="article"` и класс `sold-out`.

## `whenStable`: дождаться отрисовки

В зонлесс-приложении экран обновляет планировщик Angular: что-то изменилось — он запланирует обновление на ближайший кадр. Фикстура подключена к тому же планировщику: задали вход, щёлкнули кнопку — Angular запланировал обновление, как в магазине. Но тест — синхронный код, и сам он кадра не ждёт.

**`fixture.whenStable()`** возвращает промис, который выполнится, когда у приложения не останется ждущих задач — **стабильного** состояния. Запланированное обновление — такая задача. В приложении такие задачи — ещё и запросы `HttpClient`, ресурсы и `@defer`; с поддельным сервером тестовые запросы стабильность не держат (шаг 6). Правило простое: что-то сделали с компонентом — `await fixture.whenStable()` и только потом смотрим в DOM.

## Тесты

```ts
it('показывает название и остаток', () => {
  const title = card.querySelector('.title');
  expect(title?.textContent).toContain('Ночной экспресс');
  const stock = card.querySelector('.stock');
  expect(stock?.textContent?.trim()).toBe('Осталось 2 шт.');
});

it('сердечко добавляет игру в избранное', async () => {
  const heart = card.querySelector<HTMLButtonElement>('.favorite');
  heart?.click();
  await fixture.whenStable();
  expect(heart?.textContent?.trim()).toBe('♥');
  expect(heart?.getAttribute('aria-pressed')).toBe('true');
});
```

- **`toContain`** — для строки: «содержит подстроку». В заголовке вокруг названия пробелы и переносы из шаблона, поэтому не `toBe`.
- **`trim()`** — отрезать те же пробелы, когда нужно точное совпадение.
- **`click()`** — настоящий щелчок DOM: срабатывает обработчик `(click)` из шаблона, как у покупателя.

Тест читает то, что видит покупатель: текст и атрибуты. Не поле `isFavorite` компонента, а сердечко на экране. Такой тест не сломается, если завтра мы перепишем класс по-другому, — сломается, только если покупатель увидит другое.

::: task
1. Напишите `beforeEach`, как выше: стенд с роутером, карточка с игрой «Ночной экспресс», 2 шт. на складе.
2. Тест «показывает название и остаток».
3. Тест «игра закончилась — „Нет в наличии“, кнопка неактивна»: задайте новый вход — игру с `inStock: 0`, дождитесь отрисовки и проверьте текст `.stock`, класс `sold-out` у хоста (`expect(card.classList).toContain('sold-out')`) и `disabled` у кнопки «В корзину» (`.actions .button`).
4. Тест «сердечко добавляет игру в избранное».
:::

## Что получилось

У `GameCard` три ✓. Вход можно менять посреди теста, как делает родитель: `setInput` с другой игрой, `whenStable` — и карточка показывает «Нет в наличии», хост получил класс, кнопка неактивна.

## Эксперименты

**Без `whenStable`.** Уберите `await fixture.whenStable()` после щелчка по сердечку. Тест падает: `expected '♡' to be '♥'`. Обработчик выполнился — избранное изменилось, представление помечено «грязным», — но отрисовки ещё не было. Верните строку.

**Без роутера.** Уберите `provideRouter([])`. Падают все тесты набора — ещё в `beforeEach`:

```text
ɵNotFound: NG0201: No provider found for `ActivatedRoute`. Source: DynamicTestModule.
```

`ɵNotFound` — внутреннее имя класса ошибки, суть — в `NG0201`: `RouterLink` внедряет `ActivatedRoute`, а провайдера нет. `DynamicTestModule` — тот самый тестовый модуль. Так выглядит почти каждая первая ошибка теста компонента: в стенде не хватает того, что в магазине давал `app.config.ts`.

**Без входа.** Уберите `setInput`: `NG0950: Input is required but no value is available yet.` — обязательный вход прочитали до того, как его задали. В `ng test` сообщение точнее: `Input "game" is required…` — сборка тестов там AOT, и компилятор знает имя входа.

## Как в настоящем проекте

`ng generate component` создаёт рядом заготовку с `imports`, `compileComponents`, `whenStable` и тестом `should create`: `expect(component).toBeTruthy()`. Для `GameCard` она упала бы — нет ни входа, ни роутера. Заготовка — только начало: настоящий тест знает, что нужно компоненту, и проверяет, что видит покупатель.

::: deep Под капотом: фикстура в зонлесс-приложении
Фикстура регистрирует представление компонента в `ApplicationRef` стенда. В зонлесс-приложении у неё по умолчанию включено **автообнаружение** изменений (`autoDetect`): обновления идут через тот же планировщик, что в приложении. Выключить его нельзя — `autoDetectChanges(false)` бросает `Cannot set autoDetect to false with zoneless change detection.` Есть и синхронный путь — `fixture.detectChanges()`: это `ApplicationRef.tick()` со всеми тестовыми представлениями, обновление прямо сейчас. Но `whenStable()` честнее: ждёт не только отрисовку, но и всё, что приложение считает незавершённым, — `PendingTasks` из главы 11. Поэтому заготовки CLI для зонлесс-приложений пишут `await fixture.whenStable()`, а не `detectChanges()`.

Хост из `div` — настройка `TestBed`: с `configureTestingModule({ …, inferTagName: true })` хост получит тег по селектору — `<app-game-card>`.
:::
