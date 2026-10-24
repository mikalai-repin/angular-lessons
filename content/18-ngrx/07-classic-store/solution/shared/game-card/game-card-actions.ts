import { createActionGroup, props } from '@ngrx/store';

// Действия карточки игры — что в ней произошло. Тип действия: '[Game Card] Favorite Toggled'
export const GameCardActions = createActionGroup({
  source: 'Game Card',
  events: {
    // props — данные, которые действие несёт с собой
    'Favorite Toggled': props<{ gameId: number }>(),
  },
});
