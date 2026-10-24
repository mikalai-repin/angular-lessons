import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';
import { AdminGames } from '../admin-games';

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
  imports: [DatePipe],
  templateUrl: './admin-home.html',
  styleUrl: './admin-home.css',
})
export class AdminHome {
  // Журнал изменений — тот же экземпляр сервиса, что у страницы редактирования
  protected readonly admin = inject(AdminGames);

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
