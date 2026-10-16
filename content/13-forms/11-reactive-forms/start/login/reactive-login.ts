import { Component, inject, signal } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

// Та же форма входа на реактивных формах — так её написали бы до Signal Forms.
// Шаг «Реактивные формы»: этот код нужно уметь читать, писать новые формы так не нужно
@Component({
  selector: 'app-reactive-login',
  imports: [ReactiveFormsModule],
  templateUrl: './reactive-login.html',
  styleUrl: './login.css',
})
export class ReactiveLogin {
  private readonly http = inject(HttpClient);
  protected readonly userName = signal('');
  protected readonly serverError = signal('');
  protected readonly submitting = signal(false);

  // Форма — дерево объектов-контролов. Значение хранит сам контрол, а не ваш сигнал
  protected readonly loginForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(4),
      ],
    }),
  });

  constructor() {
    // Изменения значения — поток RxJS
    this.loginForm.controls.email.valueChanges.subscribe(
      (email) =>
        console.log('Реактивная форма: e-mail —', email),
    );
  }

  protected logIn() {
    if (this.loginForm.invalid) {
      // Ошибки видны у тронутых полей — трогаем все
      this.loginForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.serverError.set('');
    this.http
      .post<{ user: { name: string } }>(
        '/api/login',
        this.loginForm.getRawValue(),
      )
      .subscribe({
        next: (response) => {
          this.submitting.set(false);
          this.userName.set(response.user.name);
        },
        error: (error) => {
          this.submitting.set(false);
          this.serverError.set(
            error instanceof HttpErrorResponse &&
              error.status === 401
              ? 'Неверный e-mail или пароль'
              : 'Не удалось войти. Попробуйте ещё раз',
          );
        },
      });
  }
}
