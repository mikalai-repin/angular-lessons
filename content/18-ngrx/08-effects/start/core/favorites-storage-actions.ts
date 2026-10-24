import { createActionGroup, props } from '@ngrx/store';

// Действия хранилища браузера: избранное прочитано из localStorage
export const FavoritesStorageActions = createActionGroup({
  source: 'Favorites Storage',
  events: {
    Restored: props<{ ids: number[] }>(),
  },
});
