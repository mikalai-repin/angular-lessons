import { Component } from '@angular/core';

// Обложки, которые летят в корзину. Стоят в шапке рядом со ссылкой на корзину
@Component({
  selector: 'app-flying-covers',
  templateUrl: './flying-covers.html',
  styleUrl: './flying-covers.css',
})
export class FlyingCovers {
  // TODO: куда лететь — элемент ссылки на корзину (вход)
  // TODO: обложки в полёте — из FlyToCart; полёт — анимация из кода при появлении обложки
}
