import { Component } from '@angular/core';

// Сколько миллисекунд осталось до полуночи: скидки «Хода конём» действуют до конца дня
function untilMidnight(now: number): number {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now;
}

// 3 ч 5 мин 9 с → «03:05:09»
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

// TODO: компонент Countdown (селектор app-countdown): сколько ещё действует скидка.
// Текущее время — сигнал, который таймер обновляет раз в секунду. Таймер остановить, когда компонент уничтожен
