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

// Страница каталога, которую присылает сервер: GET /api/games
export interface GamesPage {
  items: Game[]; // игры этой страницы
  total: number; // сколько игр нашлось всего
  page: number; // номер страницы, с 1
  size: number; // сколько игр на странице
}

// Отзыв об игре: GET /api/games/:id/reviews
export interface Review {
  id: number;
  gameId: number;
  author: string;
  rating: number; // от 1 до 5
  text: string;
  date: string; // '2026-09-01'
}

// Позиция корзины: какая игра и сколько штук. Позицию не меняют, а заменяют новой
export interface CartItem {
  readonly game: Game;
  readonly quantity: number;
}
