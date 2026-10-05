import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

// Одна крошка: подпись и адрес страницы
interface Crumb {
  label: string;
  url: string;
}

// Хлебные крошки: «Главная › Кабинет › Избранное» — путь от главной до текущей страницы
// TODO: crumbs — цепочка крошек по дереву активных маршрутов; пересчитывается после каждого перехода
@Component({
  selector: 'app-breadcrumbs',
  imports: [],
  templateUrl: './breadcrumbs.html',
  styleUrl: './breadcrumbs.css',
})
export class Breadcrumbs {
  private readonly router = inject(Router);
}
