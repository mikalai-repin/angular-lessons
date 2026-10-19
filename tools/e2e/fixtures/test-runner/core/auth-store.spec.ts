import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from './auth-store';

describe('AuthStore', () => {
  let auth: AuthStore;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('logIn сохраняет токен и пользователя', async () => {
    const done = auth.logIn({ email: 'user@example.com', password: 'user' });
    const request = http.expectOne('/api/login');
    expect(request.request.method).toBe('POST');
    request.flush({
      token: 't1',
      refreshToken: 'r1',
      user: { id: 1, email: 'user@example.com', name: 'Пользователь', role: 'user' },
    });
    await done;
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.user()?.name).toBe('Пользователь');
    expect(localStorage.getItem('hod-konem:token')).toBe('t1');
  });
});
