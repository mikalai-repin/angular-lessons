import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from './auth-store';

// Токен — в каждый запрос к нашему серверу. Сервер его больше не принимает — выход
export const authInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  // inject — сразу, пока идёт вызов интерцептора: ответ придёт позже, вне контекста внедрения
  const auth = inject(AuthStore);
  const router = inject(Router);
  const token = auth.token();
  // Не вошёл — пропуска нет. Чужой адрес — пропуск не отдаём: токен нужен только нашему серверу
  if (!token || !req.url.startsWith('/api/')) {
    return next(req);
  }
  // Запрос менять нельзя — только сделать копию с новым заголовком
  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  ).pipe(
    catchError((error: unknown) => {
      // 401 на запрос с токеном: пропуск истёк или недействителен — сессия закончилась.
      // Проверка входа после перезагрузки (покупатель ещё не вошёл) разбирается с 401 сама
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        auth.isLoggedIn()
      ) {
        auth.logOut();
        router.navigateByUrl('/login');
      }
      // Ошибку отдаём дальше: тот, кто отправлял запрос, тоже должен о ней узнать
      return throwError(() => error);
    }),
  );
};
