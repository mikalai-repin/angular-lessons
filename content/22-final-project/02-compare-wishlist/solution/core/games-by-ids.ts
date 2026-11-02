import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { Service, inject } from '@angular/core';
import {
  Observable,
  catchError,
  forkJoin,
  map,
  of,
  throwError,
} from 'rxjs';
import { Game } from './models';

// Игры по списку id: для избранного и для списка желаний по ссылке
@Service()
export class GamesByIds {
  private readonly http = inject(HttpClient);

  // Запроса «игры по списку id» в API нет — запрос на каждую игру. Все запросы сразу,
  // ответ — когда придут все; игр, которых больше нет в каталоге, в ответе нет
  load(ids: readonly number[]): Observable<Game[]> {
    return forkJoin(ids.map((id) => this.loadGame(id))).pipe(
      map((games) => games.filter((game) => game !== null)),
    );
  }

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
