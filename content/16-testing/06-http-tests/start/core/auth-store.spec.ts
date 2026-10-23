import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from './auth-store';
import { User } from './models';

const USER: User = {
  id: 1,
  email: 'user@example.com',
  name: 'Пользователь',
  role: 'user',
};

describe('AuthStore', () => {
  let auth: AuthStore;
  // Поддельный сервер: запросы HttpClient попадают к нему, а не в сеть
  let server: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(AuthStore);
    server = TestBed.inject(HttpTestingController);
  });

  // Ни одного запроса без ответа: тест не забыл ни одного и не ждал лишнего
  afterEach(() => server.verify());

  it('вход сохраняет токен и пользователя', async () => {
    const done = auth.logIn({
      email: USER.email,
      password: 'user',
    });
    const request = server.expectOne('/api/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: USER.email,
      password: 'user',
    });
    request.flush({
      token: 't1',
      refreshToken: 'r1',
      user: USER,
    });
    await done;
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.user()?.name).toBe('Пользователь');
    expect(localStorage.getItem('hod-konem:token')).toBe('t1');
  });

  // TODO: неверный пароль (401), восстановление входа с токеном, который сервер не принял
});
