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

  // TODO: после входа — токен в запросах к /api/ и не в запросах к чужим адресам; 401 → обновление токена и повтор
});
