import {
  Service,
  computed,
  effect,
  signal,
} from '@angular/core';
import { GAMES } from './games-data';
import { Game } from './models';

// Ключ избранного в localStorage
const STORAGE_KEY = 'hod-konem:favorites:v1';

// Избранное: игры, которые покупатель отметил сердечком
@Service()
export class FavoritesStore {
  // id игр в избранном. Массив не меняем, а заменяем новым
  private readonly ids = signal<number[]>(loadFavorites());

  readonly count = computed(() => this.ids().length);
  // Игры из избранного — для страницы «Избранное» в кабинете
  readonly games = computed(() =>
    GAMES.filter((game) => this.ids().includes(game.id)),
  );

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

  constructor() {
    // Побочный эффект: при каждом изменении избранного записываем его в localStorage
    effect(() =>
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(this.ids()),
      ),
    );
  }
}

// Избранное из localStorage: только id игр, которые есть в каталоге
function loadFavorites(): number[] {
  try {
    const ids: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    );
    return Array.isArray(ids)
      ? ids.filter((id) => GAMES.some((game) => game.id === id))
      : [];
  } catch {
    return [];
  }
}
