// Типы данных магазина
export interface Game {
  id: number;
  slug: string;
  title: string;
  cover: string;
  price: number; // в рублях
  oldPrice?: number; // цена до скидки, если скидка есть
  category:
    'family' | 'strategy' | 'party' | 'cooperative' | 'kids';
  players: { min: number; max: number };
  playTime: number; // минуты
  age: number; // с какого возраста
  rating: number; // от 0 до 5
  inStock: number; // остаток на складе
  description: string; // может содержать разметку: <b>, <i>
  tags: string[];
}
