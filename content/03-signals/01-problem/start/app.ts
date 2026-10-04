import { Component } from '@angular/core';
import { GAMES } from './core/games-data';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Игра для карточки. Попробуйте GAMES[6]: её нет в наличии, и у неё нет старой цены
  protected readonly game = GAMES[0];

  // TODO: добавьте поле cartCount и увеличивайте его в addToCart
  protected addToCart() {
    console.log('Добавлено в корзину:', this.game.title);
  }

  protected search(query: string) {
    console.log('Ищем:', query);
  }
}
