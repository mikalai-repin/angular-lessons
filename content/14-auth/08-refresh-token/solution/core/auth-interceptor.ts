import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthStore, SKIP_AUTH } from './auth-store';

// Копия запроса с пропуском в заголовке: сам запрос менять нельзя
function withToken(req: HttpRequest<unknown>, token: string) {
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
}

// Токен — в каждый запрос к нашему серверу. Истёк — обновить и повторить запрос, не вышло — выход
export const authInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  // inject — сразу, пока идёт вызов интерцептора: ответ придёт позже, вне контекста внедрения
  const auth = inject(AuthStore);
  const router = inject(Router);
  const token = auth.token();
  // Не вошёл — пропуска нет. Чужой адрес — пропуск не отдаём: токен нужен только нашему серверу.
  // Обновление и выход — без пропуска: истёкший токен там только помешал бы
  if (
    !token ||
    !req.url.startsWith('/api/') ||
    req.context.get(SKIP_AUTH)
  ) {
    return next(req);
  }
  return next(withToken(req, token)).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401
      ) {
        return throwError(() => error);
      }
      // 401: пропуск истёк. Получаем новый и повторяем тот же запрос с ним
      return auth.refresh().pipe(
        catchError((refreshError: unknown) => {
          // Сервер обновления недоступен — сессия, может быть, жива: не выходим, отдаём ошибку дальше
          if (
            refreshError instanceof HttpErrorResponse &&
            refreshError.status !== 401
          ) {
            return throwError(() => refreshError);
          }
          // Refresh-токен не принят (или его нет) — сессия закончилась.
          // Проверка входа после перезагрузки разбирается сама
          if (auth.isLoggedIn()) {
            router.navigate(['/login'], {
              queryParams: { returnUrl: router.url },
            });
          }
          auth.logOut();
          return throwError(() => error);
        }),
        switchMap((fresh) => next(withToken(req, fresh))),
      );
    }),
  );
};
