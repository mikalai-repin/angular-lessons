---
title: Конфигурация приложения
startFrom: custom
focus: app.config.ts
api: [ApplicationConfig, providers, provideBrowserGlobalErrorListeners]
---

Магазину скоро понадобятся роутер (переходы между страницами), HTTP-клиент (запросы к серверу) и другие возможности Angular. Их нужно подключить при запуске приложения, и для этого есть отдельный файл — **конфигурация приложения**. В шаге появился `app.config.ts` с заготовкой.

## `ApplicationConfig`

```ts app.config.ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners()],
};
```

Конфигурация — обычный объект типа `ApplicationConfig`, а главное в нём — массив `providers`. **Провайдер** сообщает Angular, как получить то, что понадобится приложению: сервис, настройку, обработчик. Подробно провайдеры мы разберём в главе про внедрение зависимостей, а пока достаточно знать соглашение: возможности Angular подключаются функциями с именами `provide…()`. В следующих главах сюда добавятся `provideRouter(routes)` и `provideHttpClient()`.

Конфигурацию передаём вторым аргументом при запуске:

```ts main.ts {3,5}
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app';
import { appConfig } from './app.config';

bootstrapApplication(App, appConfig)
  .then((appRef) => console.log('Магазин запущен. Корневых компонентов:', appRef.components.length))
  .catch((err) => console.error(err));
```

Конфигурацию можно было бы написать прямо в `main.ts`. Отдельный файл — соглашение Angular CLI: `main.ts` остаётся коротким, а всё, что относится к настройке приложения, лежит в одном месте.

## Глобальные ошибки

`provideBrowserGlobalErrorListeners()` есть в `app.config.ts` каждого нового проекта Angular CLI. Чтобы понять, что он делает, нужно знать, как Angular обрабатывает ошибки.

У Angular есть встроенный **обработчик ошибок** — `ErrorHandler`. Ошибку в коде компонента, например в обработчике клика, Angular перехватывает сам и передаёт ему. Обработчик по умолчанию выводит её в консоль с пометкой `ERROR` — вы уже видели такую строку в шаге про запуск приложения, когда селектор не нашёлся. В настоящем приложении обработчик заменяют своим, который, например, отправляет ошибки на сервер, чтобы разработчики о них узнали.

Но не все ошибки проходят через Angular. Ошибка в `setTimeout` или необработанный отклонённый промис происходят вне Angular, и он о них не знает. `provideBrowserGlobalErrorListeners()` подписывается на события браузера `error` и `unhandledrejection` и передаёт такие ошибки тому же `ErrorHandler`. Теперь все ошибки приложения собираются в одном месте.

::: task
1. В `app.config.ts` добавьте в `providers` вызов `provideBrowserGlobalErrorListeners()` (не забудьте импорт из `@angular/core`).
2. В `main.ts` импортируйте `appConfig` и передайте его вторым аргументом в `bootstrapApplication`.
:::

## Что получилось

Внешне ничего не изменилось: магазин выглядит как раньше, в консоли — сообщение о запуске. Разницу покажет эксперимент.

Добавьте в конец `main.ts` ошибку, которая случится через секунду после запуска, вне Angular:

```ts main.ts
setTimeout(() => {
  throw new Error('Проверка обработчика ошибок');
}, 1000);
```

В консоли появится:

```
ERROR Error: Проверка обработчика ошибок
```

Пометка `ERROR` означает, что ошибку вывел `ErrorHandler` Angular. Теперь уберите `appConfig` из вызова `bootstrapApplication` (оставьте `bootstrapApplication(App)`): та же ошибка выведется уже без `ERROR` — это необработанная ошибка браузера, мимо Angular.

Верните `appConfig` и удалите `setTimeout`.

::: deep Под капотом: что внутри provideBrowserGlobalErrorListeners
Исходный код в `@angular/core` занимает пару десятков строк. Суть такая:

```ts
window.addEventListener('error', (event) => {
  errorHandler(event.error);
  event.preventDefault();
});
window.addEventListener('unhandledrejection', (event) => {
  errorHandler(event.reason);
  event.preventDefault();
});
```

`event.preventDefault()` отменяет стандартную реакцию браузера — сообщение «Uncaught Error» в консоли: ошибка уже обработана. А когда приложение уничтожается, Angular снимает эти слушатели.
:::
