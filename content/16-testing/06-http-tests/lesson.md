---
title: Тест HTTP
startFrom: custom
preview: tests
focus: core/auth-store.spec.ts
api: [provideHttpClientTesting, HttpTestingController, expectOne, flush, verify, rejects]
---

`AuthStore` и `authInterceptor` из главы 14 разговаривают с сервером: вход, восстановление сессии, токен в каждом запросе, обновление токена после 401. Как их тестировать? Ходить в тестах на настоящий сервер — плохая идея: он бывает медленным и недоступным, данные на нём меняются, а ответ 401 или 500 по заказу от него не получить.

Нужен сервер, которым управляет тест: запрос пришёл — тест посмотрел, что в нём, и сам решил, что ответить.

## Что изменилось в коде

- `core/auth-store.spec.ts` — набор `AuthStore` с тестом входа;
- `core/auth-interceptor.spec.ts` — набор `authInterceptor` с тестом «гость — запрос без токена».

## Поддельный сервер

```ts core/auth-store.spec.ts
beforeEach(() => {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  auth = TestBed.inject(AuthStore);
  server = TestBed.inject(HttpTestingController);
});
```

**`provideHttpClientTesting()`** из `@angular/common/http/testing` заменяет ту часть `HttpClient`, которая отправляет запросы в сеть (`FetchBackend`), на тестовую. Запросы никуда не уходят — они ждут в очереди, пока тест на них не ответит. Интерцепторы, разбор JSON, ошибки по статусу — всё остальное работает как в магазине. Пишется **после** `provideHttpClient()`: та тоже объявляет отправителя запросов — `FetchBackend`, а из двух провайдеров одного токена действует последний.

**`HttpTestingController`** — пульт поддельного сервера. Его тест получает из стенда, как сервис.

## Тест входа

```ts
it('вход сохраняет токен и пользователя', async () => {
  const done = auth.logIn({ email: USER.email, password: 'user' });
  const request = server.expectOne('/api/login');
  expect(request.request.method).toBe('POST');
  expect(request.request.body).toEqual({
    email: USER.email,
    password: 'user',
  });
  request.flush({ token: 't1', refreshToken: 'r1', user: USER });
  await done;
  expect(auth.isLoggedIn()).toBe(true);
  expect(localStorage.getItem('hod-konem:token')).toBe('t1');
});
```

Тест играет за обе стороны — и за покупателя, и за сервер:

1. **`auth.logIn(…)`** — запрос ушёл. `await` пока нельзя: ответа ещё нет, и тест ждал бы вечно. Промис сохраняем в `done`.
2. **`server.expectOne('/api/login')`** — «пришёл ровно один запрос на этот адрес». Нет такого или их два — ошибка. Возвращает `TestRequest`: в `request.request` — сам запрос с методом, телом и заголовками.
3. **`request.flush(тело)`** — ответить: статус 200 и это тело. Ответ проходит обратно через `HttpClient`, как настоящий.
4. **`await done`** — теперь `logIn` дождался ответа и закончил работу. Проверяем, что получилось.

Адрес в `expectOne` сравнивается целиком, вместе с параметрами: запрос `/api/games?q=кот` строка `'/api/games'` не найдёт. Для сложных случаев есть `expectOne({ method: 'POST', url: '/api/login' })` и функция-условие.

## Ошибки сервера

```ts
it('неверный пароль — ошибка 401, вход не состоялся', async () => {
  const done = auth.logIn({ email: USER.email, password: 'нет' });
  server
    .expectOne('/api/login')
    .flush(
      { message: 'Неверный e-mail или пароль' },
      { status: 401, statusText: 'Unauthorized' },
    );
  await expect(done).rejects.toMatchObject({ status: 401 });
  expect(auth.isLoggedIn()).toBe(false);
});
```

- **`flush(тело, { status, statusText })`** — любой ответ, в том числе ошибка. `HttpClient` превратит 401 в `HttpErrorResponse`, как от настоящего сервера.
- **`await expect(промис).rejects`** — утверждение о промисе: он должен быть **отклонён**. Дальше — матчер к причине отказа. `await` обязателен: без него тест закончится раньше, чем промис.
- **`toMatchObject({ status: 401 })`** — у объекта есть такие поля с такими значениями, остальные не важны. У `HttpErrorResponse` полей много, а нам важен статус.

## Ни одного запроса без ответа

```ts
afterEach(() => server.verify());
```

**`verify()`** проверяет, что в очереди не осталось запросов без ответа. Если код отправил запрос, о котором тест не знал, — `verify` упадёт: `Expected no open requests, found 1: GET /api/me`. Так тест замечает и лишние запросы, и забытые ответы.

## Интерцептор

Интерцептор не вызывают напрямую — через него проходит каждый запрос `HttpClient`. Значит, и тест его — запрос через `HttpClient`, у которого этот интерцептор подключён:

```ts core/auth-interceptor.spec.ts
TestBed.configureTestingModule({
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideHttpClientTesting(),
    provideRouter([]),
  ],
});
```

Роутер — потому что интерцептор внедряет `Router`: когда сессия кончилась, он уводит на `/login`. Тест «после входа» сначала входит (помощник `logIn` в файле отвечает на `/api/login` за сервер), потом отправляет `http.get('/api/orders').subscribe()` и смотрит в `expectOne` на заголовок `Authorization`: добавил ли его интерцептор.

Самое интересное — обновление токена. Тест по шагам разыгрывает разговор, который в главе 14 мы видели во вкладке «Сеть»:

```ts
http.get('/api/orders').subscribe((body) => (orders = body));
server
  .expectOne('/api/orders')
  .flush(null, { status: 401, statusText: 'Unauthorized' });
const refresh = server.expectOne('/api/refresh');
expect(refresh.request.body).toEqual({ refreshToken: 'r1' });
refresh.flush({ token: 't2', refreshToken: 'r2' });
const retry = server.expectOne('/api/orders');
expect(retry.request.headers.get('Authorization')).toBe(
  'Bearer t2',
);
retry.flush([]);
expect(orders).toEqual([]);
```

Сервер ответил 401 — интерцептор сам попросил новый токен — сервер выдал — интерцептор повторил тот же запрос с новым токеном — подписчик получил ответ, так и не узнав про 401. В «Сети» на это нужно было ждать, пока истечёт токен. Здесь — миллисекунды.

::: task
1. `AuthStore`: тест «неверный пароль — ошибка 401, вход не состоялся», как выше.
2. `AuthStore`: «сервер не принял сохранённый токен — токен забыт». Положите в `localStorage` токен (`'hod-konem:token'`), вызовите `restore()`, ответьте на `/api/me` статусом 401 и проверьте, что покупатель не вошёл, а токена в `localStorage` нет (`toBeNull()`).
3. `authInterceptor`: «после входа — токен в запросах к нашему серверу»: после входа запрос к `/api/orders` несёт `Bearer t1`, а запрос к `https://example.com/news` — без `Authorization`.
4. `authInterceptor`: «401 — новый токен и тот же запрос ещё раз», как выше.
:::

## Что получилось

29 ✓ во всех файлах: у `AuthStore` и `authInterceptor` по три. Ни одного настоящего запроса — и все тесты выполняются за доли секунды, хотя проверяют вход, восстановление сессии и обновление токена.

## Эксперименты

**Забыли ответить.** В тесте входа уберите `request.flush(…)`. Тест висит, а через 5 секунд падает: `Test timed out in 5000ms.` `await done` ждёт ответа, которого никто не пришлёт. Пять секунд — время теста по умолчанию в Vitest. Верните строку.

**Не тот адрес — и цепная реакция.** Напишите `server.expectOne('/api/logon')`. У теста входа две ошибки:

```text
Error: Expected one matching request for criteria "Match URL: /api/logon", found none. Requests received are: POST /api/login.
Error: Expected no open requests, found 1: POST /api/login
```

Первая — от `expectOne`, и она подсказывает, какие запросы пришли на самом деле. Вторая — от `verify` в `afterEach`: запрос на `/api/login` так и остался без ответа. Пока всё честно. Но следом упали и два других теста набора, которые только что проходили:

```text
Error: Cannot configure the test module when the test module has already been instantiated.
```

Упавший `afterEach` прерывает остальные `afterEach` этого теста — а среди них очистка `TestBed`, которую подключает CLI. Стенд не разобран, и следующий `configureTestingModule` падает. Правило: при пачке красных тестов читайте **первую** ошибку — остальные часто её следствие.

Каскад может дойти и до следующего файла, если тот тоже настраивает стенд. В превью все файлы выполняются друг за другом в одном окне. `ng test` раскладывает файлы по нескольким процессам, и до другого файла каскад может и не дойти. Верните `'/api/login'`.

::: deep Под капотом: тестовый бэкенд
У `HttpClient` есть последнее звено цепочки — `HttpBackend`: оно получает готовый запрос (после всех интерцепторов) и отправляет его. В браузере это `FetchBackend`. `provideHttpClientTesting()` ставит на его место `HttpClientTestingBackend`: тот кладёт каждый запрос в список `open` и возвращает поток, который сразу сообщает «отправлен» (`HttpEventType.Sent`), а ответ выдаёт, только когда тест вызовет `flush` или `error`. `expectOne` забирает найденный запрос из списка — поэтому `verify` о нём уже не вспомнит. `HttpTestingController` — тот же объект, только с методами для теста: `expectOne`, `expectNone`, `match` (все подходящие), `verify`.

`provideHttpClientTesting()` добавляет ещё один провайдер — `REQUESTS_CONTRIBUTE_TO_STABILITY: false`. В приложении каждый запрос `HttpClient` — ждущая задача: `whenStable()` ждёт ответа (глава 11). А в тесте ответ даёт сам тест, и `whenStable()` с запросом в очереди ждал бы вечно. Поэтому тестовые запросы стабильность не держат. Это пригодится в следующих шагах.
:::
