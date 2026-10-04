import { Component } from '@angular/core';
import { GAMES } from './core/games-data';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // TODO: замените поля ниже одним полем game = GAMES[0] и выведите его данные в шаблоне
  protected readonly title = 'Остров сокровищ';
  protected readonly price = 1990;
  protected readonly oldPrice = 2490;
  protected readonly cover = '/assets/covers/treasure-island.svg';
  protected readonly inStock: number = 12;
  protected readonly rating = 4.6;
  protected readonly description =
    'Команды пиратов ищут клад на острове, который <b>меняется каждую партию</b>: карта собирается из квадратных тайлов.';

  protected addToCart() {
    console.log('Добавлено в корзину:', this.title);
  }

  protected search(query: string) {
    console.log('Ищем:', query);
  }
}
