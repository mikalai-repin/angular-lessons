import { Game } from '../core/models';

// Игра для тестов: все поля заполнены. Тесту важны одно-два поля — их и переопределяем:
// fakeGame({ price: 500 }), fakeGame({ id: 2, inStock: 0 })
export function fakeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 1,
    slug: 'test-game',
    title: 'Тестовая игра',
    cover: '/assets/covers/treasure-island.svg',
    price: 1000,
    category: 'family',
    players: { min: 2, max: 4 },
    playTime: 30,
    age: 8,
    rating: 4.5,
    inStock: 10,
    description: '',
    tags: [],
    ...overrides,
  };
}
