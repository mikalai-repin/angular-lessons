import { createActionGroup, props } from '@ngrx/store';

// Действия страницы «Избранное» — что на ней произошло
export const FavoritesPageActions = createActionGroup({
  source: 'Favorites Page',
  events: {
    // Сервер не нашёл этих игр (404): их больше нет в каталоге
    'Missing Games Found': props<{ gameIds: number[] }>(),
  },
});
