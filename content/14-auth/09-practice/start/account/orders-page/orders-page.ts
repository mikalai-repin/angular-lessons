import { Component } from '@angular/core';

// Раздел кабинета «Заказы». Заказы появятся, когда в магазине можно будет оформить заказ
@Component({
  selector: 'app-orders-page',
  templateUrl: './orders-page.html',
  styleUrl: './orders-page.css',
})
export class OrdersPage {
  // TODO: заказы покупателя с сервера — GET /api/orders
}
