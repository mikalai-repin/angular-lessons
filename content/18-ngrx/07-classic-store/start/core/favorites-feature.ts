import { createFeature, createReducer } from '@ngrx/store';

// Состояние избранного: id игр, отмеченных сердечком
interface FavoritesState {
  ids: number[];
}

const initialState: FavoritesState = { ids: [] };

// Избранное в классическом Store: часть общего состояния под ключом favorites
export const favoritesFeature = createFeature({
  name: 'favorites',
  // TODO: on(GameCardActions.favoriteToggled, …) — добавить id или убрать, если он уже есть
  reducer: createReducer(initialState),
  // TODO: extraSelectors — selectCount: сколько игр в избранном
});
