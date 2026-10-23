---
title: Тест маршрутов
startFrom: custom
preview: tests
focus: app.routes.spec.ts
api: [RouterTestingHarness, navigateByUrl, routeNativeElement, Router.url]
---

Часть правил магазина живёт не в компонентах, а в маршрутах: гард не пустит на оформление с пустой корзиной, гость попадёт со страницы заказов на вход и вернётся обратно, покупатель не увидит админку. В главах 10 и 14 мы проверяли это руками — набирали адрес и смотрели, где оказались. Тест сделает то же: перейдёт по адресу и посмотрит, какая страница открылась и какой адрес стал в итоге.

## Что изменилось в коде

`app.routes.spec.ts` — набор «маршруты» с первым тестом. Файл лежит рядом с `app.routes.ts`: проверяем настоящую карту магазина, а не учебную.

## Обвязка роутера

```ts app.routes.spec.ts
beforeEach(async () => {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  harness = await RouterTestingHarness.create();
  router = TestBed.inject(Router);
  server = TestBed.inject(HttpTestingController);
});
```

- **`provideRouter(routes, withComponentInputBinding())`** — настоящие маршруты из `app.routes.ts`, с той же функцией, что в `app.config.ts`: `returnUrl` из адреса придёт во вход страницы входа.
- **HTTP** — поддельный сервер, как в прошлом шаге. Страницы внедряют `HttpClient`, а страница заказов загружает заказы с сервера. Интерцептор — чтобы заказы ушли с токеном, как в магазине.
- **`RouterTestingHarness.create()`** из `@angular/router/testing` — **обвязка** для тестов роутера. Она создаёт корневой компонент с одним `<router-outlet>` — как `App`, только без шапки и крошек.

```ts
it('оформление с пустой корзиной — корзина', async () => {
  await harness.navigateByUrl('/checkout', CartPage);
  expect(router.url).toBe('/cart');
  expect(harness.routeNativeElement?.textContent).toContain(
    'Корзина пуста',
  );
});
```

- **`harness.navigateByUrl(адрес, Компонент)`** — переход, как по ссылке. Промис выполнится, когда навигация закончится: гарды отработали, переадресации пройдены, ленивые части загружены, страница отрисована. Второй аргумент — проверка: в `<router-outlet>` должна оказаться эта страница. Оказалась другая — ошибка. Возвращает экземпляр страницы.
- **`router.url`** — адрес, на котором покупатель оказался в итоге. Мы шли на `/checkout`, а гард `cartNotEmptyGuard` вернул `UrlTree` корзины — и роутер переадресовал.
- **`harness.routeNativeElement`** — элемент страницы в `<router-outlet>`. В нём ищем текст.

Ленивые маршруты работают как в магазине: тест заказов загрузит кабинет, и в консоли появится «Кабинет: модуль загружен».

## Вложенные маршруты

Страница заказов — во **вложенном** `<router-outlet>`, внутри кабинета (глава 10). Обвязка видит только свой, корневой. Поэтому для `/account/orders` второй аргумент — `Account`, а не `OrdersPage`:

```ts
// В корневом <router-outlet> — кабинет, страница заказов — во вложенном, внутри кабинета
await harness.navigateByUrl('/account/orders', Account);
```

`routeNativeElement` тоже даёт кабинет — вместе со страницей заказов внутри. Текст заказов в нём найдётся.

## Страница с запросом

```ts
await harness.navigateByUrl('/account/orders', Account);
const request = server.expectOne('/api/orders');
expect(request.request.headers.get('Authorization')).toBe(
  'Bearer t1',
);
request.flush([
  {
    id: 7,
    userId: 1,
    items: [{ gameId: 1, quantity: 2 }],
    total: 2390,
    createdAt: '2026-10-18T09:30:00.000Z',
  },
]);
await harness.fixture.whenStable();
expect(harness.routeNativeElement?.textContent).toContain('Заказ №7');
```

`httpResource` страницы заказов отправил запрос, пока страница отрисовывалась, — к концу `navigateByUrl` он уже в очереди. Отвечаем — ресурс получил значение, страница запланировала обновление. **`harness.fixture`** — фикстура корневого компонента обвязки: её `whenStable()` дожидается отрисовки, как в тесте карточки.

Перед этим тест входит: помощник отвечает на `/api/login` за сервер, как в прошлом шаге. Без входа гард не пустил бы на заказы.

::: task
Допишите тесты маршрутов:

1. «с игрой в корзине — оформление»: положите игру в корзину (`TestBed.inject(CartStore).add(fakeGame())`) — переход на `/checkout` открывает `Checkout`, адрес — `/checkout`.
2. «заказы без входа — вход, а потом обратно»: `/account/orders` открывает `Login`, а адрес — `/login?returnUrl=%2Faccount%2Forders` (роутер кодирует `/` в адресе как `%2F`, глава 14).
3. «админка не видна гостю — 404»: без входа `/admin` открывает `NotFound`, адрес остаётся `/admin`. Для вошедшего покупателя с ролью `user` гард тот же — `isAdmin()` ложно.
4. «заказы после входа — список с сервера»: вход, переход, запрос с токеном, ответ, «Заказ №7» на странице.
:::

## Что получилось

У набора «маршруты» пять ✓. Три гарда из двух глав проверены за доли секунды. Тест админки — проверка `canMatch` из главы 14: маршрут `/admin` «не подошёл», роутер пошёл дальше по списку и нашёл `'**'`. Адрес при этом не меняется — это не переадресация, а другая страница по тому же адресу.

## Эксперименты

**Не та страница.** Напишите в первом тесте `navigateByUrl('/checkout', Login)`:

```text
Error: Unexpected routed component type. Expected Login but got CartPage
```

Сообщение называет обе страницы — сразу видно, куда на самом деле привела навигация. В `ng test` имена будут с подчёркиванием — `_Login`, `_CartPage`: так сборщик тестов переименовывает классы.

**Тест не знает настроек магазина.** В тесте заказов напечатайте текст страницы: `console.log(harness.routeNativeElement?.textContent)`. В консоли — `Заказ №7 · October 18, 2026` и `$2,390`. Дата по-английски, цена в долларах: в стенде нет `LOCALE_ID` и `DEFAULT_CURRENCY_CODE` из `app.config.ts`, как у `PricePipe` в шаге 2. Тест проверяет только номер заказа — и ему всё равно. Если тесту важен формат, дайте стенду те же провайдеры, что у магазина.

::: deep Под капотом: обвязка и адресная строка
`RouterTestingHarness.create()` создаёт фикстуру служебного компонента, в шаблоне которого только `<router-outlet>`. `navigateByUrl` ждёт конца навигации — включая все переадресации — и вызывает `detectChanges()` фикстуры. `whenStable()` он не ждёт: поэтому навигация не зависает на запросе страницы, который тест ещё не обработал.

Настоящую адресную строку тесты не трогают: тестовая платформа (`BrowserTestingModule`) подключает поддельную навигацию браузера. Роутер думает, что меняет адрес, а адрес окна остаётся прежним. Поэтому тесты маршрутов не мешают друг другу и раннеру.

Маршрут с резолвером обвязка дождаться не сможет, если резолвер ждёт ответа сервера: навигация не закончится, пока тест не ответит, а тест ждёт навигацию. Такие маршруты проверяют иначе: резолвер — отдельным тестом функции через `TestBed.runInInjectionContext`, страницу — тестом компонента.
:::

::: legacy Вы встретите в старом коде: RouterTestingModule
Раньше роутер в тестах подключали модулем: `imports: [RouterTestingModule.withRoutes(routes)]`. В Angular 22 он `@deprecated`: «Use `provideRouter` or `RouterModule`/`RouterModule.forRoot` instead». Поддельное расположение (`Location`), ради которого модуль был нужен, теперь есть в `TestBed` по умолчанию.
:::
