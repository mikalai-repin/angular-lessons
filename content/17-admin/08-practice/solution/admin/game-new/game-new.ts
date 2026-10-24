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

  private readonly draft = signal<GameDraft>(NEW_GAME);
  protected readonly gameForm = form(this.draft, gameSchema, {
    submission: { action: () => this.create() },
  });

  // Есть ли что потерять: админ начал заполнять форму и не добавил игру
  hasUnsavedChanges() {
    return this.gameForm().dirty();
  }

  // Добавить игру и вернуться в таблицу — с поиском по её названию, чтобы её было видно сразу
  private async create() {
    try {
      const game = await this.admin.create(this.draft());
      this.gameForm().reset();
      this.router.navigate(['..'], {
        relativeTo: this.route,
        queryParams: { q: game.title },
      });
      return undefined;
    } catch (error) {
      return {
        kind: 'server',
        message:
          error instanceof HttpErrorResponse &&
          error.status === 400
            ? error.error.message
            : 'Не удалось добавить игру. Попробуйте ещё раз',
      };
    }
  }
}
