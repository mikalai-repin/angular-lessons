import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';

// Сколько раз повторять запрос и через сколько миллисекунд
const RETRY_COUNT = 2;
const RETRY_DELAY = 500;

// Повтор при сбое сервера. Только GET: чтение можно повторить без вреда,
// а повтор POST мог бы, например, дважды отправить один отзыв
export const retryInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  if (req.method !== 'GET') {
    return next(req);
  }
  return next(req).pipe(
    retry({
      count: RETRY_COUNT,
      // Повторяем только ответы 5xx — «сервер не смог». 404 при повторе останется 404
      delay: (error: unknown) =>
        error instanceof HttpErrorResponse &&
        error.status >= 500
          ? timer(RETRY_DELAY)
          : throwError(() => error),
    }),
  );
};
