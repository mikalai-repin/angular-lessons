// Журнал навигации: в консоли — события роутера при каждом переходе и дерево активных маршрутов после него.
// Только для изучения: в настоящем приложении такой журнал не нужен (для отладки есть withDebugTracing()).
import { inject, provideAppInitializer } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Event,
  NavigationEnd,
  NavigationStart,
  Router,
} from '@angular/router';

// Дерево активных маршрутов: путь из карты маршрутов, параметры и компонент
function printTree(route: ActivatedRouteSnapshot, depth = 0) {
  const path = route.routeConfig
    ? `'${route.routeConfig.path}'`
    : 'корень';
  const params =
    Object.keys(route.params).length > 0
      ? ` params ${JSON.stringify(route.params)}`
      : '';
  const component = route.component
    ? ` → ${route.component.name}`
    : '';
  console.log(
    `${'  '.repeat(depth + 1)}${path}${params}${component}`,
  );
  route.children.forEach((child) =>
    printTree(child, depth + 1),
  );
}

// Провайдер: функция выполнится при запуске приложения, раньше первой навигации
export function logNavigation() {
  return provideAppInitializer(() => {
    const router = inject(Router);
    router.events.subscribe((event: Event) => {
      if (event instanceof NavigationStart) {
        console.log('────────────');
      }
      // У событий роутера есть toString(): «NavigationStart(id: 2, url: '/catalog')»
      console.log(String(event));
      if (event instanceof NavigationEnd) {
        console.log('Дерево активных маршрутов:');
        printTree(router.routerState.snapshot.root);
      }
    });
  });
}
