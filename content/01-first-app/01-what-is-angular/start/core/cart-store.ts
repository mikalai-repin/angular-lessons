import { computed, Service, signal } from '@angular/core';
import { Game } from './models';

export interface CartItem {
  game: Game;
  quantity: number;
}

// @Service() — сервис, который сам доступен во всём приложении (Angular 22)
@Service()
export class CartStore {
  private readonly items = signal<CartItem[]>([]);

  readonly list = this.items.asReadonly();
  readonly count = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0),
  );
  readonly total = computed(() =>
    this.items().reduce(
      (sum, item) => sum + item.game.price * item.quantity,
      0,
    ),
  );

  add(game: Game) {
    this.items.update((items) => {
      const existing = items.find(
        (item) => item.game.id === game.id,
      );
      return existing
        ? items.map((item) =>
            item === existing
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          )
        : [...items, { game, quantity: 1 }];
    });
  }

  remove(gameId: number) {
    this.items.update((items) =>
      items.filter((item) => item.game.id !== gameId),
    );
  }
}
