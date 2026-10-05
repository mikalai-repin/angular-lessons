import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './layout/header/header';

// Каркас магазина: шапка и место, куда роутер выводит текущую страницу
@Component({
  selector: 'app-root',
  imports: [Header, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
