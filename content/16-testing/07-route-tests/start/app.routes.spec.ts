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

  // TODO: оформление с игрой в корзине, заказы без входа, админка не видна гостю, заказы после входа
});
