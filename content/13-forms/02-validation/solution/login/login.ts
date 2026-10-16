import { Component, signal } from '@angular/core';
import {
  FieldTree,
  FormField,
  email,
  form,
  minLength,
  required,
} from '@angular/forms/signals';

// Данные формы входа
interface LoginData {
  email: string;
  password: string;
}

// Страница входа. Пока форма только собирает данные — на сервер отправим их позже
@Component({
  selector: 'app-login',
  imports: [FormField],
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
  // Форма — дерево полей поверх модели: loginForm.email, loginForm.password.
  // Вторым аргументом — схема: правила для полей. Функция выполняется один раз, при создании формы
  protected readonly loginForm = form(this.model, (login) => {
    required(login.email, { message: 'Введите e-mail' });
    email(login.email, {
      message: 'Похоже, в адресе опечатка',
    });
    required(login.password, { message: 'Введите пароль' });
    minLength(login.password, 4, {
      message: 'Пароль — не короче 4 символов',
    });
  });

  // Ошибки поля показываем, когда покупатель с ним закончил (ушёл из поля), а не с первой буквы
  protected showErrors(field: FieldTree<string>) {
    return field().touched() && field().invalid();
  }

  // Учебная кнопка: учётная запись учебного бэкенда. Меняем модель — поля на экране меняются сами
  protected fillDemo() {
    this.model.set({
      email: 'user@example.com',
      password: 'user',
    });
  }
}
