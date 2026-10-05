import { Component } from '@angular/core';
import { Catalog } from './catalog/catalog';
import { Header } from './layout/header/header';

// Каркас магазина: шапка и страница под ней
@Component({
  selector: 'app-root',
  imports: [Catalog, Header],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
