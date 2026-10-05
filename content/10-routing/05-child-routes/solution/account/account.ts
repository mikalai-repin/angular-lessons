import { Component } from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

// Личный кабинет: заголовок, меню разделов и место для страницы раздела
@Component({
  selector: 'app-account',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class Account {}
