import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Game, GamesPage } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class GamesService {
  constructor(private http: HttpClient) {}

  getGames(query: string): Observable<Game[]> {
    return this.http
      .get<GamesPage>('/api/games', {
        params: { q: query, size: 6 },
      })
      .pipe(map((page) => page.items));
  }
}
