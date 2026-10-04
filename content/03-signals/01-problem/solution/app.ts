import { Component } from '@angular/core';
import { GAMES } from './core/games-data';

// Через сколько миллисекунд «сервер» подтверждает добавление в корзину
const SERVER_DELAY = 500;

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Игра для карточки. Попробуйте GAMES[6]: её нет в наличии, и у неё нет старой цены
  protected readonly game = GAMES[0];
  protected cartCount = 0;

  protected addToCart() {
    // Как будто ждём ответа сервера: счётчик меняется не сразу
    setTimeout(() => {
      this.cartCount++;
      console.log('В корзине:', this.cartCount);
    }, SERVER_DELAY);
  }

  protected search(query: string) {
    console.log('Ищем:', query);
  }
}
