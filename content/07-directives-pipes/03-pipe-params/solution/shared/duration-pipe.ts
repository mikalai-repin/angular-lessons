import { Pipe, PipeTransform } from '@angular/core';
import { WordForms, plural } from './plural';

const HOUR: WordForms = {
  one: 'час',
  few: 'часа',
  many: 'часов',
};
const MINUTE: WordForms = {
  one: 'минута',
  few: 'минуты',
  many: 'минут',
};

// Формат длительности: 'short' — «1 ч 30 мин», 'long' — «1 час 30 минут»
export type DurationFormat = 'short' | 'long';

// Длительность в минутах: 90 → «1 ч 30 мин», а с параметром 'long' — «1 час 30 минут»
@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(
    minutes: number,
    format: DurationFormat = 'short',
  ): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    const parts: string[] = [];
    if (hours > 0) {
      parts.push(
        format === 'short'
          ? `${hours} ч`
          : `${hours} ${plural(hours, HOUR)}`,
      );
    }
    if (rest > 0 || hours === 0) {
      parts.push(
        format === 'short'
          ? `${rest} мин`
          : `${rest} ${plural(rest, MINUTE)}`,
      );
    }
    return parts.join(' ');
  }
}
