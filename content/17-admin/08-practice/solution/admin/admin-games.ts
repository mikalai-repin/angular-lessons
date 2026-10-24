import { Service, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Game } from '../core/models';
import { GameDraft } from './game-schema';

// Запись журнала: что сделано и когда
export interface Change {
  text: string;
  time: Date;
}

// Изменения каталога из админки: запросы к серверу и журнал того, что сделано за сеанс.
// autoProvided: false — сам в DI не попадает: его выдаёт провайдер маршрута админки
@Service({ autoProvided: false })
export class AdminGames {
  private readonly http = inject(HttpClient);

  private readonly changesState = signal<Change[]>([]);
  // Журнал: новые записи — сверху
  readonly changes = this.changesState.asReadonly();

  // Сохранить игру: PUT /api/games/:id. Ответ сервера — игра, какой она стала
  async save(id: number, draft: GameDraft) {
    const game = await firstValueFrom(
      this.http.put<Game>(`/api/games/${id}`, draft),
    );
    this.log(`Изменена игра «${game.title}»`);
    return game;
  }

  // Удалить игру: DELETE /api/games/:id
  async remove(game: Game) {
    await firstValueFrom(
      this.http.delete(`/api/games/${game.id}`),
    );
    this.log(`Удалена игра «${game.title}»`);
  }

  // Добавить игру: POST /api/games. Ответ — игра с id, который выдал сервер
  async create(draft: GameDraft) {
    const game = await firstValueFrom(
      this.http.post<Game>('/api/games', draft),
    );
    this.log(`Добавлена игра «${game.title}»`);
    return game;
  }

  // Загрузить обложку: файл — в теле FormData (multipart/form-data). Ответ — адрес картинки
  async uploadCover(file: File) {
    const body = new FormData();
    body.append('file', file);
    const { url } = await firstValueFrom(
      this.http.post<{ url: string }>('/api/covers', body),
    );
    return url;
  }

  private log(text: string) {
    this.changesState.update((changes) => [
      { text, time: new Date() },
      ...changes,
    ]);
  }
}
