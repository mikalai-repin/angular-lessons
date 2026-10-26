---
title: 'Практикум: хранилище, которое не падает'
startFrom: custom
focus: core/browser-storage.ts
api: [SafeStorage, 'implements Storage', SecurityError, QuotaExceededError, NG0200]
---

Последний практикум курса — перенести в «Ход конём» приём из angular.dev. В шаге 3 мы видели, что `LOCAL_STORAGE` сайта — не сам `localStorage`, а обёртка, у которой каждая операция в `try`/`catch`. Наш `BROWSER_STORAGE` из шага 20.7 отдаёт `localStorage` как есть. Посмотрим, что из этого выходит, и исправим.

## Что изменилось в коде

Код — магазин главы 20. В `core/browser-storage.ts` добавлен комментарий `TODO` с заданием.

## Опыт 1: данные сайтов запрещены

В Chrome можно запретить сайтам сохранять данные — тогда, как мы проверили в шаге 3, уже чтение `window.localStorage` бросает `SecurityError`. Изобразим такой браузер: вставьте в начало `main.ts`

```ts main.ts
// Опыт: данные сайтов запрещены — обращение к localStorage бросает исключение
Object.defineProperty(window, 'localStorage', {
  get() {
    throw new DOMException('Access is denied for this document.', 'SecurityError');
  },
});
```

Превью пустое, а в консоли:

```text
ERROR Error: NG0200: Circular dependency detected for `InjectionToken BROWSER_STORAGE`.
Error: NG0200: Circular dependency detected for `InjectionToken BROWSER_STORAGE`.
ERROR SecurityError: Access is denied for this document.
```

Магазин не запустился вовсе. Фабрика `BROWSER_STORAGE` читает `localStorage` и бросает исключение, а без токена не создаются `AuthStore`, корзина и избранное. Сообщение о **циклической зависимости** сбивает с толку: цикла нет. Почему так — во врезке ниже. Настоящая причина — в последней строке.

## Опыт 2: место кончилось

Замените вставку в `main.ts` другой: пусть хранилище читается, но каждая запись бросает `QuotaExceededError` — так ведёт себя `setItem`, когда место для сайта кончилось.

```ts main.ts
// Опыт: хранилище переполнено — каждая запись бросает исключение
Storage.prototype.setItem = function () {
  throw new DOMException('Хранилище переполнено', 'QuotaExceededError');
};
```

Магазин запустился, но уже при запуске в консоли две ошибки `ERROR QuotaExceededError: Хранилище переполнено`. «В корзину» — ещё одна, хотя счётчик в шапке растёт: корзина в памяти работает, не работает только сохранение. А войти не получится: сервер ответил `200`, но `AuthStore` не смог сохранить токены, исключение прервало вход, и форма пишет «Не удалось войти. Попробуйте ещё раз». Покупатель с переполненным хранилищем не может войти в магазин.

Уберите вставку из `main.ts`.

## Задание

::: task
Сделайте так, чтобы магазин работал без хранилища.

1. В `core/browser-storage.ts` напишите класс-обёртку над `localStorage`, как `LocalStorage` в [`shared-docs/providers/local-storage.ts`](https://github.com/angular/angular/blob/fb7711f/adev/shared-docs/providers/local-storage.ts) angular.dev. Он реализует интерфейс `Storage`: `length`, `getItem`, `setItem`, `removeItem`, `key`, `clear`.
2. Каждая операция — в `try`/`catch`. Обращение к `localStorage` — тоже внутри `try`: само чтение свойства может бросить. Не получилось — разумное значение: `null` для чтения, `0` для `length`, «ничего» для записи и удаления.
3. Фабрика `BROWSER_STORAGE` в браузере возвращает экземпляр обёртки, на сервере — по-прежнему `null`.
4. Когда хранилище работает, всё как раньше: корзина и вход переживают перезапуск ⟳.
:::

Проверьте оба опыта с решением: с запретом данных сайтов магазин запускается без ошибок, с переполненным хранилищем — вход проходит. Корзина и вход в этих случаях живут до перезагрузки страницы: сохранить их некуда.

Проверка «✓ Проверить» делает так: сначала убеждается, что в обычном браузере корзина по-прежнему сохраняется в `localStorage`; потом подменяет `getItem`, `setItem` и `removeItem` хранилища на бросающие `SecurityError` и проходит сценарий — «В корзину», вход, страница оформления (она читает черновик комментария), выход. Ни одна ошибка не должна дойти до обработчика ошибок. Опыт 1 — исключение при **чтении свойства** `localStorage` при запуске — проверка повторить не может: приложение к тому времени уже запущено. Его проверьте сами.

::: hint Подсказка 1: где менять
Только `core/browser-storage.ts`. Тип токена остаётся `InjectionToken<Storage | null>`: все, кто его внедряет, — `AuthStore`, `withStorage`, эффекты избранного, `Checkout` — ничего не заметят. Это и есть польза DI из шага 20.7: подменили зависимость в одном месте.
:::

::: hint Подсказка 2: каркас
```ts core/browser-storage.ts
class SafeStorage implements Storage {
  get length(): number {
    try {
      return localStorage.length;
    } catch {
      return 0;
    }
  }

  getItem(key: string): string | null {
    // так же: try — return localStorage.getItem(key), catch — return null
  }
  // setItem, removeItem, key, clear
}
```

Класс объявите выше токена: фабрика выполнится позже, при первом `inject`, но читать код сверху вниз проще.
:::

::: hint Подсказка 3: фабрика
```ts core/browser-storage.ts
factory: () =>
  isPlatformBrowser(inject(PLATFORM_ID))
    ? new SafeStorage()
    : null,
```
:::

::: deep Под капотом: откуда «циклическая зависимость»
Корневой инжектор хранит для каждого токена запись со значением. Перед тем как вызвать фабрику, `R3Injector.hydrate` ставит в запись метку `CIRCULAR`, а после — настоящее значение:

```js
if (record.value === CIRCULAR) {
  throw cyclicDependencyError(…);   // NG0200
} else if (record.value === NOT_YET) {
  record.value = CIRCULAR;
  record.value = record.factory(undefined, flags);
}
```

Метка нужна, чтобы поймать настоящий цикл: A внедряет B, B внедряет A — второе обращение к A застанет `CIRCULAR`. Но если фабрика бросила исключение, до второго присваивания дело не дошло: метка осталась. Первый, кто внедрил `BROWSER_STORAGE`, получил `SecurityError`. Следующий — `AuthStore` — увидел `CIRCULAR` и получил `NG0200`. Если в консоли `NG0200`, а цикла в коде нет, ищите в консоли другую ошибку: скорее всего, бросила фабрика.
:::

## Решение

```ts core/browser-storage.ts
// Обёртка над localStorage, которая никогда не бросает исключений (как LOCAL_STORAGE в angular.dev).
// Само обращение к localStorage бросает SecurityError, если данные сайтов запрещены,
// а setItem — QuotaExceededError, если место кончилось. Тогда магазин работает без хранилища:
// корзина и вход живут до перезагрузки страницы
class SafeStorage implements Storage {
  get length(): number {
    try {
      return localStorage.length;
    } catch {
      return 0;
    }
  }

  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Не сохранилось — данные останутся в памяти до перезагрузки
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Нечего удалять: хранилище недоступно
    }
  }

  key(index: number): string | null {
    try {
      return localStorage.key(index);
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch {
      // Нечего очищать: хранилище недоступно
    }
  }
}

// localStorage браузера в обёртке SafeStorage. На сервере (SSR, пререндеринг) хранилища нет — null:
// корзина, избранное и вход живут только в браузере покупателя
export const BROWSER_STORAGE = new InjectionToken<Storage | null>(
  'BROWSER_STORAGE',
  {
    providedIn: 'root',
    factory: () =>
      isPlatformBrowser(inject(PLATFORM_ID))
        ? new SafeStorage()
        : null,
  },
);
```

Пустые `catch` здесь — осознанное решение, а не заглушённая ошибка, как в шаге 20.5: магазин без хранилища — нормальный режим работы, и сообщать о нём в консоль на каждую запись незачем. Комментарий в каждом `catch` говорит читателю, что это не забыто. Обёртку с `try` вокруг каждой операции в angular.dev мы прочитали в шаге 3; там же `SearchHistory` на всякий случай оборачивает `setItem` ещё раз.

## Проверьте себя

::: task
1. Почему обращение к `localStorage` должно быть внутри `try`, а не в поле `private readonly storage = localStorage` обёртки?
2. Опыт 1 с решением: что покажет корзина после «В корзину» и после ⟳?
3. Почему в консоли опыта 1 до решения стоит `NG0200`, если циклической зависимости в коде нет?
:::

::: hint Ответы
1. Поле инициализируется при создании обёртки, то есть в фабрике токена. Если `localStorage` недоступен, исключение вылетит из фабрики — и приложение упадёт, как в опыте 1.
2. После «В корзину» — «В корзине: 1»: корзина в памяти работает. После ⟳ — снова пусто: сохранить корзину было некуда.
3. Инжектор помечает запись токена `CIRCULAR` перед вызовом фабрики. Фабрика бросила `SecurityError`, метка осталась, и следующее внедрение `BROWSER_STORAGE` приняло её за цикл.
:::

## Итоги главы

Мы прочитали код большого приложения на Angular, написанного не нами:

- **Карта проекта**: монорепозиторий, Angular того же коммита (`workspace:*`), Bazel поверх обычного сборщика CLI, библиотека `@angular/docs` внутри проекта; код написан на том Angular, которому учил курс, — 186 `inject()`, ни одного `NgModule` и `*ngIf`.
- **Маршруты из данных**: полторы тысячи страниц из данных меню и справочника; резолвер в маршруте, `withNavigationErrorHandler` и `RedirectCommand`, свои `TitleStrategy`, `RouteReuseStrategy` и `UrlSerializer`, пропуск плавной смены страниц для query-параметров.
- **Состояние**: 29 сервисов на сигналах без библиотеки состояния, сигнал в токене, `resource` с `debounced` и `linkedSignal`, `httpResource` с `parse`, кэш промисов, ленивые сервисы на `injectAsync`.
- **Пререндер**: статический сайт, `PendingTasks` для асинхронной статьи, статья в `ng-state`, `@defer` для того, что не нужно на сервере, правила хостинга и «мягкая 404».
- **Встроенный редактор**: настоящий `ng serve` в WebContainers против JIT в браузере — и что бывает с окружением без lock-файла.
- **Ревью**: что команда сама переписала за месяц, что стоит перенять, где мы бы сделали иначе.

Главный вывод: в большом проекте нет особой магии. Те же резолверы, сигналы, сервисы и `@defer`, что в «Ходе конём», — только их больше, и живут они дольше: со следами переходов, мёртвым кодом и `TODO`. Читать такой код вы теперь умеете.

Впереди — глава 22, финальный проект: своё приложение или новый раздел магазина, без пошаговых инструкций.
