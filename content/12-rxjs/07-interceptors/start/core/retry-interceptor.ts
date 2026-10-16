import { HttpInterceptorFn } from '@angular/common/http';

// Сколько раз повторять запрос и через сколько миллисекунд
const RETRY_COUNT = 2;
const RETRY_DELAY = 500;

// Повтор при сбое сервера
export const retryInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  // TODO: повторить GET-запрос, если сервер ответил 5xx
  return next(req);
};
