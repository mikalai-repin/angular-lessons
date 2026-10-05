import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';

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

// Сколько ещё действует скидка: обратный отсчёт до полуночи
@Component({
  selector: 'app-countdown',
  templateUrl: './countdown.html',
  styleUrl: './countdown.css',
})
export class Countdown {
  // Текущее время. Это сигнал: шаблон обновится, когда таймер запишет новое значение
  private readonly now = signal(Date.now());
  protected readonly left = computed(() =>
    formatTime(untilMidnight(this.now())),
  );

  constructor() {
    const timer = setInterval(
      () => this.now.set(Date.now()),
      1000,
    );
    // Компонент уничтожен (окно закрыли) — таймер больше не нужен
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}
