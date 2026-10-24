import {
  patchState,
  signalMethod,
  signalStore,
  withMethods,
} from '@ngrx/signals';
import {
  prependEntity,
  removeEntities,
  removeEntity,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { Game } from './models';
import { withStorage } from './with-storage';

// Ключ списка в localStorage
const STORAGE_KEY = 'hod-konem:recent:v1';
// Сколько последних игр помнить
const MAX_RECENT = 4;

// «Вы смотрели»: последние открытые игры, самая свежая — первой
export const RecentStore = signalStore(
  { providedIn: 'root' },
  // Коллекция игр: у игры есть id — selectId не нужен
  withEntities<Game>(),
  withStorage(STORAGE_KEY, {
    save: ({ ids, entityMap }) =>
      ids.map((id) => entityMap[id]),
    restore: (saved) => setAllEntities(toGames(saved)),
  }),
  withMethods((store) => ({
    // Запомнить игру. Принимает и сигнал: тогда запоминает каждое новое значение.
    // undefined — игра ещё не загрузилась, запоминать нечего
    remember: signalMethod<Game | undefined>((game) => {
      if (!game) {
        return;
      }
      // Кто выпадет из списка: все, кроме этой игры, после первых MAX_RECENT − 1
      const extra = store
        .ids()
        .filter((id) => id !== game.id)
        .slice(MAX_RECENT - 1);
      // Игра уже в списке — переезжает в начало: убрать и добавить первой
      patchState(
        store,
        removeEntity(game.id),
        prependEntity(game),
        removeEntities(extra),
      );
    }),
  })),
);

// Игры из сохранённого: только объекты с числовым id и названием, не больше MAX_RECENT
function toGames(saved: unknown): Game[] {
  return Array.isArray(saved)
    ? saved
        .filter(
          (game: Partial<Game> | null) =>
            Number.isInteger(game?.id) &&
            typeof game?.title === 'string',
        )
        .slice(0, MAX_RECENT)
    : [];
}
