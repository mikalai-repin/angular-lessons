import { Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CompareStore } from '../core/compare-store';
import { DurationPipe } from '../shared/duration-pipe';
import { PlayersPipe } from '../shared/players-pipe';
import { PricePipe } from '../shared/price-pipe';

// Страница /compare: игры из сравнения рядом в таблице
@Component({
  selector: 'app-compare-page',
  imports: [
    DecimalPipe,
    DurationPipe,
    PlayersPipe,
    PricePipe,
    RouterLink,
  ],
  templateUrl: './compare-page.html',
  styleUrl: './compare-page.css',
})
export class ComparePage {
  protected readonly compare = inject(CompareStore);

  // Лучшие значения: самая низкая цена и самый высокий рейтинг.
  // Одну игру сравнивать не с чем — подсвечивать нечего
  protected readonly best = computed(() => {
    const games = this.compare.games();
    if (games.length < 2) {
      return null;
    }
    return {
      price: Math.min(...games.map((game) => game.price)),
      rating: Math.max(...games.map((game) => game.rating)),
    };
  });
}
