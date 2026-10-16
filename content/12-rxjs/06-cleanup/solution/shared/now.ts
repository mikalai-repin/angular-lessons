import {
  Signal,
  assertInInjectionContext,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, map } from 'rxjs';

// Текущее время сигналом, который обновляется каждые periodMs миллисекунд.
// toSignal подписывается сразу и отписывается сам, когда уничтожается тот, кто вызвал функцию
export function injectNow(periodMs = 1000): Signal<number> {
  // Понятная ошибка, если функцию вызвали вне контекста внедрения
  assertInInjectionContext(injectNow);
  // interval присылает 0, 1, 2… раз в periodMs. Нам нужен не номер, а время
  return toSignal(
    interval(periodMs).pipe(map(() => Date.now())),
    { initialValue: Date.now() },
  );
}
