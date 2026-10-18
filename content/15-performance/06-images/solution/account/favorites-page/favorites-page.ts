import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  Observable,
  catchError,
  forkJoin,
  map,
  of,
  throwError,
} from 'rxjs';
import { FavoritesStore } from '../../core/favorites-store';
import { Game } from '../../core/models';
import { SHOP_CONFIG } from '../../core/shop-config';
import { GameCard } from '../../shared/game-card/game-card';

// Раздел кабинета «Избранное»: игры, отмеченные сердечком
@Component({
  selector: 'app-favorites-page',
  imports: [GameCard, RouterLink],
  templateUrl: './favorites-page.html',
})
export class FavoritesPage {
  protected readonly favorites = inject(FavoritesStore);
  private readonly http = inject(HttpClient);
  // Первые обложки — на первом экране: их грузим в первую очередь
  protected readonly priorityCovers =
    inject(SHOP_CONFIG).priorityCovers;

  // Игры из избранного. Запроса «игры по списку id» в API нет — запрос на каждую игру
  protected readonly games = rxResource({
    // Параметры загрузки. undefined — загружать нечего: ресурс в статусе idle
    params: () => {
      const ids = this.favorites.ids();
      return ids.length > 0 ? ids : undefined;
    },
    // Поток вместо промиса: все запросы сразу, ответ — когда придут все.
    // Изменился список — ресурс отпишется от прежнего потока, и незаконченные запросы отменятся
    stream: ({ params }) =>
      forkJoin(params.map((id) => this.loadGame(id))).pipe(
        map((games) => games.filter((game) => game !== null)),
      ),
  });

  // Игра по id. Игры больше нет в каталоге (404) — null, другие ошибки идут дальше по потоку
  private loadGame(id: number): Observable<Game | null> {
    return this.http
      .get<Game>(`/api/games/${id}`)
      .pipe(
        catchError((error: unknown) =>
          error instanceof HttpErrorResponse &&
          error.status === 404
            ? of(null)
            : throwError(() => error),
        ),
      );
  }
}
