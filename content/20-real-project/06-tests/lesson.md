---
title: Тесты в проекте
noSolution: true
focus: core/cart-store.spec.ts
api: [ng test, '--watch', '--coverage', '--browsers', '@vitest/coverage-v8']
---

В главе 16 мы написали тесты магазина в превью и обещали, что они без изменений заработают в проекте Angular CLI. Проверим. Как устроен `ng test` изнутри — сборка AOT, Vitest, jsdom, настройка `TestBed`, — мы разобрали в шаге 16.9. Здесь — практика: запуск, режимы, покрытие, браузер.

## `ng test`

Тесты приехали вместе с магазином: файлы `*.spec.ts` лежат рядом с кодом. Цель `test` в `angular.json` создал ещё `ng new` (сборщик `@angular/build:unit-test`), так что запускаем:

```bash
ng test
```

```text
 Test Files  11 passed (11)
      Tests  46 passed (46)
   Duration  1.38s
```

Все 46 тестов из 11 файлов прошли — без единой правки. После вывода команда не завершилась: в терминале `ng test` работает в **режиме наблюдения** — меняете код или тест, сохраняете, и Vitest перезапускает затронутые тесты. Выход — Ctrl+C. Режим наблюдения по умолчанию включён в интерактивном терминале и выключен, например, в CI; явно — `ng test --watch=false`.

Названия тестов видно с подробным выводом:

```bash
ng test --watch=false --reporters=verbose
```

```text
 ✓  hod-konem  src/app/core/cart-store.spec.ts > CartStore > новая корзина пуста 14ms
 ✓  hod-konem  src/app/core/cart-store.spec.ts > CartStore > считает штуки и сумму 2ms
 ✓  hod-konem  src/app/core/cart-store.spec.ts > CartStore > не кладёт больше, чем есть на складе 1ms
 …
```

## Тест падает

**Эксперимент.** Сломаем правило склада в `core/cart-store.ts` — разрешим положить на одну штуку больше, чем есть:

```ts core/cart-store.ts
const available = (game: Game): number =>
  game.inStock - quantityOf(game) + 1;
```

```text
 FAIL   hod-konem  src/app/core/cart-store.spec.ts > CartStore > не кладёт больше, чем есть на складе
AssertionError: expected 2 to be 1 // Object.is equality

 ❯ src/app/core/cart-store.spec.ts:33:35
     31|     cart.add(game);
     32|     cart.add(game);
     33|     expect(cart.quantityOf(game)).toBe(1);
       |                                   ^

 Test Files  2 failed | 9 passed (11)
      Tests  3 failed | 43 passed (46)
```

Упали три теста в двух файлах: тест `CartStore` и два теста `GameCard` — «Нет в наличии» с неактивной кнопкой и «Все 2 шт. в корзине». Одно правило, три проверки с разных сторон: так тесты и должны работать. Верните строку.

## Покрытие

Какой код тесты вообще выполняют? Это показывает **покрытие** (coverage):

```bash
ng test --watch=false --coverage
```

В первый раз команда откажется работать:

```text
The following packages are required but were not found:
  - Code coverage requires either "@vitest/coverage-v8" or
    "@vitest/coverage-istanbul" to be installed.
```

Ставим пакет той же версии, что Vitest в проекте (`npm ls vitest` покажет её; у нас 5.0.5), и запускаем снова:

```bash
npm install -D @vitest/coverage-v8@5.0.5
ng test --watch=false --coverage
```

```text
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
All files          |   51.94 |    58.17 |   50.18 |   53.29 |
  cart-store.ts    |   72.83 |    53.06 |    70.9 |   72.15 | …
  …
```

Половина кода магазина выполняется в тестах. В таблице есть и шаблоны — `.html`: тесты компонентов отрисовывают их, и покрытие видит, какие ветки `@if` сработали. Подробный отчёт в HTML — в папке `coverage/` (она уже в `.gitignore`). Откройте `coverage/hod-konem/index.html` в браузере: непокрытые строки подсвечены.

Покрытие — не оценка качества тестов: строка может выполниться, а проверки её результата не будет. Но непокрытые места отвечают на вопрос «что сломается незаметно».

## В браузере

По умолчанию тесты работают в Node.js с **jsdom** — имитацией DOM. В главе 16 мы видели, где она кончается: нет `matchMedia`, `IntersectionObserver`, раскладки. Превью курса запускало тесты в настоящем Chromium. В проекте так тоже можно:

```bash
ng test --watch=false --browsers=chromiumHeadless
```

```text
  - The "browsers" option requires either "@vitest/browser-playwright",
    "@vitest/browser-webdriverio", or "@vitest/browser-preview" to be installed.
```

```bash
npm install -D @vitest/browser-playwright@5.0.5 playwright
npx playwright install chromium
ng test --watch=false --browsers=chromiumHeadless
```

```text
 Test Files  11 passed (11)
      Tests  46 passed (46)
   Duration  2.86s
```

Те же 46 тестов в браузере без окна (`Headless`). Медленнее, но честнее для кода, который трогает DOM всерьёз. Многие проекты держат быстрый jsdom для каждого сохранения и браузер — для CI.

::: warning
Иногда в выводе тестов появится `stderr` с текстом `Аналитика недоступна: RuntimeError: NG0205: Injector has already been destroyed`. Это след шага 5: раньше эту ошибку глушил пустой `.catch(() => {})`, теперь она видна. Тест добавил игру в корзину, `CartStore` начал загружать модуль аналитики, а тест закончился раньше — `TestBed` уже разрушил инжектор (глава 16, шаг 3). Сколько раз это случится, зависит от времени: в одном нашем запуске — два раза, в шести следующих — ни разу. Тесты при этом проходят: ошибка вне тестов.
:::

::: tip
Тесты, проверки типов и линтер легко объединить в одну команду для CI — скриптом в `package.json`, например `"ci": "ng lint && ng test --watch=false && ng build"`. Каждая команда при ошибке возвращает ненулевой код, и `&&` остановит цепочку.
:::

::: deep Под капотом: что делает `--browsers`
Сборщик `unit-test` собирает тесты так же, как без флага, но настраивает Vitest на режим браузера: провайдер `@vitest/browser-playwright` запускает через Playwright настоящий Chromium, а файлы тестов загружаются в страницу. Окончание `Headless` в имени означает «без окна».
:::
