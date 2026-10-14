import {
  Service,
  computed,
  effect,
  signal,
} from '@angular/core';
import { Game } from './models';

// Ключ избранного в localStorage
const STORAGE_KEY = 'hod-konem:favorites:v1';

// Избранное: игры, которые покупатель отметил сердечком
@Service()
export class FavoritesStore {
  // id игр в избранном. Массив не меняем, а заменяем новым
  private readonly state = signal<number[]>(loadFavorites());
  // Снаружи — только чтение: страница «Избранное» загрузит игры по этим id
  readonly ids = this.state.asReadonly();

  readonly count = computed(() => this.ids().length);

  has(game: Game): boolean {
    return this.ids().includes(game.id);
  }

  toggle(game: Game) {
    this.state.update((ids) =>
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

// Избранное из localStorage: только целые положительные id. Есть ли такие игры, скажет сервер
function loadFavorites(): number[] {
  try {
    const ids: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    );
    return Array.isArray(ids)
      ? ids.filter((id) => Number.isInteger(id) && id > 0)
      : [];
  } catch {
    return [];
  }
}
