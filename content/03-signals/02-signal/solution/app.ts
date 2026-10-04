import { Component, signal } from '@angular/core';
import { GAMES } from './core/games-data';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Игра для карточки. Попробуйте GAMES[6]: её нет в наличии, и у неё нет старой цены
  protected readonly game = GAMES[0];
  protected readonly cartCount = signal(0);

  protected addToCart() {
    this.cartCount.update((count) => count + 1);
  }

  protected search(query: string) {
    console.log('Ищем:', query);
  }
}
