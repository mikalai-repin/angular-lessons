import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  Router,
  provideRouter,
  withComponentInputBinding,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Account } from './account/account';
import { routes } from './app.routes';
import { CartPage } from './cart/cart-page/cart-page';
import { Checkout } from './checkout/checkout';
import { authInterceptor } from './core/auth-interceptor';
import { AuthStore } from './core/auth-store';
import { CartStore } from './core/cart-store';
import { Login } from './login/login';
import { NotFound } from './not-found/not-found';
import { fakeGame } from './testing/fake-game';

// Маршруты магазина — настоящие, из app.routes.ts: проверяем, куда попадёт покупатель
describe('маршруты', () => {
  let harness: RouterTestingHarness;
  let router: Router;
  let server: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    // Обвязка: корневой компонент с <router-outlet> — как App, только без шапки
    harness = await RouterTestingHarness.create();
    router = TestBed.inject(Router);
    server = TestBed.inject(HttpTestingController);
  });

  afterEach(() => server.verify());

  it('оформление с пустой корзиной — корзина', async () => {
    await harness.navigateByUrl('/checkout', CartPage);
    expect(router.url).toBe('/cart');
    expect(harness.routeNativeElement?.textContent).toContain(
      'Корзина пуста',
    );
  });

  it('с игрой в корзине — оформление', async () => {
    TestBed.inject(CartStore).add(fakeGame());
    await harness.navigateByUrl('/checkout', Checkout);
    expect(router.url).toBe('/checkout');
  });

  it('заказы без входа — вход, а потом обратно', async () => {
    await harness.navigateByUrl('/account/orders', Login);
    expect(router.url).toBe(
      '/login?returnUrl=%2Faccount%2Forders',
    );
  });

  it('админка не видна гостю — 404', async () => {
    await harness.navigateByUrl('/admin', NotFound);
    expect(router.url).toBe('/admin');
  });

  it('заказы после входа — список с сервера', async () => {
    const done = TestBed.inject(AuthStore).logIn({
      email: 'user@example.com',
      password: 'user',
    });
    server.expectOne('/api/login').flush({
      token: 't1',
      refreshToken: 'r1',
      user: {
        id: 1,
        email: 'user@example.com',
        name: 'Пользователь',
        role: 'user',
      },
    });
    await done;
    // В корневом <router-outlet> — кабинет, страница заказов — во вложенном, внутри кабинета
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
    expect(harness.routeNativeElement?.textContent).toContain(
      'Заказ №7',
    );
  });
});
