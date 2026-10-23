import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth-interceptor';
import { AuthStore } from './auth-store';

describe('authInterceptor', () => {
  let http: HttpClient;
  let server: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        // Интерцептор — как в app.config.ts. Ему нужен ещё и роутер: при выходе он ведёт на /login
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    server = TestBed.inject(HttpTestingController);
  });

  afterEach(() => server.verify());

  // Войти: ответ на вход даёт тест
  async function logIn() {
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
  }

  it('гость — запрос без токена', () => {
    http.get('/api/orders').subscribe();
    const request = server.expectOne('/api/orders');
    expect(request.request.headers.has('Authorization')).toBe(
      false,
    );
  });

  it('после входа — токен в запросах к нашему серверу', async () => {
    await logIn();
    http.get('/api/orders').subscribe();
    http.get('https://example.com/news').subscribe();
    const own = server.expectOne('/api/orders');
    expect(own.request.headers.get('Authorization')).toBe(
      'Bearer t1',
    );
    // Чужому серверу токен не отдаём
    const foreign = server.expectOne(
      'https://example.com/news',
    );
    expect(foreign.request.headers.has('Authorization')).toBe(
      false,
    );
  });

  it('401 — новый токен и тот же запрос ещё раз', async () => {
    await logIn();
    let orders: unknown;
    http
      .get('/api/orders')
      .subscribe((body) => (orders = body));
    server
      .expectOne('/api/orders')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    const refresh = server.expectOne('/api/refresh');
    expect(refresh.request.body).toEqual({
      refreshToken: 'r1',
    });
    refresh.flush({ token: 't2', refreshToken: 'r2' });
    const retry = server.expectOne('/api/orders');
    expect(retry.request.headers.get('Authorization')).toBe(
      'Bearer t2',
    );
    retry.flush([]);
    expect(orders).toEqual([]);
  });
});
