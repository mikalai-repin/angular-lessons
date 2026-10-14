import { Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesStore } from '../../core/favorites-store';
import { Game } from '../../core/models';
import { GameCard } from '../../shared/game-card/game-card';

// Раздел кабинета «Избранное»: игры, отмеченные сердечком
@Component({
  selector: 'app-favorites-page',
  imports: [GameCard, RouterLink],
  templateUrl: './favorites-page.html',
})
export class FavoritesPage {
  protected readonly favorites = inject(FavoritesStore);

  // Игры из избранного. Запроса «игры по списку id» в API нет — загрузчик делает свой запрос на каждую игру
  protected readonly games = resource({
    // Параметры загрузки. undefined — загружать нечего: ресурс в статусе idle
    params: () => {
      const ids = this.favorites.ids();
      return ids.length > 0 ? ids : undefined;
    },
    loader: ({ params, abortSignal }) =>
      loadGames(params, abortSignal),
  });
}

// Игры по списку id: запросы идут параллельно. abortSignal отменит их все, если список изменился раньше ответа
async function loadGames(
  ids: readonly number[],
  abortSignal: AbortSignal,
): Promise<Game[]> {
  const games = await Promise.all(
    ids.map(async (id) => {
      const response = await fetch(`/api/games/${id}`, {
        signal: abortSignal,
      });
      // Игры больше нет в каталоге — пропускаем её
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Игра ${id}: ответ ${response.status}`);
      }
      return (await response.json()) as Game;
    }),
  );
  return games.filter((game) => game !== null);
}
