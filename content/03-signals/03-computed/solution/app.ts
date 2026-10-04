import { Component, computed, signal } from '@angular/core';
import { GAMES } from './core/games-data';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Номер игры в каталоге — единственное, что меняет переключатель
  protected readonly gameIndex = signal(0);
  protected readonly gamesCount = GAMES.length;

  // Всё остальное о карточке вычисляется из gameIndex
  protected readonly game = computed(() => GAMES[this.gameIndex()]);
  protected readonly soldOut = computed(() => this.game().inStock === 0);
  protected readonly discount = computed(() => {
    const { price, oldPrice } = this.game();
    return oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;
  });

  protected readonly cartCount = signal(0);

  protected showPrevious() {
    this.gameIndex.update((index) => (index - 1 + GAMES.length) % GAMES.length);
  }

  protected showNext() {
    this.gameIndex.update((index) => (index + 1) % GAMES.length);
  }

  protected addToCart() {
    this.cartCount.update((count) => count + 1);
  }

  protected search(query: string) {
    console.log('Ищем:', query);
  }
}
