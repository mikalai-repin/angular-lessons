import { Component, inject, signal } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import {
  FieldTree,
  FormField,
  FormRoot,
  apply,
  form,
  minLength,
  required,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { emailRules } from '../shared/form-rules';

// Данные формы входа
interface LoginData {
  email: string;
  password: string;
}

// Ответ сервера на вход: токен и пользователь
interface LoginResponse {
  token: string;
  user: { name: string; email: string; role: string };
}

// Страница входа: e-mail и пароль уходят на сервер. Что делать с токеном, разберём в главе 14
@Component({
  selector: 'app-login',
  imports: [FormField, FormRoot],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly http = inject(HttpClient);
  // Имя пользователя после удачного входа
  protected readonly userName = signal('');

  // Модель — данные формы в обычном сигнале. Это единственный источник правды:
  // поле ввода показывает значение из модели и записывает в неё то, что напечатали
  protected readonly model = signal<LoginData>({
    email: '',
    password: '',
  });
  // Форма — дерево полей поверх модели: loginForm.email, loginForm.password.
  // Вторым аргументом — схема: правила для полей. Функция выполняется один раз, при создании формы
  protected readonly loginForm = form(
    this.model,
    (login) => {
      required(login.email, { message: 'Введите e-mail' });
      apply(login.email, emailRules);
      required(login.password, { message: 'Введите пароль' });
      minLength(login.password, 4, {
        message: 'Пароль — не короче 4 символов',
      });
    },
    {
      // Что делать, когда форму отправили и в ней нет ошибок
      submission: { action: () => this.logIn() },
    },
  );

  // Отправка формы. Вернуть можно ошибки — Angular покажет их у формы, как ошибки проверки
  private async logIn() {
    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(
          '/api/login',
          this.model(),
        ),
      );
      this.userName.set(response.user.name);
      return undefined;
    } catch (error) {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401
      ) {
        return {
          kind: 'server',
          message: 'Неверный e-mail или пароль',
        };
      }
      return {
        kind: 'server',
        message: 'Не удалось войти. Попробуйте ещё раз',
      };
    }
  }

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
