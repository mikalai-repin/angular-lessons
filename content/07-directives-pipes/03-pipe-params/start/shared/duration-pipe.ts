import { Pipe } from '@angular/core';
import { WordForms, plural } from './plural';

const HOUR: WordForms = { one: 'час', few: 'часа', many: 'часов' };
const MINUTE: WordForms = { one: 'минута', few: 'минуты', many: 'минут' };

// Формат длительности: 'short' — «1 ч 30 мин», 'long' — «1 час 30 минут»
export type DurationFormat = 'short' | 'long';

// Длительность в минутах: 90 → «1 ч 30 мин», а с параметром 'long' — «1 час 30 минут»
// TODO: пайп с именем duration и параметром format (по умолчанию 'short')
