import { Service } from '@angular/core';
import { CartStore } from './cart-store';
import { GAMES } from './games-data';

// Корзина для показа магазина: при запуске в ней уже лежат игры.
// autoProvided: false — сама по себе в DI не попадает, её подставляет провайдер в app.config.ts
@Service({ autoProvided: false })
export class DemoCartStore extends CartStore {
  constructor() {
    super();
    this.items.set([
      { game: GAMES[0], quantity: 2 },
      { game: GAMES[4], quantity: 1 },
    ]);
  }
}
