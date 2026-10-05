import {
  DestroyRef,
  Signal,
  assertInInjectionContext,
  inject,
  signal,
} from '@angular/core';

// Текущее время сигналом, который обновляется каждые periodMs миллисекунд.
// Таймер останавливается сам, когда уничтожается тот, кто вызвал функцию
export function injectNow(periodMs = 1000): Signal<number> {
  // Понятная ошибка, если функцию вызвали вне контекста внедрения
  assertInInjectionContext(injectNow);
  const now = signal(Date.now());
  const timer = setInterval(
    () => now.set(Date.now()),
    periodMs,
  );
  // DestroyRef того, кто вызвал: компонента, директивы или сервиса
  inject(DestroyRef).onDestroy(() => clearInterval(timer));
  return now.asReadonly();
}
