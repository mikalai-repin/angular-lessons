import { Signal } from '@angular/core';

// Текущее время сигналом, который обновляется каждые periodMs миллисекунд.
// Таймер останавливается сам, когда уничтожается тот, кто вызвал функцию
// TODO: функция injectNow(periodMs = 1000): Signal<number>
