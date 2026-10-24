import {
  createFeature,
  createReducer,
  createSelector,
  on,
} from '@ngrx/store';
import { GameCardActions } from '../shared/game-card/game-card-actions';

// Состояние избранного: id игр, отмеченных сердечком
interface FavoritesState {
  ids: number[];
}

const initialState: FavoritesState = { ids: [] };

// Избранное в классическом Store: часть общего состояния под ключом favorites
export const favoritesFeature = createFeature({
  name: 'favorites',
  // Редьюсер: чистая функция (состояние, действие) → новое состояние
  reducer: createReducer(
    initialState,
    on(
      GameCardActions.favoriteToggled,
      (state, { gameId }) => ({
        ids: state.ids.includes(gameId)
          ? state.ids.filter((id) => id !== gameId)
          : [...state.ids, gameId],
      }),
    ),
  ),
  // Селекторы selectFavoritesState и selectIds createFeature создаст сам, свои — здесь
  extraSelectors: ({ selectIds }) => ({
    selectCount: createSelector(selectIds, (ids) => ids.length),
  }),
});
