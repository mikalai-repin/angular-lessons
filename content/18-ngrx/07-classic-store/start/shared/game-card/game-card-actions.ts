import { createActionGroup } from '@ngrx/store';

// Действия карточки игры — что в ней произошло
// TODO: действие 'Favorite Toggled' с данными { gameId: number } (props из '@ngrx/store')
export const GameCardActions = createActionGroup({
  source: 'Game Card',
  events: {},
});
