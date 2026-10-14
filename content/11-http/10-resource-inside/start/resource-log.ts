import { Resource, effect } from '@angular/core';

// Журнал ресурса для шага «Под капотом»: печатает в консоль каждую смену статуса.
// Вызывать там, где можно создать эффект: в конструкторе или в инициализаторе поля
export function logResource(
  name: string,
  resource: Resource<unknown>,
) {
  let previous = '—';
  effect(() => {
    const status = resource.status();
    // value() ресурса с ошибкой бросает исключение — читаем значение, только если оно есть
    const details =
      status === 'error'
        ? `, ошибка: ${resource.error()?.message}`
        : resource.hasValue()
          ? ', значение есть'
          : '';
    console.log(`${name}: ${previous} → ${status}${details}`);
    previous = status;
  });
}
