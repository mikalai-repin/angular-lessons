import { Component } from '@angular/core';
import {
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';

// Сводка магазина для администратора: GET /api/admin/summary
interface AdminSummary {
  games: number; // игр в каталоге
  outOfStock: number; // из них нет в наличии
  orders: number; // заказов
  users: number; // пользователей
}

// Главная страница админки: сводка магазина. Данные отдаёт только администратору сам сервер
@Component({
  selector: 'app-admin-home',
  templateUrl: './admin-home.html',
})
export class AdminHome {
  protected readonly summary = httpResource<AdminSummary>(
    () => '/api/admin/summary',
  );

  // Что ответил сервер, если отказал: «403 — Недостаточно прав»
  protected errorText(error: unknown) {
    return error instanceof HttpErrorResponse
      ? `${error.status} — ${error.error?.message}`
      : 'сервер недоступен';
  }
}
