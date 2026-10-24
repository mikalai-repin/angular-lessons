import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormRoot, form } from '@angular/forms/signals';
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';
import { AdminGames } from '../admin-games';
import { GameFields } from '../game-fields/game-fields';
import { GameDraft, gameSchema } from '../game-schema';

// Новая игра: черновик с разумными значениями, которые админ поправит
const NEW_GAME: GameDraft = {
  title: '',
  category: 'family',
  cover: '',
  price: null,
  oldPrice: null,
  inStock: 0,
  players: { min: 2, max: 4 },
  playTime: 30,
  age: 8,
  description: '',
};

// Страница «Новая игра»: те же поля, что у редактирования, «Добавить» — POST /api/games
@Component({
  selector: 'app-game-new',
  imports: [FormRoot, GameFields, RouterLink],
  templateUrl: './game-new.html',
})
export class GameNew {
  private readonly admin = inject(AdminGames);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // TODO: черновик NEW_GAME — модель формы; форма со схемой gameSchema, отправка — create()

  // TODO: hasUnsavedChanges() — для гарда несохранённой формы

  // TODO: create(): admin.create(черновик), сбросить форму, перейти в таблицу с поиском по названию новой игры;
  // ошибка 400 — сообщение сервера у формы
}
