import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesStore } from '../../core/favorites-store';
import { GameCard } from '../../shared/game-card/game-card';

// Раздел кабинета «Избранное»: игры, отмеченные сердечком
@Component({
  selector: 'app-favorites-page',
  imports: [GameCard, RouterLink],
  templateUrl: './favorites-page.html',
})
export class FavoritesPage {
  protected readonly favorites = inject(FavoritesStore);
}
