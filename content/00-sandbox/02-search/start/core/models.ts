export interface Game {
  id: number;
  slug: string;
  title: string;
  cover: string;
  price: number;
  oldPrice?: number;
  category: string;
  players: { min: number; max: number };
  playTime: number;
  age: number;
  rating: number;
  inStock: number;
  description: string;
  tags: string[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
