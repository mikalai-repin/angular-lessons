import { Component } from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

// Рамка мастера: заголовок, список шагов и место для страницы шага
@Component({
  selector: 'app-gift-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './gift-layout.html',
  styleUrl: './gift-layout.css',
})
export class GiftLayout {}
