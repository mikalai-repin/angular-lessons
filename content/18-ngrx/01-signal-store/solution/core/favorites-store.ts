import { effect } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Game } from './models';

// Ключ избранного в localStorage
const STORAGE_KEY = 'hod-konem:favorites:v1';

// Состояние избранного: id игр, отмеченных сердечком
interface FavoritesState {
  ids: number[];
}

// Избранное: игры, которые покупатель отметил сердечком.
// signalStore собирает хранилище из частей и возвращает класс — его выдаёт DI, как наш сервис раньше
export const FavoritesStore = signalStore(
  // Один экземпляр на приложение — как @Service()
  { providedIn: 'root' },
  // Состояние: для каждого поля хранилище заведёт сигнал. Начальное — из localStorage
  withState<FavoritesState>(() => ({ ids: loadFavorites() })),
  // Производные значения: функция становится computed
  withComputed(({ ids }) => ({
    count: () => ids().length,
  })),
  // Действия: менять состояние можно только здесь — через patchState
  withMethods((store) => ({
    has(game: Game): boolean {
      return store.ids().includes(game.id);
    },
    toggle(game: Game) {
      patchState(store, ({ ids }) => ({
        ids: ids.includes(game.id)
          ? ids.filter((id) => id !== game.id)
          : [...ids, game.id],
      }));
    },
  })),
  // Хуки: onInit выполняется, когда хранилище создано, — как конструктор сервиса
  withHooks({
    onInit(store) {
      // Побочный эффект: при каждом изменении избранного записываем его в localStorage
      effect(() =>
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(store.ids()),
        ),
      );
    },
  }),
);

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
