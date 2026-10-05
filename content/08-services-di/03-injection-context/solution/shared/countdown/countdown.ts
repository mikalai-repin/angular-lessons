import { Component, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { injectNow } from '../now';

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
  // Текущее время, раз в секунду. Таймер остановится сам, когда компонент уничтожат
  private readonly now = injectNow();
  // Сколько миллисекунд осталось. Строкой «07:16:10» его сделает пайп в шаблоне
  protected readonly left = computed(() => untilMidnight(this.now()));
}
