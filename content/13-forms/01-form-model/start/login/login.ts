import { Component } from '@angular/core';

// Данные формы входа
interface LoginData {
  email: string;
  password: string;
}

// Страница входа. Пока форма только собирает данные — на сервер отправим их позже
@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  // TODO: модель формы и форма поверх неё
}
