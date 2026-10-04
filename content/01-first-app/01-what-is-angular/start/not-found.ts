import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <h1>Нет такой страницы</h1>
    <a routerLink="/">В каталог</a>
  `,
})
export class NotFound {}
