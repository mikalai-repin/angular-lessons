import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartStore } from '../core/cart-store';
import { PricePipe } from '../shared/price-pipe';

// Оформление заказа. Пока здесь только сводка и комментарий — форма доставки и оплаты появится позже
@Component({
  selector: 'app-checkout',
  imports: [PricePipe, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  protected readonly cart = inject(CartStore);

  // Комментарий к заказу — состояние интерфейса этой страницы
  protected readonly comment = signal('');

  // Есть ли что потерять, если уйти со страницы. Об этом спрашивает гард canDeactivate
  hasUnsavedChanges(): boolean {
    return this.comment().trim() !== '';
  }
}
