---
title: Подмена зависимостей
preview: tests
focus: shared/game-card/game-card.spec.ts
api: [useValue, vi.fn, toHaveBeenCalledWith, expect.any, toHaveBeenCalledTimes]
---

Осталась главная кнопка карточки — «В корзину». С главы 15 она делает две вещи: кладёт игру в корзину и запускает полёт обложки в шапку. Напишем тест — и посмотрим, что ему мешает.

## Настоящие зависимости в тесте

```ts
it('«В корзину» кладёт игру в корзину', async () => {
  card.querySelector<HTMLButtonElement>('.actions .button')?.click();
  await fixture.whenStable();
  expect(TestBed.inject(CartStore).count()).toBe(1);
});
```

`TestBed.inject(CartStore)` вернёт ту же корзину, что внедрила карточка: в стенде она одна, как в магазине. В превью тест проходит. В проекте Angular CLI сам тест тоже ✓, а прогон — неудачный:

```text
⎯⎯⎯⎯⎯ Uncaught Exception ⎯⎯⎯⎯⎯
TypeError: matchMedia is not a function
 ❯ _FlyToCart.launch src/app/core/fly-to-cart.ts:23:7
 ❯ _GameCard.addToCart src/app/shared/game-card/game-card.ts:78:20
```

Обработчик щелчка упал на полпути: `cart.add` успел выполниться — поэтому в корзине 1, — а `flyToCart.launch` бросил исключение. Его никто не поймал, и Vitest показал его среди ошибок вне тестов.

`ng test` по умолчанию выполняет тесты не в браузере, а в Node — с **jsdom**, программной имитацией DOM. В ней есть элементы и события, но нет многого из того, что умеет браузер: `matchMedia`, раскладки страницы (`getBoundingClientRect` возвращает нули), `IntersectionObserver`. А `FlyToCart.launch` спрашивает `matchMedia('(prefers-reduced-motion: reduce)')` и замеряет картинку.

Можно включить в `ng test` настоящий браузер (об этом — в последнем шаге). Но здесь есть вопрос важнее: **что мы тестируем?** Карточку. Как летит обложка — забота `FlyToCart` и `FlyingCovers`. Карточке достаточно попросить полёт с правильными данными. Значит, в тесте карточки настоящий полёт не нужен — нужна **подделка**, которая запомнит, о чём её попросили.

## Подмена через DI

Карточка не создаёт `FlyToCart` сама, а просит у DI: `inject(FlyToCart)`. Что она получит, решает конфигурация — глава 8 обещала, что так подменяют сервисы для тестов. Вот и подменим:

```ts shared/game-card/game-card.spec.ts {1-2,6,10-11}
// Подделка полёта обложки: вместо анимации — шпион, который запоминает вызовы
let flyToCart: Pick<FlyToCart, 'launch'>;

beforeEach(async () => {
  localStorage.clear();
  flyToCart = { launch: vi.fn() };
  await TestBed.configureTestingModule({
    imports: [GameCard],
    providers: [
      provideRouter([]),
      { provide: FlyToCart, useValue: flyToCart },
    ],
  }).compileComponents();
  // …
});
```

- **`{ provide: FlyToCart, useValue: flyToCart }`** — провайдер из главы 8: кто попросит `FlyToCart`, получит наш объект. Провайдер тестового модуля важнее `@Service()`, как провайдер в `appConfig`.
- **`vi.fn()`** — **шпион**: функция, которая ничего не делает, но запоминает каждый вызов и его аргументы. `vi` — глобальный объект Vitest с инструментами для таких подмен.
- **`Pick<FlyToCart, 'launch'>`** — тип подделки: «то же, что `FlyToCart`, но только метод `launch`». TypeScript проверит, что метод назван правильно и принимает то, что нужно. `useValue` в типах — `any` (глава 8), так что без своего типа опечатку не заметил бы никто.

Подделок много видов, и названия у них разные: заглушка, шпион, подделка. Общее название — **тестовые двойники**: объекты, которые стоят в тесте на месте настоящей зависимости.

## Что спросить у шпиона

```ts
it('«В корзину» кладёт игру и запускает полёт обложки', async () => {
  const button = card.querySelector<HTMLButtonElement>(
    '.actions .button',
  );
  button?.click();
  await fixture.whenStable();
  expect(TestBed.inject(CartStore).count()).toBe(1);
  expect(flyToCart.launch).toHaveBeenCalledWith(
    '/assets/covers/treasure-island.svg',
    expect.any(HTMLImageElement),
  );
});
```

- **`toHaveBeenCalledWith(…)`** — шпиона вызвали с такими аргументами. Первый — адрес обложки игры (у `fakeGame()` он такой).
- **`expect.any(HTMLImageElement)`** — «любой объект этого класса». Какой именно `<img>` — неважно, важно, что карточка отдала картинку, а не что-то другое.
- **`toHaveBeenCalledTimes(n)`** — сколько раз вызвали.

## Настройки — тоже зависимость

Тест «показывает название и остаток» ждёт «Осталось 2 шт.». Это верно, пока в магазине `fewLeft: 5`. Поменяют порог на 1 — карточка правильно напишет «В наличии», а тест упадёт, хотя карточка не сломалась. Тест зависит от настроек магазина, которые к карточке не относятся.

Настройки — токен `SHOP_CONFIG`, их тоже подменяет провайдер:

```ts
// Настройки магазина для теста: свои, чтобы тест не зависел от того, что поменяют в магазине
const CONFIG: ShopConfig = {
  freeDeliveryFrom: 5000,
  deliveryPrice: 390,
  fewLeft: 3,
  hitRating: 4.8,
  pageSize: 6,
  priorityCovers: 6,
};
```

```ts
{ provide: SHOP_CONFIG, useValue: CONFIG },
```

Теперь порог «мало на складе» — часть теста, и следующий тест читает его оттуда же: `fakeGame({ inStock: CONFIG.fewLeft + 1 })` — «В наличии».

::: task
1. В `game-card.spec.ts` подмените `FlyToCart` шпионом и `SHOP_CONFIG` — своими настройками с `fewLeft: 3`, как выше.
2. Тест «много на складе — „В наличии“»: игра с остатком на 1 больше порога.
3. Тест «„В корзину“ кладёт игру и запускает полёт обложки»: в корзине 1 шт., шпион вызван с адресом обложки и картинкой, в карточке — «В корзине: 1 шт.» (`.in-cart`).
4. Тест «всё со склада в корзине — кнопка неактивна»: два щелчка по «В корзину» при `inStock: 2` — «Все 2 шт. в корзине», кнопка `disabled`, шпион вызван 2 раза.
:::

## Что получилось

У `GameCard` шесть ✓, и тесты больше не знают ни про анимацию, ни про `matchMedia`: в `ng test` с jsdom они проходят так же, как в превью. Корзина — настоящая: проверять, что игра попала в корзину и карточка это показала, — работа теста карточки.

## Эксперименты

**Без подмены.** Уберите `{ provide: FlyToCart, useValue: flyToCart }`. Карточка получила настоящий `FlyToCart` — в превью он отработал без ошибок, — а тесты со шпионом упали: «„В корзину“ кладёт игру…» — `expected "vi.fn()" to be called with arguments: [ …(2) ]` и `Number of calls: 0`, «всё со склада в корзине…» — `expected "vi.fn()" to be called 2 times, but got 0 times`. Шпион остался в тесте, но карточке его никто не дал. Верните провайдер.

**Шпион на настоящем объекте.** Вместо подделки можно следить за методом настоящего сервиса:

```ts
const launch = vi
  .spyOn(TestBed.inject(FlyToCart), 'launch')
  .mockImplementation(() => {});
```

`vi.spyOn` заменяет метод объекта шпионом, а `mockImplementation` — тем, что шпион делает вместо настоящего метода (здесь — ничего). Без `mockImplementation` шпион вызвал бы и настоящий `launch`. Так удобно, когда у сервиса много методов, а подменить нужно один.

## Что подменять, а что нет

Подменяйте то, что тесту мешает или к нему не относится: сеть, анимации, время, браузерные API, тяжёлые соседние сервисы. Не подменяйте то, что проверяете: если карточка показывает, сколько игр в корзине, пусть в тесте будет настоящая корзина. Тест, где подменено всё, проверяет только то, что код вызывает подделки, — и пропустит ошибку на стыке настоящих частей.

::: legacy Вы встретите в старом коде: Jasmine-шпионы
С Karma и Jasmine подделки создают `jasmine.createSpyObj('FlyToCart', ['launch'])`, а следят за методом — `spyOn(service, 'launch').and.callFake(() => {})`. Проверки похожи: `expect(spy).toHaveBeenCalledWith(…)`.
:::
