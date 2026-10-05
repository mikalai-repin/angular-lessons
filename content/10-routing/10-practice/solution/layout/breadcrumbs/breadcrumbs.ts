import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

// Одна крошка: подпись и адрес страницы
interface Crumb {
  label: string;
  url: string;
}

// Хлебные крошки: «Главная › Кабинет › Избранное» — путь от главной до текущей страницы
@Component({
  selector: 'app-breadcrumbs',
  imports: [RouterLink],
  templateUrl: './breadcrumbs.html',
  styleUrl: './breadcrumbs.css',
})
export class Breadcrumbs {
  private readonly router = inject(Router);

  protected readonly crumbs = computed(() => {
    // lastSuccessfulNavigation — сигнал: после каждого перехода crumbs пересчитается
    this.router.lastSuccessfulNavigation();
    const crumbs: Crumb[] = [{ label: 'Главная', url: '/' }];
    let route = this.router.routerState.snapshot.root;
    let url = '';
    // Спускаемся по дереву активных маршрутов от корня к текущей странице
    while (route.firstChild) {
      route = route.firstChild;
      // У маршрута с пустым путём нет своего куска адреса, а data он наследует от родителя — пропускаем
      if (route.url.length === 0) {
        continue;
      }
      url +=
        '/' +
        route.url.map((segment) => segment.path).join('/');
      const label = route.data['breadcrumb'];
      if (label) {
        crumbs.push({ label, url });
      }
    }
    return crumbs;
  });
}
