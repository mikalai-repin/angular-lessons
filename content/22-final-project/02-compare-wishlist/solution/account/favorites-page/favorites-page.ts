import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { favoritesFeature } from '../../core/favorites-feature';
import { GamesByIds } from '../../core/games-by-ids';
import { SHOP_CONFIG } from '../../core/shop-config';
import { GameCard } from '../../shared/game-card/game-card';

// Раздел кабинета «Избранное»: игры, отмеченные сердечком
@Component({
  selector: 'app-favorites-page',
  imports: [GameCard, RouterLink],
  templateUrl: './favorites-page.html',
})
export class FavoritesPage {
  // id игр в избранном — из Store
  protected readonly ids = inject(Store).selectSignal(
    favoritesFeature.selectIds,
  );
  private readonly gamesByIds = inject(GamesByIds);
  // Первые обложки — на первом экране: их грузим в первую очередь
  protected readonly priorityCovers =
    inject(SHOP_CONFIG).priorityCovers;

  // Игры из избранного
  protected readonly games = rxResource({
    // Параметры загрузки. undefined — загружать нечего: ресурс в статусе idle
    params: () => {
      const ids = this.ids();
      return ids.length > 0 ? ids : undefined;
    },
    // Поток вместо промиса. Изменился список — ресурс отпишется от прежнего потока,
    // и незаконченные запросы отменятся
    stream: ({ params }) => this.gamesByIds.load(params),
  });
}
