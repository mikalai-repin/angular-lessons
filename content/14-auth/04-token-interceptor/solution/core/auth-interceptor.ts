import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from './auth-store';

// Токен — в каждый запрос к нашему серверу
export const authInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  const token = inject(AuthStore).token();
  // Не вошёл — пропуска нет. Чужой адрес — пропуск не отдаём: токен нужен только нашему серверу
  if (!token || !req.url.startsWith('/api/')) {
    return next(req);
  }
  // Запрос менять нельзя — только сделать копию с новым заголовком
  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
