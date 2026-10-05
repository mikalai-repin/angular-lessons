import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';

// Сколько миллисекунд осталось до полуночи: скидки «Хода конём» действуют до конца дня
function untilMidnight(now: number): number {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now;
}

// Сколько ещё действует скидка: обратный отсчёт до полуночи
@Component({
  selector: 'app-countdown',
  imports: [DatePipe],
  templateUrl: './countdown.html',
  styleUrl: './countdown.css',
})
export class Countdown {
  // TODO: текущее время — из injectNow(), а таймер и DestroyRef здесь больше не нужны
  // Текущее время. Это сигнал: шаблон обновится, когда таймер запишет новое значение
  private readonly now = signal(Date.now());
  // Сколько миллисекунд осталось. Строкой «07:16:10» его сделает пайп в шаблоне
  protected readonly left = computed(() =>
    untilMidnight(this.now()),
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
