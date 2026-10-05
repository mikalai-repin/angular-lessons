import { Component, input } from '@angular/core';
import { PricePipe } from '../../shared/price-pipe';

// Шапка магазина: логотип и сводка корзины
@Component({
  selector: 'app-header',
  imports: [PricePipe],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  // TODO: брать корзину из cartStore, а не из входов
  // Сколько штук в корзине и на какую сумму. Корзина живёт в App — оттуда и приходят числа
  readonly count = input(0);
  readonly total = input(0);
}
