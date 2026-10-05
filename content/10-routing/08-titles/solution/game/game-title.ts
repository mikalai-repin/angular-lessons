import { ResolveFn } from '@angular/router';
import { GAMES } from '../core/games-data';

// Заголовок страницы игры — её название. Роутер вызывает резолвер до того, как показать страницу
export const gameTitleResolver: ResolveFn<string> = (route) => {
  const id = Number(route.paramMap.get('id'));
  return (
    GAMES.find((game) => game.id === id)?.title ??
    'Игра не найдена'
  );
};
