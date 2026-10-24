import {
  min,
  required,
  schema,
  validate,
} from '@angular/forms/signals';
import { Game } from '../core/models';

// Категории игр: значение поля и подпись в списке
export const CATEGORIES: {
  id: Game['category'];
  title: string;
}[] = [
  { id: 'family', title: 'Семейные' },
  { id: 'strategy', title: 'Стратегии' },
  { id: 'party', title: 'Для вечеринок' },
  { id: 'cooperative', title: 'Кооперативные' },
  { id: 'kids', title: 'Детские' },
];

// Игра в форме админки: поля, которые меняет администратор.
// Числа — number | null: пустое числовое поле формы даёт null. Цена до скидки null — скидки нет
export interface GameDraft {
  title: string;
  category: Game['category'];
  cover: string;
  price: number | null;
  oldPrice: number | null;
  inStock: number | null;
  players: { min: number | null; max: number | null };
  playTime: number | null;
  age: number | null;
  description: string;
}

// Игра с сервера → черновик для формы
export function toDraft(game: Game): GameDraft {
  return {
    title: game.title,
    category: game.category,
    cover: game.cover,
    price: game.price,
    oldPrice: game.oldPrice ?? null,
    inStock: game.inStock,
    players: { ...game.players },
    playTime: game.playTime,
    age: game.age,
    description: game.description,
  };
}

// Правила игры. Те же проверяет сервер: форма лишь сообщает об ошибке раньше
export const gameSchema = schema<GameDraft>((game) => {
  required(game.title, { message: 'Нужно название' });
  required(game.price, { message: 'Нужна цена' });
  min(game.price, 1, { message: 'Цена — больше нуля' });
  // TODO: цена до скидки, если она есть, — больше цены
  required(game.inStock, { message: 'Сколько на складе?' });
  min(game.inStock, 0, { message: 'Не меньше нуля' });
  required(game.players.min, { message: 'Нужно число' });
  min(game.players.min, 1, { message: 'Хотя бы один' });
  validate(game.players.max, ({ value, valueOf }) => {
    const max = value();
    const from = valueOf(game.players.min);
    return max === null || (from !== null && max < from)
      ? { kind: 'players', message: 'Не меньше, чем «от»' }
      : undefined;
  });
  required(game.playTime, { message: 'Нужно число' });
  min(game.playTime, 1, { message: 'Хотя бы минута' });
  required(game.age, { message: 'Нужно число' });
  min(game.age, 0, { message: 'Не меньше нуля' });
});
