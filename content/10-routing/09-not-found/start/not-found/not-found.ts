import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Страница для адресов, которых нет в карте маршрутов
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.html',
})
export class NotFound {}
