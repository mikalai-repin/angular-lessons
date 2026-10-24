import {
  Component,
  inject,
  input,
  linkedSignal,
  numberAttribute,
} from '@angular/core';
import {
  HttpClient,
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
import { firstValueFrom } from 'rxjs';
import { CACHE } from '../../core/cache-interceptor';
import { Game } from '../../core/models';
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

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Игра с сервера. Метка CACHE: только что эту игру загрузил резолвер крошки — ответ возьмём из кэша
  protected readonly game = httpResource<Game>(() => ({
    url: `/api/games/${this.id()}`,
    context: new HttpContext().set(CACHE, true),
  }));

  // TODO: черновик — модель формы: пришла игра с сервера — черновик начинается с неё (linkedSignal)
  private readonly draft = linkedSignal<GameDraft>(() => EMPTY);

  // TODO: форма поверх черновика со схемой gameSchema; отправка — save()
}
