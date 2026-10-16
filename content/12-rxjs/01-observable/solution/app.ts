import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Breadcrumbs } from './layout/breadcrumbs/breadcrumbs';
import { Header } from './layout/header/header';

// Каркас магазина: шапка и место, куда роутер выводит текущую страницу
@Component({
  selector: 'app-root',
  imports: [Breadcrumbs, Header, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor() {
    // События роутера — Observable: пока работает приложение, роутер присылает их одно за другим
    inject(Router).events.subscribe((event) =>
      console.log(String(event)),
    );
  }
}
