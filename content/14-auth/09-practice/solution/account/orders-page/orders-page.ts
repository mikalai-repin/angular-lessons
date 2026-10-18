import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Order } from '../../core/models';
import { PricePipe } from '../../shared/price-pipe';

// Раздел кабинета «Заказы»: заказы, оформленные после входа
@Component({
  selector: 'app-orders-page',
  imports: [DatePipe, PricePipe, RouterLink],
  templateUrl: './orders-page.html',
  styleUrl: './orders-page.css',
})
export class OrdersPage {
  // Свои заказы: кто спрашивает, сервер узнает по токену — его добавит интерцептор
  protected readonly orders = httpResource<Order[]>(
    () => '/api/orders',
  );

  // Сколько игр в заказе, штук
  protected count(order: Order) {
    return order.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
  }
}
