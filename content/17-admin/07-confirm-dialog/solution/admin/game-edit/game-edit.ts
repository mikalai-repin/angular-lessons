import {
  Component,
  inject,
  input,
  linkedSignal,
  numberAttribute,
} from '@angular/core';
import {
  HttpContext,
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';
import { FormRoot, form } from '@angular/forms/signals';
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';
import { CACHE } from '../../core/cache-interceptor';
import { Game } from '../../core/models';
import { AdminGames } from '../admin-games';
import { GameFields } from '../game-fields/game-fields';
import { GameDraft, gameSchema, toDraft } from '../game-schema';

// Пустой черновик: пока игра не пришла с сервера, форму не показываем, но модель у неё уже есть
const EMPTY: GameDraft = {
  title: '',
  category: 'family',
  cover: '',
  price: null,
  oldPrice: null,
  inStock: null,
  players: { min: null, max: null },
  playTime: null,
  age: null,
  description: '',
};

// Страница редактирования игры: форма с данными с сервера, «Сохранить» — PUT /api/games/:id
@Component({
  selector: 'app-game-edit',
  imports: [FormRoot, GameFields, RouterLink],
  templateUrl: './game-edit.html',
  styleUrl: './game-edit.css',
})
export class GameEdit {
  // Параметр маршрута :id — во вход его кладёт роутер
  readonly id = input.required({ transform: numberAttribute });

  private readonly admin = inject(AdminGames);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Игра с сервера. Метка CACHE: только что эту игру загрузил резолвер крошки — ответ возьмём из кэша
  protected readonly game = httpResource<Game>(() => ({
    url: `/api/games/${this.id()}`,
    context: new HttpContext().set(CACHE, true),
  }));

  // Черновик — модель формы. Пришла игра с сервера — черновик начинается с неё
  private readonly draft = linkedSignal<GameDraft>(() =>
    this.game.hasValue() ? toDraft(this.game.value()) : EMPTY,
  );
  protected readonly gameForm = form(this.draft, gameSchema, {
    submission: { action: () => this.save() },
  });

  // Есть ли что потерять: админ менял форму и не сохранил
  hasUnsavedChanges() {
    return this.gameForm().dirty();
  }

  // Сохранение: черновик — на сервер через сервис раздела, затем — обратно в таблицу.
  // Ошибку, которую вернёт функция, форма покажет у себя
  private async save() {
    try {
      await this.admin.save(this.id(), this.draft());
      // Сохранено — терять больше нечего: форма снова «нетронутая», гард не спросит
      this.gameForm().reset();
      this.router.navigate(['..'], { relativeTo: this.route });
      return undefined;
    } catch (error) {
      return {
        kind: 'server',
        // 400 — сервер не принял данные и пишет почему
        message:
          error instanceof HttpErrorResponse &&
          error.status === 400
            ? error.error.message
            : 'Не удалось сохранить. Попробуйте ещё раз',
      };
    }
  }
}
