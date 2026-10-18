import { HttpInterceptorFn } from '@angular/common/http';

// Токен — в каждый запрос к нашему серверу
export const authInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  // TODO: если покупатель вошёл и запрос идёт на /api/…, добавить заголовок Authorization
  return next(req);
};
