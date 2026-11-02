import { Component, inject, input } from '@angular/core';
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
import { Game } from '../core/models';
import { SHOP_CONFIG } from '../core/shop-config';
import { GameCard } from '../shared/game-card/game-card';

// Страница /wishlist?ids=3,7,12: список желаний по ссылке. Открывается без входа
// и не трогает избранное того, кто открыл: список — в адресе, а не в Store
@Component({
  selector: 'app-wishlist-page',
  imports: [GameCard, RouterLink],
  templateUrl: './wishlist-page.html',
})
export class WishlistPage {
  // Параметр ?ids= из адреса: withComponentInputBinding кладёт его во вход.
  // Ссылку может набрать кто угодно — оставляем только целые положительные id, без повторов
  readonly ids = input<number[], string | undefined>([], {
    transform: toIds,
  });
  private readonly http = inject(HttpClient);
  protected readonly priorityCovers =
    inject(SHOP_CONFIG).priorityCovers;

  // Игры по списку id — как в FavoritesPage: запрос на каждую, пропавшие из каталога (404) — пропускаем
  protected readonly games = rxResource({
    params: () => {
      const ids = this.ids();
      return ids.length > 0 ? ids : undefined;
    },
    stream: ({ params }) =>
      forkJoin(params.map((id) => this.loadGame(id))).pipe(
        map((games) => games.filter((game) => game !== null)),
      ),
  });

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

// '3,7,abc,3' → [3, 7]
function toIds(value: string | undefined): number[] {
  const ids = (value ?? '')
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  return [...new Set(ids)];
}
