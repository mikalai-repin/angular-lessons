---
title: Тест пайпа
startFrom: custom
preview: tests
focus: shared/price-pipe.spec.ts
api: [TestBed, TestBed.configureTestingModule, TestBed.runInInjectionContext, beforeEach]
---

`plural` — обычная функция: тест вызвал её и сравнил результат. Пайпы магазина — классы с методом `transform`. Какие-то из них — та же функция в обёртке, а какие-то внедряют зависимости. Для вторых тесту понадобится Angular.

## Что изменилось в коде

Два новых файла тестов: `shared/duration-pipe.spec.ts` с одним тестом и `shared/price-pipe.spec.ts`, который пока падает. Сейчас разберёмся почему.

## Пайп без зависимостей

`DurationPipe` из главы 7 ничего не внедряет: число минут на входе, строка на выходе. Значит, Angular для теста не нужен — создаём экземпляр сами и вызываем `transform`:

```ts shared/duration-pipe.spec.ts
import { DurationPipe } from './duration-pipe';

describe('DurationPipe', () => {
  const pipe = new DurationPipe();

  it('часы и минуты', () => {
    expect(pipe.transform(90)).toBe('1 ч 30 мин');
  });
});
```

Экземпляр один на весь набор: у пайпа нет состояния, и тесты не могут помешать друг другу.

## Пайп с зависимостями

`PricePipe` устроен иначе. Локаль и валюту он берёт у DI — в полях класса:

```ts shared/price-pipe.ts
private readonly locale = inject(LOCALE_ID);
private readonly currency = inject(DEFAULT_CURRENCY_CODE);
```

Тест в старте делает то же, что с `DurationPipe`, — `new PricePipe()`. В отчёте:

```text
Error: NG0203: The `InjectionToken LocaleId` token injection failed. `inject()` function must be called from an injection context such as a constructor, a factory function, a field initializer, or a function used with `runInInjectionContext`.
❯ shared/price-pipe.ts:17:29
❯ shared/price-pipe.spec.ts:6:18
```

Два места: строка `inject` в пайпе, где случилась ошибка, и строка теста, откуда её вызвали.

Знакомая ошибка из главы 8: `inject()` работает только в контексте внедрения. В приложении пайп создаёт Angular, когда отрисовывает шаблон, — и контекст есть. А в тесте мы создали его сами, вне всякого Angular. Спросить `LOCALE_ID` не у кого: в тесте нет ни приложения, ни инжектора.

## `TestBed`

**`TestBed`** — Angular для тестов. Это испытательный стенд: маленькое приложение без страницы, со своим инжектором. Тест настраивает его, а потом просит у него сервисы, создаёт компоненты или выполняет код в его контексте внедрения. `TestBed` импортируется из `@angular/core/testing`.

Попробуем создать пайп в контексте внедрения стенда:

```ts
const pipe = TestBed.runInInjectionContext(() => new PricePipe());
```

`runInInjectionContext` из главы 8 выполняет функцию так, будто её вызвал DI. Ошибки нет, но тест по-прежнему падает:

```text
AssertionError: expected '$1,990' to be '1 990 ₽' // Object.is equality
```

Доллары и запятая. У теста нет `app.config.ts`: `LOCALE_ID` и `DEFAULT_CURRENCY_CODE` получили значения по умолчанию — `'en-US'` и `'USD'`, как у приложения без настроек в главе 7. Всё, что приложение получает от своей конфигурации, тест должен дать стенду сам:

```ts shared/price-pipe.spec.ts {6-17}
describe('PricePipe', () => {
  let pipe: PricePipe;

  beforeEach(() => {
    registerLocaleData(localeRu);
    TestBed.configureTestingModule({
      providers: [
        { provide: LOCALE_ID, useValue: 'ru' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'RUB' },
      ],
    });
    pipe = TestBed.runInInjectionContext(() => new PricePipe());
  });

  it('рубли без копеек, разряды через пробел', () => {
    expect(pipe.transform(1990)).toBe('1\u00a0990\u00a0₽');
  });
});
```

- **`TestBed.configureTestingModule({ providers })`** — конфигурация стенда: те же провайдеры, что в `appConfig.providers`. Её называют **тестовым модулем**: внутри Angular это действительно модуль, собранный для теста.
- **`registerLocaleData(localeRu)`** — правила русского языка, как в `app.config.ts`. Это не провайдер, а регистрация данных в общей таблице `@angular/common`.
- **`beforeEach`** — функция, которую раннер вызывает перед **каждым** тестом набора. Общая подготовка — в ней, а тесты остаются короткими. Есть и `afterEach` — после каждого теста, `beforeAll` и `afterAll` — один раз на набор.

После каждого теста стенд разбирается: инжектор уничтожается вместе со всем, что он создал. Поэтому `configureTestingModule` — в `beforeEach`, а не один раз на файл.

## Неразрывные пробелы

Теперь посмотрите на ожидаемое значение: `'1\u00a0990\u00a0₽'`. Почему не просто `'1 990 ₽'`? Напишите так и запустите:

```text
AssertionError: expected '1 990 ₽' to be '1 990 ₽' // Object.is equality
Expected: "1 990 ₽"
Received: "1 990 ₽"
```

Строки на вид одинаковые, но разные. Пайпы форматирования ставят между разрядами и перед «₽» **неразрывный** пробел (U+00A0), чтобы цена не разорвалась на две строки. В коде его не видно, поэтому в тесте пишем явно: `\u00a0`.

::: task
1. В `duration-pipe.spec.ts` допишите тесты: меньше часа (`45` → `'45 мин'`), ровно час (`60` → `'1 ч'`), длинный формат (`125` и `'long'` → `'2 часа 5 минут'`).
2. Почините `price-pipe.spec.ts`: пайп — в контексте внедрения `TestBed`, с локалью `ru` и валютой `RUB`, как в коде выше. Подготовку вынесите в `beforeEach`.
3. Добавьте тест «округляет до рубля»: `999.6` → `'1 000 ₽'` (с неразрывными пробелами).
:::

## Что получилось

В отчёте три файла и 11 ✓: пять у `plural`, четыре у `DurationPipe`, два у `PricePipe`. Тест округления показывает то, что легко пропустить глазами: формат `'1.0-0'` не отбрасывает копейки, а округляет — 999,60 ₽ становится «1 000 ₽».

## Эксперименты

**Порядок важен.** Поменяйте в `beforeEach` местами `configureTestingModule(…)` и строку с `runInInjectionContext`. Оба теста падают:

```text
Error: Cannot configure the test module when the test module has already been instantiated. Make sure you are not using `inject` before `TestBed.configureTestingModule`.
```

`runInInjectionContext` попросил у стенда инжектор — и стенд собрался с тем, что было на тот момент: без наших провайдеров. Менять собранный стенд нельзя. Сначала конфигурация, потом всё остальное. Верните порядок.

**Что генерирует CLI.** `ng generate pipe shared/price` создал бы рядом тест-заготовку:

```ts
it('create an instance', () => {
  const pipe = new PricePipe();
  expect(pipe).toBeTruthy();
});
```

Для `PricePipe` он падает с тем же `NG0203`: заготовка CLI рассчитана на пайп без зависимостей. Это начало теста, а не готовый тест — проверяет она только то, что объект создаётся.

::: deep Под капотом: TestBed и тестовый модуль
`TestBed` — объект с методами, который хранит один стенд на весь прогон. `configureTestingModule` только запоминает провайдеры и импорты. Сам стенд — модуль с ними и инжектор окружения — Angular собирает при первой просьбе: `inject`, `runInInjectionContext` или `createComponent`. После этого конфигурацию менять нельзя — это и показал опыт с порядком строк.

После каждого теста CLI вызывает `TestBed.resetTestingModule()`: стенд уничтожается (с `ngOnDestroy` и `DestroyRef` всего, что он создал), конфигурация забывается. Как это подключено — в последнем шаге главы.
:::
