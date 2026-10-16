---
title: Интерцепторы
startFrom: custom
focus: core/logging-interceptor.ts
api: [withInterceptors, HttpInterceptorFn, HttpEventType, retry, timer]
---

Магазин отправляет запросы из многих мест: главная, каталог, страница игры, отзывы, быстрый поиск, «Избранное». Допустим, мы хотим видеть в консоли каждый запрос и время ответа. Или повторять запрос, если сервер на мгновение не ответил. Дописывать это в каждое место — долго и ненадёжно: новый запрос легко забыть.

В главе 11 мы говорили: все запросы `HttpClient` проходят через одно место. Это место — **интерцепторы** (interceptors, «перехватчики»): функции, через которые проходит каждый запрос и каждый ответ. В этом шаге напишем два: лог запросов и повтор при сбое сервера.

## Что изменилось в коде

В `core/` два новых файла-заготовки: `logging-interceptor.ts` и `retry-interceptor.ts`. Каждый интерцептор пока просто передаёт запрос дальше. Так выглядит результат команды `ng generate interceptor logging` в проекте Angular CLI: файл `logging-interceptor.ts` с функцией `loggingInterceptor`.

## Цепочка интерцепторов

Интерцептор — функция типа `HttpInterceptorFn`:

```ts
export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
```

`req` — запрос (`HttpRequest`): метод, адрес, параметры, заголовки, тело. `next(req)` отправляет запрос **дальше по цепочке** — следующему интерцептору, а после последнего — на сервер. `next` возвращает Observable с ответом, и интерцептор возвращает его тому, кто его вызвал. Значит, интерцептор может:

- изменить запрос перед `next` — например, добавить заголовок с токеном входа (глава 14);
- обработать ответ — операторами на потоке, который вернул `next`;
- вовсе не вызывать `next` и ответить сам — так устроен кэш (следующий шаг).

Интерцепторы подключают в `provideHttpClient` функцией `withInterceptors` — массивом, **по порядку**:

```ts app.config.ts
provideHttpClient(
  withInterceptors([loggingInterceptor, retryInterceptor]),
),
```

Запрос проходит их сверху вниз, ответ возвращается снизу вверх:

```text
HttpClient
   ↓ запрос              ↑ ответ
loggingInterceptor
   ↓                     ↑
retryInterceptor
   ↓                     ↑
FetchBackend → сервер
```

`HttpRequest` неизменяемый: изменить запрос можно только копией — `req.clone({ … })`. Так один интерцептор не может незаметно испортить запрос для остальных.

## Лог запросов

Ответ `next` — не одно значение, а поток **событий** `HttpEvent`. Для обычного запроса их два: `Sent` (запрос отправлен) и `Response` (пришёл ответ). Ответ — событие с `type === HttpEventType.Response`, у него есть `status` и `body`. Ошибка (ответ не 2xx) приходит в поток ошибкой `HttpErrorResponse`.

Смотреть на поток, не меняя его, умеет `tap`. Ему можно передать не функцию, а объект с обработчиками: `next` — для значений, `error` — для ошибки:

```ts core/logging-interceptor.ts
export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const started = performance.now();
  const took = () => `${Math.round(performance.now() - started)} мс`;
  const request = `${req.method} ${req.urlWithParams}`;
  return next(req).pipe(
    tap({
      next: (event) => {
        if (event.type === HttpEventType.Response) {
          console.log(`${request} → ${event.status}, ${took()}`);
        }
      },
      error: (error: HttpErrorResponse) =>
        console.log(`${request} → ${error.status}, ${took()}`),
    }),
  );
};
```

`req.urlWithParams` — адрес вместе с параметрами: `/api/games?sort=rating&size=4`.

## Повтор при сбое

Сервер иногда не отвечает: перезапускается, перегружен. Такой сбой бывает коротким, и тот же запрос через полсекунды может пройти. Оператор **`retry`** при ошибке заново подписывается на поток — то есть заново отправляет запрос:

```ts core/retry-interceptor.ts
return next(req).pipe(
  retry({
    count: RETRY_COUNT,
    // Повторяем только ответы 5xx — «сервер не смог». 404 при повторе останется 404
    delay: (error: unknown) =>
      error instanceof HttpErrorResponse && error.status >= 500
        ? timer(RETRY_DELAY)
        : throwError(() => error),
  }),
);
```

`count` — сколько раз повторить (2 — значит, всего три попытки). `delay` решает, повторять ли: возвращает поток. `timer(500)` выдаст значение через 500 мс — и тогда `retry` повторит запрос. `throwError` — сразу ошибка: повтора не будет, ошибка пойдёт дальше.

Повторять можно не всё. 404 при повторе останется 404. А запрос, который **меняет** данные, повторять опасно: `POST` отзыва мог дойти до сервера, а не дошёл только ответ — повтор создаст второй отзыв. Поэтому интерцептор пропускает без повтора всё, кроме `GET`:

```ts core/retry-interceptor.ts
if (req.method !== 'GET') {
  return next(req);
}
```

::: task
1. В `loggingInterceptor` выведите в консоль метод и адрес запроса, статус ответа (или ошибки) и сколько миллисекунд он шёл: `tap` с `next` и `error`, ответ — событие с типом `HttpEventType.Response`.
2. В `retryInterceptor` повторяйте `GET`-запросы при ответе 5xx: `retry` с `count: RETRY_COUNT` и паузой `RETRY_DELAY`. Остальные ошибки и остальные методы — без повтора.
3. Подключите оба в `app.config.ts`: `provideHttpClient(withInterceptors([loggingInterceptor, retryInterceptor]))`.
:::

## Что получилось

При запуске в консоли — строки о запросах главной:

```text
GET /api/games?sort=rating&size=4 → 200, 309 мс
GET /api/games?onSale=true → 200, 312 мс
```

Походите по магазину: каждый запрос — строка в логе. В том числе запросы «Избранного»: после прошлого шага они идут через `HttpClient`. А вот обычный `fetch` интерцепторы не видят.

Включите «Ошибку 500» и перезапустите превью. В «Сети» у каждого адреса три запроса со статусом 500 — первая попытка и два повтора. В консоли на каждый адрес одна строка: `→ 500, 1923 мс` — три попытки по 300 мс и две паузы по 500. Лог стоит в цепочке выше повтора и видит запрос так же, как компонент: один запрос, который в итоге не удался. Выключите «Ошибку 500».

## Эксперименты

**Порядок интерцепторов.** Поменяйте их местами: `[retryInterceptor, loggingInterceptor]` — и снова включите «Ошибку 500». Теперь лог ниже повтора, и строк три на каждый адрес: каждая попытка проходит через лог. Но время странное: `308 мс`, `1112 мс`, `1916 мс` — копится, будто каждая попытка длится всё дольше. Дело в том, что функция `loggingInterceptor` выполнилась **один раз** и вернула поток. `retry` не вызывает интерцептор заново — он заново **подписывается** на тот же поток. Код в начале функции (`started`) выполнился один раз, а код внутри потока (`tap`) — при каждой подписке. Верните прежний порядок.

**404 не повторяется.** Введите адрес `/games/999`. В «Сети» два запроса `GET /api/games/999` со статусом 404 — резолвера крошки и страницы, — и ни одного повтора.

**POST не повторяется.** Откройте отзывы игры, включите «Ошибку 500» и отправьте отзыв: в «Сети» один `POST`, черновик откатился, как в шаге 11.8.

::: legacy Вы встретите в старом коде: интерцепторы-классы
До функций интерцепторы писали классами и регистрировали токеном:

```ts
@Injectable()
export class LoggingInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler) {
    return next.handle(req).pipe(…);
  }
}

providers: [
  provideHttpClient(withInterceptorsFromDi()),
  { provide: HTTP_INTERCEPTORS, useClass: LoggingInterceptor, multi: true },
]
```

Смысл тот же, вместо функции `next` — объект `next.handle(…)`. В Angular 22 классы работают, но в описании `withInterceptorsFromDi` сказано: предпочитайте `withInterceptors` и функции — поддержку интерцепторов из DI могут постепенно убрать.
:::
