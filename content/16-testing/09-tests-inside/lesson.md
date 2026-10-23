---
title: 'Под капотом: как запускаются тесты'
noSolution: true
preview: tests
focus: core/cart-store.spec.ts
api: [ng test, '@angular/build:unit-test', initTestEnvironment, jsdom, providersFile]
---

Тесты главы написаны так, что без изменений работают и в превью, и в проекте Angular CLI — это проверено. Но устроены эти два места по-разному, и кое-где разница видна: мы встречали её в шагах 3–7. Соберём всё вместе: что делает `ng test`, как готовится стенд и чем превью отличается от настоящего проекта. Кода в шаге нет.

## Путь `ng test`

```text
ng test
  │ angular.json: test → @angular/build:unit-test
  ▼
сборка: *.spec.ts + код приложения
  │ компилятор Angular — AOT, как ng build
  ▼
Vitest: файлы по нескольким процессам
  │ перед каждым файлом — настройка TestBed
  ▼
тесты: Node + jsdom (по умолчанию)
       или браузер (--browsers)
```

1. **Сборщик.** `ng new` прописывает в `angular.json` цель `test` со сборщиком `@angular/build:unit-test`. Он находит файлы тестов (по умолчанию `**/*.spec.ts` и `**/*.test.ts`) и собирает их вместе с кодом приложения.
2. **AOT.** Тесты компилируются заранее, как приложение в `ng build`. Ошибка в шаблоне — ошибка сборки.
3. **Vitest.** Готовые файлы получает Vitest. Глобальные `describe`, `it`, `expect`, `vi` — его настройка `globals`. Файлы распределяются по нескольким процессам: так быстрее.
4. **Окружение.** По умолчанию — Node с jsdom. С `--browsers=chromiumHeadless` (нужны пакеты `@vitest/browser-playwright` и `playwright`) — настоящий браузер без окна.

## Настройка стенда

Перед каждым файлом тестов сборщик выполняет свой файл настройки. Главное в нём:

```ts
beforeEach(getCleanupHook(false));
afterEach(getCleanupHook(true));

getTestBed().initTestEnvironment(
  [BrowserTestingModule, TestModule],
  platformBrowserTesting(),
  {
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true,
  },
);
```

- **`initTestEnvironment`** — один раз на прогон: платформа для тестов (`platformBrowserTesting`) и модули, общие для всех стендов. `BrowserTestingModule` даёт браузерные сервисы и подделки — например, поддельную навигацию: поэтому тесты маршрутов не меняют адресную строку (шаг 7).
- **`getCleanupHook(true)`** в `afterEach` — разобрать стенд после каждого теста: `TestBed.resetTestingModule()` уничтожает фикстуры, инжектор и всё, что он создал. Это тот самый хук, который пропускается, когда упал ваш `afterEach`, — отсюда цепная реакция из шага 6.
- **`errorOnUnknownElements`** и **`errorOnUnknownProperties`** — неизвестный элемент или свойство в шаблоне — ошибка, а не предупреждение. Строгий режим включается вместе с `configureTestingModule`.

Превью готовит стенд так же — это повторено по исходникам сборщика. Поэтому тесты курса переносятся в проект без правок.

## Чем превью отличается от `ng test`

| | Превью | `ng test` |
|---|---|---|
| Компиляция | JIT в браузере | AOT при сборке |
| Окружение | Chromium | jsdom (или браузер с `--browsers`) |
| Файлы | друг за другом в одном окне | в нескольких процессах |
| Ошибки вне тестов | ждёт простоя браузера в конце | что успело случиться до конца прогона |

Что из этого видно на практике:

**Ошибка в шаблоне.** Компонент с опечаткой `<app-nope />` в шаблоне. В превью падает один тест — тот, что создал компонент:

```text
Error: NG0304: 'app-nope' is not a known element (used in the 'Broken' component template)
```

В `ng test` не запустится **ни один** тест: сборка остановится раньше.

```text
✘ [ERROR] NG8001: 'app-nope' is not a known element
```

Если тест не вызывал `configureTestingModule`, в превью `NG0304` будет только в консоли, а тест пройдёт: строгий режим не включился. AOT такой разницы не делает.

**jsdom — не браузер.** Нет `matchMedia`, `IntersectionObserver`, раскладки: размеры элементов — нули. Шаг 5 показал, как тест карточки споткнулся о `matchMedia`. Выхода два: подменить зависимость (так мы и сделали — и это правильно для теста карточки) или запускать тесты в браузере (`--browsers`). Второе медленнее, но иногда нужно — например, для директивы `InView` с `IntersectionObserver`.

**Ошибки, которые зависят от времени.** `NG0205` из шага 3 в превью видна всегда, а в `ng test` — как повезёт: Vitest не ждёт загрузки модуля, который никто не ждёт. Превью строже — и это хорошо.

## Время в зонлесс-приложении

В старых тестах Angular время подделывали функциями `fakeAsync` и `tick` из `@angular/core/testing`. Они работают поверх zone.js — а магазин зонлесс. В превью попытка вызвать `fakeAsync` роняет весь файл ещё при сборе тестов:

```text
zone-testing.js is needed for the fakeAsync() test helper but could not be found.
Please make sure that your environment includes zone.js/testing
```

В зонлесс-приложении с Vitest для таймеров есть свои инструменты: `vi.useFakeTimers()` подменяет `setTimeout`, `setInterval` и `Date`, `vi.advanceTimersByTime(мс)` проматывает время, `vi.useRealTimers()` возвращает настоящие. А для «подождать, пока станет правдой» — `vi.waitFor` из практикума.

## Что ещё умеет `ng test`

- `ng test --include=src/app/core` — только тесты из папки или файла.
- `ng test --coverage` — **покрытие**: какие строки кода выполнялись в тестах. Строка, которую не выполнил ни один тест, — кандидат на тест. Но 100 % покрытия не значит «всё проверено»: строка могла выполниться, а её результат никто не проверил.
- `providersFile` в `angular.json` — файл с провайдерами для **всех** тестов. Туда удобно положить то, что нужно почти каждому тесту, — например, `LOCALE_ID` и валюту (а в самом файле вызвать `registerLocaleData(localeRu)`): тогда «$2,390» из шага 7 станет «2 390 ₽» во всех тестах.
- **Сквозные тесты** CLI не ставит. `ng e2e` в новом проекте отвечает: «Cannot find "e2e" target for the specified project» — и предлагает пакеты: Playwright, Cypress, Nightwatch, WebdriverIO, Puppeteer (`ng add …`). Они открывают настоящий браузер и проверяют магазин целиком, как покупатель.

Свой проект Angular CLI с этими тестами мы соберём в главе 20.

::: legacy Вы встретите в старом коде: Karma, zone.js и fakeAsync
В проектах на Karma с Jasmine и zone.js тесты компонентов выглядят так:

```ts
beforeEach(() => {
  fixture = TestBed.createComponent(GameCard);
  fixture.detectChanges();
});

it('показывает остаток через секунду', fakeAsync(() => {
  component.start();
  tick(1000);
  fixture.detectChanges();
  expect(…);
}));
```

`fixture.detectChanges()` после каждого действия — без зонлесс-автообнаружения фикстура сама экран не обновляла. `fakeAsync` и `tick` подменяли время внутри зоны. Такие тесты работают, пока в проекте есть zone.js; в зонлесс-проекте их переписывают на `whenStable` и `vi.useFakeTimers`.
:::
