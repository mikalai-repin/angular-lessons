import {
  HttpContextToken,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { of, tap } from 'rxjs';

// Метка запроса «ответ можно взять из кэша». Значение по умолчанию — нельзя
export const CACHE = new HttpContextToken<boolean>(() => false);

// Сколько ответ живёт в кэше, мс
const MAX_AGE = 10_000;

// Сохранённые ответы: адрес с параметрами → ответ и когда он получен
@Service()
export class ResponseCache {
  private readonly entries = new Map<
    string,
    { response: HttpResponse<unknown>; time: number }
  >();

  get(url: string): HttpResponse<unknown> | undefined {
    const entry = this.entries.get(url);
    return entry && Date.now() - entry.time < MAX_AGE
      ? entry.response
      : undefined;
  }

  set(url: string, response: HttpResponse<unknown>) {
    this.entries.set(url, { response, time: Date.now() });
  }

  // Забыть все ответы: данные на сервере изменились
  clear() {
    this.entries.clear();
  }
}

// Кэш GET-запросов с меткой CACHE: свежий ответ из кэша — без запроса к серверу
export const cacheInterceptor: HttpInterceptorFn = (
  req,
  next,
) => {
  // Интерцептор выполняется в контексте внедрения: inject работает
  const cache = inject(ResponseCache);
  // TODO: запрос, который меняет данные (не GET), — после успешного ответа забыть все сохранённые ответы
  if (req.method !== 'GET' || !req.context.get(CACHE)) {
    return next(req);
  }
  const cached = cache.get(req.urlWithParams);
  if (cached) {
    // Поток из одного готового ответа — для того, кто подписан, это обычный ответ сервера
    return of(cached);
  }
  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        cache.set(req.urlWithParams, event);
      }
    }),
  );
};
