import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Game } from './models';
import { withStorage } from './with-storage';

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
  // Состояние: для каждого поля хранилище заведёт сигнал
  withState<FavoritesState>({ ids: [] }),
  // Сохранение — общим расширением, как у корзины
  withStorage(STORAGE_KEY, {
    save: ({ ids }) => ids,
    restore: (saved) => ({ ids: toIds(saved) }),
  }),
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
);

// Избранное из сохранённого: только целые положительные id. Есть ли такие игры, скажет сервер
function toIds(saved: unknown): number[] {
  return Array.isArray(saved)
    ? saved.filter((id) => Number.isInteger(id) && id > 0)
    : [];
}
