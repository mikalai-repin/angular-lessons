import { HttpInterceptorFn } from '@angular/common/http';

// Лог запросов: метод, адрес, ответ и сколько он шёл. Через интерцептор проходит каждый запрос HttpClient
export const loggingInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  // TODO: вывести в консоль метод, адрес, статус ответа и сколько миллисекунд он шёл
  return next(req);
};
