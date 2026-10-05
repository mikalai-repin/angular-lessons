import { Service, computed, signal } from '@angular/core';
import { Game } from './models';

// Избранное: игры, которые покупатель отметил сердечком
@Service()
export class FavoritesStore {
  // id игр в избранном. Массив не меняем, а заменяем новым
  private readonly ids = signal<number[]>([]);

  readonly count = computed(() => this.ids().length);

  has(game: Game): boolean {
    return this.ids().includes(game.id);
  }

  toggle(game: Game) {
    this.ids.update((ids) =>
      ids.includes(game.id)
        ? ids.filter((id) => id !== game.id)
        : [...ids, game.id],
    );
  }
}
