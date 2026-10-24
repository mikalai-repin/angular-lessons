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
// TODO: декоратор сервиса, который сам в DI не попадает (его выдаст провайдер маршрута админки)
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

  private log(text: string) {
    this.changesState.update((changes) => [
      { text, time: new Date() },
      ...changes,
    ]);
  }
}
