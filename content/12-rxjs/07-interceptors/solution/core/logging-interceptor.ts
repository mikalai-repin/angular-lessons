import {
  HttpErrorResponse,
  HttpEventType,
  HttpInterceptorFn,
} from '@angular/common/http';
import { tap } from 'rxjs';

// Лог запросов: метод, адрес, ответ и сколько он шёл. Через интерцептор проходит каждый запрос HttpClient
export const loggingInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  const started = performance.now();
  const took = () =>
    `${Math.round(performance.now() - started)} мс`;
  const request = `${req.method} ${req.urlWithParams}`;
  // next(req) — запрос дальше по цепочке. Ответ приходит потоком событий: смотрим на него через tap
  return next(req).pipe(
    tap({
      next: (event) => {
        if (event.type === HttpEventType.Response) {
          console.log(
            `${request} → ${event.status}, ${took()}`,
          );
        }
      },
      error: (error: HttpErrorResponse) =>
        console.log(`${request} → ${error.status}, ${took()}`),
    }),
  );
};
