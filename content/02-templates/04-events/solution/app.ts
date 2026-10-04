import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = 'Остров сокровищ';
  protected readonly price = 1990;
  protected readonly cover = '/assets/covers/treasure-island.svg';
  protected readonly inStock: number = 12;
  protected readonly rating = 4.6;

  protected addToCart() {
    console.log('Добавлено в корзину:', this.title);
  }

  protected search(event: Event) {
    const input = event.target as HTMLInputElement;
    console.log('Ищем:', input.value);
  }
}
