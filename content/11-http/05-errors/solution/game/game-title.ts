import { inject } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { ResolveFn } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Game } from '../core/models';

// Заголовок страницы игры — её название с сервера. Резолвер возвращает промис: роутер дождётся ответа
export const gameTitleResolver: ResolveFn<string> = async (
  route,
) => {
  // inject — до первого await: после него контекст внедрения уже закончился
  const http = inject(HttpClient);
  try {
    // firstValueFrom подписывается на Observable и возвращает промис первого значения
    const game = await firstValueFrom(
      http.get<Game>(`/api/games/${route.paramMap.get('id')}`),
    );
    return game.title;
  } catch (error) {
    return error instanceof HttpErrorResponse &&
      error.status === 404
      ? 'Игра не найдена'
      : 'Игра';
  }
};
