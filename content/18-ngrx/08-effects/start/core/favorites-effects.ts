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

// TODO: эффект restoreFavorites — на ROOT_EFFECTS_INIT отправить FavoritesStorageActions.restored({ ids: readIds() })

// TODO: эффект saveFavorites — после GameCardActions.favoriteToggled записать id из Store в localStorage
// (concatLatestFrom + store.select(favoritesFeature.selectIds)); ничего не отправляет: dispatch: false

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
