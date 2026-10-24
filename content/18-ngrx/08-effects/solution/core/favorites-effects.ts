import { inject } from '@angular/core';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import {
  Actions,
  ROOT_EFFECTS_INIT,
  createEffect,
  ofType,
} from '@ngrx/effects';
import { map, tap } from 'rxjs';
import { GameCardActions } from '../shared/game-card/game-card-actions';
import { FavoritesStorageActions } from './favorites-storage-actions';
import { favoritesFeature } from './favorites-feature';

// Ключ избранного в localStorage
const STORAGE_KEY = 'hod-konem:favorites:v1';

// Эффект: при запуске эффектов прочитать избранное и сообщить об этом действием
export const restoreFavorites = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      map(() =>
        FavoritesStorageActions.restored({ ids: readIds() }),
      ),
    ),
  { functional: true },
);

// Эффект: после каждого переключения сердечка записать избранное.
// dispatch: false — эффект ничего не отправляет обратно в Store
export const saveFavorites = createEffect(
  (actions$ = inject(Actions), store = inject(Store)) =>
    actions$.pipe(
      ofType(GameCardActions.favoriteToggled),
      // К действию — текущие id из Store: редьюсер уже обработал это действие
      concatLatestFrom(() =>
        store.select(favoritesFeature.selectIds),
      ),
      tap(([, ids]) =>
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)),
      ),
    ),
  { functional: true, dispatch: false },
);

// Избранное из localStorage: только целые положительные id. Есть ли такие игры, скажет сервер
function readIds(): number[] {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    );
    return Array.isArray(saved)
      ? saved.filter((id) => Number.isInteger(id) && id > 0)
      : [];
  } catch {
    return [];
  }
}
