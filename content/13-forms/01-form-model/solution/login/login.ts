import { Component, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormField, form } from '@angular/forms/signals';

// Данные формы входа
interface LoginData {
  email: string;
  password: string;
}

// Страница входа. Пока форма только собирает данные — на сервер отправим их позже
@Component({
  selector: 'app-login',
  imports: [FormField, JsonPipe],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  // Модель — данные формы в обычном сигнале. Это единственный источник правды:
  // поле ввода показывает значение из модели и записывает в неё то, что напечатали
  protected readonly model = signal<LoginData>({
    email: '',
    password: '',
  });
  // Форма — дерево полей поверх модели: loginForm.email, loginForm.password
  protected readonly loginForm = form(this.model);

  // Учебная кнопка: учётная запись учебного бэкенда. Меняем модель — поля на экране меняются сами
  protected fillDemo() {
    this.model.set({
      email: 'user@example.com',
      password: 'user',
    });
  }
}
