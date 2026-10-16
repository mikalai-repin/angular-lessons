# Генератор кода шагов главы 13 «Формы».
# Запуск: python3 tools/authoring/ch13-gen.py — ПЕРЕЗАПИСЫВАЕТ start/ и solution/ всех шагов главы 13.
# Старт главы — решение практикума главы 12 (09-practice) + страница входа /login (заготовка) и стили форм.
# Шаги — полные снимки: каждый строится правками (edit) поверх результата предыдущего шага.
# Код форматирует write_steps (как кнопка «Формат» в редакторе). После запуска: npm run validate.
# Тексты уроков (lesson.md) пишутся отдельно, руками; генератор их не трогает.
import os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from steps import PROJECT, read_dir, rep, step_dir, write_steps

ROOT = f'{PROJECT}/content/13-forms'
BASE = read_dir(step_dir(f'{PROJECT}/content/12-rxjs/09-practice/solution'))


def edit(files, name, *pairs):
    """Копия снимка, в которой файл name изменён заменами (старое, новое)."""
    out = dict(files)
    text = out[name]
    for old, new in pairs:
        text = rep(text, old, new)
    out[name] = text
    return out


def put(files, **named):
    """Копия снимка с новыми или заменёнными файлами: put(S, **{'login/login.ts': '…'})."""
    out = dict(files)
    out.update(named)
    return out


# ---------- Старт главы: стили форм, страница входа ----------

# Стили полей формы — общие для всех форм магазина, поэтому глобальные.
# Поле комментария в оформлении заказа раньше стилизовал checkout.css — теперь эти правила здесь
FORM_CSS = """
/* Формы: подпись над полем, поле во всю ширину */
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 480px;
  margin-bottom: 12px;
  font-size: 14px;
}

.field input,
.field textarea,
.field select {
  padding: 8px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  font: inherit;
}

.field textarea {
  resize: vertical;
}

/* Поле с ошибкой: aria-invalid сообщает о ней экранному диктору, а рамка — глазам */
.field [aria-invalid='true'] {
  border-color: var(--brand);
}

/* Сообщения об ошибках под полем */
.field-errors {
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--brand);
  font-size: 13px;
}
"""

S0 = edit(BASE, 'styles.css', ("""  text-decoration: underline;
  cursor: pointer;
}
""", """  text-decoration: underline;
  cursor: pointer;
}
""" + FORM_CSS))
S0 = edit(S0, 'checkout/checkout.css', ("""
/* Поле комментария */
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 480px;
  font-size: 14px;
}

.field textarea {
  padding: 8px;
  border: 1px solid #d2d2d7;
  border-radius: 8px;
  font: inherit;
  resize: vertical;
}
""", ""))
S0 = edit(S0, 'app.routes.ts',
    ("import { Home } from './home/home';", "import { Home } from './home/home';\nimport { Login } from './login/login';"),
    ("""  {
    path: 'account',""", """  { path: 'login', component: Login, title: 'Вход' },
  {
    path: 'account',"""))

LOGIN_TS_START = """import { Component } from '@angular/core';

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
"""

LOGIN_HTML_START = """<h1>Вход</h1>
<div class="login-form">
  <label class="field">
    E-mail
    <!-- TODO: связать поле с полем формы email -->
    <input type="email" autocomplete="email" />
  </label>
  <label class="field">
    Пароль
    <!-- TODO: связать поле с полем формы password -->
    <input type="password" autocomplete="current-password" />
  </label>
</div>
"""

LOGIN_CSS = """/* Страница входа: узкая форма */
.login-form {
  max-width: 320px;
}

.debug {
  padding: 8px;
  border-radius: 8px;
  background: var(--surface);
  font-size: 13px;
}
"""

S1 = put(S0, **{
    'login/login.ts': LOGIN_TS_START,
    'login/login.html': LOGIN_HTML_START,
    'login/login.css': LOGIN_CSS,
})

# ---------- 13.1 Модель формы ----------

R1 = edit(S1, 'login/login.ts',
    ("import { Component } from '@angular/core';", """import { Component, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormField, form } from '@angular/forms/signals';"""),
    ("""  templateUrl: './login.html',""", """  imports: [FormField, JsonPipe],
  templateUrl: './login.html',"""),
    ("""  // TODO: модель формы и форма поверх неё""", """  // Модель — данные формы в обычном сигнале. Это единственный источник правды:
  // поле ввода показывает значение из модели и записывает в неё то, что напечатали
  protected readonly model = signal<LoginData>({
    email: '',
    password: '',
  });
  // Форма — дерево полей поверх модели: loginForm.email, loginForm.password
  protected readonly loginForm = form(this.model);

  // Учебная кнопка: учётная запись учебного бэкенда. Меняем модель — поля на экране меняются сами
  protected fillDemo() {
    this.model.set({ email: 'user@example.com', password: 'user' });
  }"""))
R1 = edit(R1, 'login/login.html',
    ("""    <!-- TODO: связать поле с полем формы email -->
    <input type="email" autocomplete="email" />""", """    <input
      type="email"
      autocomplete="email"
      [formField]="loginForm.email"
    />"""),
    ("""    <!-- TODO: связать поле с полем формы password -->
    <input type="password" autocomplete="current-password" />
  </label>
</div>""", """    <input
      type="password"
      autocomplete="current-password"
      [formField]="loginForm.password"
    />
  </label>
  <button class="link-button" (click)="fillDemo()">
    Заполнить тестовыми данными
  </button>
</div>
<!-- Отладка: модель целиком -->
<pre class="debug">{{ model() | json }}</pre>"""))

# ---------- 13.2 Валидация ----------

R2 = edit(R1, 'login/login.ts',
    ("import { Component, signal } from '@angular/core';\nimport { JsonPipe } from '@angular/common';\nimport { FormField, form } from '@angular/forms/signals';",
     """import { Component, signal } from '@angular/core';
import {
  FormField,
  email,
  form,
  minLength,
  required,
} from '@angular/forms/signals';"""),
    ("  imports: [FormField, JsonPipe],", "  imports: [FormField],"),
    ("""  // Форма — дерево полей поверх модели: loginForm.email, loginForm.password
  protected readonly loginForm = form(this.model);""", """  // Форма — дерево полей поверх модели: loginForm.email, loginForm.password.
  // Вторым аргументом — схема: правила для полей. Функция выполняется один раз, при создании формы
  protected readonly loginForm = form(this.model, (login) => {
    required(login.email, { message: 'Введите e-mail' });
    email(login.email, { message: 'Похоже, в адресе опечатка' });
    required(login.password, { message: 'Введите пароль' });
    minLength(login.password, 4, {
      message: 'Пароль — не короче 4 символов',
    });
  });"""))
R2 = edit(R2, 'login/login.html',
    ("""    <input
      type="email"
      autocomplete="email"
      [formField]="loginForm.email"
    />
  </label>""", """    <input
      type="email"
      autocomplete="email"
      [formField]="loginForm.email"
      [attr.aria-invalid]="showErrors(loginForm.email) || null"
      [attr.aria-describedby]="
        showErrors(loginForm.email) ? 'email-errors' : null
      "
    />
    @if (showErrors(loginForm.email)) {
      <ul id="email-errors" class="field-errors">
        @for (error of loginForm.email().errors(); track error.kind) {
          <li>{{ error.message }}</li>
        }
      </ul>
    }
  </label>"""),
    ("""    <input
      type="password"
      autocomplete="current-password"
      [formField]="loginForm.password"
    />
  </label>""", """    <input
      type="password"
      autocomplete="current-password"
      [formField]="loginForm.password"
      [attr.aria-invalid]="showErrors(loginForm.password) || null"
      [attr.aria-describedby]="
        showErrors(loginForm.password) ? 'password-errors' : null
      "
    />
    @if (showErrors(loginForm.password)) {
      <ul id="password-errors" class="field-errors">
        @for (
          error of loginForm.password().errors();
          track error.kind
        ) {
          <li>{{ error.message }}</li>
        }
      </ul>
    }
  </label>"""),
    ("""<!-- Отладка: модель целиком -->
<pre class="debug">{{ model() | json }}</pre>""", """<!-- Отладка: состояние формы целиком -->
<p class="debug">
  Форма {{ loginForm().valid() ? 'заполнена верно' : 'с ошибками' }}
</p>"""))
R2 = edit(R2, 'login/login.ts',
    ("""  // Учебная кнопка: учётная запись учебного бэкенда.""", """  // Ошибки поля показываем, когда покупатель с ним закончил (ушёл из поля), а не с первой буквы
  protected showErrors(field: FieldTree<string>) {
    return field().touched() && field().invalid();
  }

  // Учебная кнопка: учётная запись учебного бэкенда."""),
    ("""import {
  FormField,
  email,""", """import {
  FieldTree,
  FormField,
  email,"""))

# ---------- 13.3 Отправка ----------

R3 = edit(R2, 'login/login.ts',
    ("import { Component, signal } from '@angular/core';", """import { Component, inject, signal } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';"""),
    ("""import {
  FieldTree,
  FormField,
  email,
  form,
  minLength,
  required,
} from '@angular/forms/signals';""", """import {
  FieldTree,
  FormField,
  FormRoot,
  email,
  form,
  minLength,
  required,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';"""),
    ("""interface LoginData {
  email: string;
  password: string;
}""", """interface LoginData {
  email: string;
  password: string;
}

// Ответ сервера на вход: токен и пользователь
interface LoginResponse {
  token: string;
  user: { name: string; email: string; role: string };
}"""),
    ("// Страница входа. Пока форма только собирает данные — на сервер отправим их позже",
     "// Страница входа: e-mail и пароль уходят на сервер. Что делать с токеном, разберём в главе 14"),
    ("  imports: [FormField],", "  imports: [FormField, FormRoot],"),
    ("""export class Login {
""", """export class Login {
  private readonly http = inject(HttpClient);
  // Имя пользователя после удачного входа
  protected readonly userName = signal('');

"""),
    ("""    minLength(login.password, 4, {
      message: 'Пароль — не короче 4 символов',
    });
  });""", """      minLength(login.password, 4, {
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
        this.http.post<LoginResponse>('/api/login', this.model()),
      );
      this.userName.set(response.user.name);
      return undefined;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return { kind: 'server', message: 'Неверный e-mail или пароль' };
      }
      return {
        kind: 'server',
        message: 'Не удалось войти. Попробуйте ещё раз',
      };
    }
  }"""),
    ("""  protected readonly loginForm = form(this.model, (login) => {
    required(login.email, { message: 'Введите e-mail' });
    email(login.email, { message: 'Похоже, в адресе опечатка' });
    required(login.password, { message: 'Введите пароль' });
""", """  protected readonly loginForm = form(
    this.model,
    (login) => {
      required(login.email, { message: 'Введите e-mail' });
      email(login.email, { message: 'Похоже, в адресе опечатка' });
      required(login.password, { message: 'Введите пароль' });
"""))
R3 = edit(R3, 'login/login.html',
    ("""<h1>Вход</h1>
<div class="login-form">""", """<h1>Вход</h1>
@if (userName()) {
  <p>Здравствуйте, {{ userName() }}! Вы вошли.</p>
} @else {
<form class="login-form" [formRoot]="loginForm">"""),
    ("""  <button class="link-button" (click)="fillDemo()">
    Заполнить тестовыми данными
  </button>
</div>
<!-- Отладка: состояние формы целиком -->
<p class="debug">
  Форма {{ loginForm().valid() ? 'заполнена верно' : 'с ошибками' }}
</p>""", """  <!-- Ошибки всей формы: их вернула отправка -->
  @for (error of loginForm().errors(); track error.kind) {
    <p class="error-message">{{ error.message }}</p>
  }
  <button class="button" [disabled]="loginForm().submitting()">
    {{ loginForm().submitting() ? 'Входим…' : 'Войти' }}
  </button>
  <button
    type="button"
    class="link-button"
    (click)="fillDemo()"
  >
    Заполнить тестовыми данными
  </button>
</form>
}"""))
R3 = edit(R3, 'login/login.css', ("""
.debug {
  padding: 8px;
  border-radius: 8px;
  background: var(--surface);
  font-size: 13px;
}
""", """
/* Учебная кнопка — отдельной строкой под «Войти» */
.login-form .link-button {
  display: block;
  margin-top: 12px;
}
"""))

# ---------- 13.4 Свои проверки: форма оформления заказа ----------

FIELD_ARIA_TS = """import { Directive, computed, inject } from '@angular/core';
import { FORM_FIELD } from '@angular/forms/signals';

// id списка ошибок поля: по нему поле ссылается на свои ошибки (aria-describedby).
// name поля формы уникален: «ng.form0.contacts.phone»
export function fieldErrorsId(fieldName: string) {
  return `${fieldName}-errors`;
}

// Доступность поля формы: экранный диктор узнаёт, что в поле ошибка, и читает её текст.
// Селектор тот же, что у FormField: где директива подключена, она дополняет каждое поле формы
@Directive({
  selector: '[formField]',
  host: {
    '[attr.aria-invalid]': 'showErrors() || null',
    '[attr.aria-describedby]': 'showErrors() ? errorsId() : null',
  },
})
export class FieldAria {
  // Директива FormField на том же элементе: её предоставляет токен FORM_FIELD
  private readonly formField = inject(FORM_FIELD);

  // Ошибки видны тогда же, когда их показывает FieldErrors
  protected readonly showErrors = computed(() => {
    const state = this.formField.state();
    return state.touched() && state.invalid();
  });
  protected readonly errorsId = computed(() =>
    fieldErrorsId(this.formField.state().name()),
  );
}
"""

FIELD_ERRORS_TS = """import { Component, input } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';
import { fieldErrorsId } from '../field-aria';

// Ошибки поля формы — списком под полем. Видны, когда покупатель закончил с полем (ушёл из него)
@Component({
  selector: 'app-field-errors',
  templateUrl: './field-errors.html',
})
export class FieldErrors {
  // Поле формы любого типа: строка, число, флажок
  readonly field = input.required<FieldTree<unknown>>();

  protected readonly errorsId = fieldErrorsId;
}
"""

FIELD_ERRORS_HTML = """@let state = field()();
@if (state.touched() && state.invalid()) {
  <ul class="field-errors" [id]="errorsId(state.name())">
    @for (error of state.errors(); track error.kind) {
      <li>{{ error.message }}</li>
    }
  </ul>
}
"""

CHECKOUT_TS_4 = """import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toObservable,
} from '@angular/core/rxjs-interop';
import { FormField, form, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CartStore } from '../core/cart-store';
import { FieldAria } from '../shared/field-aria';
import { FieldErrors } from '../shared/field-errors/field-errors';
import { PricePipe } from '../shared/price-pipe';

// Ключ черновика комментария в localStorage
const DRAFT_KEY = 'hod-konem:checkout-comment';
// Пауза в наборе, после которой черновик сохраняется, мс
const SAVE_DELAY = 500;

// Данные формы оформления заказа
interface CheckoutData {
  contacts: { name: string; phone: string; email: string };
  comment: string;
}

// Оформление заказа: контакты покупателя и комментарий
@Component({
  selector: 'app-checkout',
  imports: [FieldAria, FieldErrors, FormField, PricePipe, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout {
  protected readonly cart = inject(CartStore);

  // Модель формы. Комментарий начинаем с черновика, если покупатель уже что-то писал
  private readonly model = signal<CheckoutData>({
    contacts: { name: '', phone: '', email: '' },
    comment: localStorage.getItem(DRAFT_KEY) ?? '',
  });
  protected readonly checkoutForm = form(this.model, (checkout) => {
    const contacts = checkout.contacts;
    required(contacts.name, { message: 'Как к вам обращаться?' });
    // TODO: телефон — 11 цифр; e-mail — без опечаток; телефон или e-mail — хотя бы одно
  });

  // Комментарий — поле формы, а значение поля — сигнал. Черновик сохраняем, как в главе 12
  private readonly comment = this.checkoutForm.comment().value;
  // Последний сохранённый текст
  private readonly savedComment = signal(this.comment());
  // Всё ли сохранено: пока покупатель печатает — нет
  protected readonly saved = computed(
    () => this.comment() === this.savedComment(),
  );

  constructor() {
    // Каждое изменение комментария — значение потока. Сохраняем, когда покупатель сделал паузу
    toObservable(this.comment)
      .pipe(
        debounceTime(SAVE_DELAY),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((comment) => {
        localStorage.setItem(DRAFT_KEY, comment);
        this.savedComment.set(comment);
      });
  }
}
"""

CHECKOUT_HTML_4 = """<a class="back-link" routerLink="/cart">← Корзина</a>
<h1>Оформление заказа</h1>
<p>
  Товаров: {{ cart.count() }} шт. на
  {{ cart.subtotal() | price }}, к оплате
  <b>{{ cart.total() | price }}</b
  >.
</p>
<fieldset class="group">
  <legend>Контакты</legend>
  <label class="field">
    Имя
    <input
      autocomplete="name"
      [formField]="checkoutForm.contacts.name"
    />
    <app-field-errors [field]="checkoutForm.contacts.name" />
  </label>
  <label class="field">
    Телефон
    <input
      type="tel"
      autocomplete="tel"
      placeholder="+7 900 123-45-67"
      [formField]="checkoutForm.contacts.phone"
    />
    <app-field-errors [field]="checkoutForm.contacts.phone" />
  </label>
  <label class="field">
    E-mail
    <input
      type="email"
      autocomplete="email"
      [formField]="checkoutForm.contacts.email"
    />
    <app-field-errors [field]="checkoutForm.contacts.email" />
  </label>
</fieldset>
<label class="field">
  Комментарий к заказу
  <textarea rows="3" [formField]="checkoutForm.comment"></textarea>
</label>
<p class="draft-status muted">
  @if (!saved()) {
    Сохраняем…
  } @else if (checkoutForm.comment().value()) {
    Черновик сохранён
  }
</p>
<p class="muted">Способ доставки появится здесь позже.</p>
"""

CHECKOUT_GROUP_CSS = """
/* Группа полей: «Контакты», «Доставка» */
.group {
  max-width: 480px;
  margin: 0 0 12px;
  padding: 8px 12px 0;
  border: 1px solid #d2d2d7;
  border-radius: var(--radius);
}

.group legend {
  padding: 0 4px;
  font-weight: 600;
}
"""

S4 = put(R3, **{
    'shared/field-aria.ts': FIELD_ARIA_TS,
    'shared/field-errors/field-errors.ts': FIELD_ERRORS_TS,
    'shared/field-errors/field-errors.html': FIELD_ERRORS_HTML,
    'checkout/checkout.ts': CHECKOUT_TS_4,
    'checkout/checkout.html': CHECKOUT_HTML_4,
})
S4 = edit(S4, 'checkout/checkout.css', ("""  font-size: 13px;
}
""", """  font-size: 13px;
}
""" + CHECKOUT_GROUP_CSS))

R4 = edit(S4, 'checkout/checkout.ts',
    ("import { FormField, form, required } from '@angular/forms/signals';", """import {
  FormField,
  email,
  form,
  required,
  validate,
} from '@angular/forms/signals';"""),
    ("""// Данные формы оформления заказа""", """// Телефон пишут по-разному: «+7 (900) 123-45-67», «8 900 1234567». Считаем только цифры:
// их 11, первая — 7 или 8
function isPhone(text: string) {
  return /^[78]\\d{10}$/.test(text.replace(/\\D/g, ''));
}

// Данные формы оформления заказа"""),
    ("""    // TODO: телефон — 11 цифр; e-mail — без опечаток; телефон или e-mail — хотя бы одно""", """    // Своя проверка: функция получает контекст поля и возвращает ошибку или undefined
    validate(contacts.phone, ({ value }) =>
      value() && !isPhone(value())
        ? {
            kind: 'phone',
            message: 'Номер — 11 цифр, например +7 900 123-45-67',
          }
        : undefined,
    );
    email(contacts.email, { message: 'Похоже, в адресе опечатка' });
    // Перекрёстная проверка: правило поля e-mail читает и соседнее поле — телефон
    validate(contacts.email, ({ value, valueOf }) =>
      !value().trim() && !valueOf(contacts.phone).trim()
        ? {
            kind: 'contact',
            message: 'Укажите телефон или e-mail, чтобы мы могли связаться с вами',
          }
        : undefined,
    );"""))

# ---------- 13.5 Асинхронная проверка: промокод проверяет сервер ----------

CART_PAGE_TS_5 = """import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  FormField,
  FormRoot,
  form,
  required,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { CartStore } from '../../core/cart-store';
import { PricePipe } from '../../shared/price-pipe';
import { Quantity } from '../../shared/quantity/quantity';

// Страница корзины: позиции, итоги, промокод
@Component({
  selector: 'app-cart-page',
  imports: [FormField, FormRoot, PricePipe, Quantity, RouterLink],
  templateUrl: './cart-page.html',
  styleUrl: './cart-page.css',
})
export class CartPage {
  protected readonly cart = inject(CartStore);
  private readonly http = inject(HttpClient);

  // Форма промокода — одно поле. Отправка формы — «Применить»
  private readonly promoModel = signal({ code: '' });
  protected readonly promoForm = form(
    this.promoModel,
    (promo) => {
      required(promo.code);
      // TODO: проверить код на сервере — GET /api/promo/:code
    },
    { submission: { action: () => this.applyPromo() } },
  );

  private async applyPromo() {
    // TODO: получить промокод с сервера и применить к корзине
  }
}
"""

CART_PAGE_PROMO_OLD = """    @if (!cart.promo()) {
      <div class="promo">
        <input
          #promoInput
          class="promo-input"
          placeholder="Промокод"
          aria-label="Промокод"
          (input)="promoError.set('')"
          (keydown.enter)="applyPromo(promoInput.value)"
        />
        <button
          class="link-button"
          (click)="applyPromo(promoInput.value)"
        >
          Применить
        </button>
      </div>
      @if (promoError()) {
        <p class="promo-error">{{ promoError() }}</p>
      }
    }"""

CART_PAGE_PROMO_NEW = """    @if (!cart.promo()) {
      <form class="promo" [formRoot]="promoForm">
        <input
          class="promo-input"
          placeholder="Промокод"
          aria-label="Промокод"
          [formField]="promoForm.code"
          [attr.aria-invalid]="promoForm.code().invalid() || null"
          [attr.aria-describedby]="
            promoForm.code().invalid() ? 'promo-errors' : null
          "
        />
        <button class="link-button" [disabled]="!promoForm().valid()">
          Применить
        </button>
      </form>
      @if (promoForm.code().pending()) {
        <p class="muted">Проверяем промокод…</p>
      }
      @if (promoForm.code().invalid()) {
        <div id="promo-errors">
          @for (error of promoForm.code().errors(); track error.kind) {
            <p class="promo-error">{{ error.message }}</p>
          }
        </div>
      }
    }"""

S5 = edit(R4, 'cart/cart-page/cart-page.html', (CART_PAGE_PROMO_OLD, CART_PAGE_PROMO_NEW))
S5 = put(S5, **{'cart/cart-page/cart-page.ts': CART_PAGE_TS_5})
del S5['core/promo-codes.ts']
S5 = edit(S5, 'core/models.ts', ("""// Позиция корзины: какая игра и сколько штук.""", """// Промокод: GET /api/promo/:code
export type Promo =
  | { code: string; percent: number } // скидка в процентах от суммы товаров
  | { code: string; amount: number; minTotal: number }; // скидка в рублях при сумме товаров от minTotal

// Позиция корзины: какая игра и сколько штук."""))
S5 = edit(S5, 'core/cart-store.ts',
    ("""import { CartItem, Game } from './models';
import { Promo, PromoResult, findPromo } from './promo-codes';""", "import { CartItem, Game, Promo } from './models';"),
    ("""  // Применить промокод. Ответ — получилось ли, а если нет, то почему
  applyPromo(text: string): PromoResult {
    const promo = findPromo(text);
    if (!promo) {
      return 'unknown';
    }
    if (
      'minTotal' in promo &&
      this.subtotal() < promo.minTotal
    ) {
      return 'min-total';
    }
    this.promoState.set(promo);
    return 'applied';
  }""", """  // Применить промокод, который прислал сервер. Не хватает суммы товаров — не применяется
  applyPromo(promo: Promo): boolean {
    if ('minTotal' in promo && this.subtotal() < promo.minTotal) {
      return false;
    }
    this.promoState.set(promo);
    return true;
  }"""))

R5 = edit(S5, 'cart/cart-page/cart-page.ts',
    ("import { HttpClient } from '@angular/common/http';", """import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
} from '@angular/common/http';"""),
    ("""import {
  FormField,
  FormRoot,
  form,
  required,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { CartStore } from '../../core/cart-store';""", """import {
  FormField,
  FormRoot,
  form,
  required,
  validateHttp,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CACHE } from '../../core/cache-interceptor';
import { CartStore } from '../../core/cart-store';
import { Promo } from '../../core/models';"""),
    ("""// Страница корзины: позиции, итоги, промокод""", """// Промокод проверяет сервер: GET /api/promo/KNIGHT10 → промокод или 404
const promoUrl = (code: string) =>
  `/api/promo/${encodeURIComponent(code.trim())}`;
// Метка CACHE: «Применить» возьмёт из кэша ответ, полученный при проверке
const cached = () => new HttpContext().set(CACHE, true);

// Страница корзины: позиции, итоги, промокод"""),
    ("""      // TODO: проверить код на сервере — GET /api/promo/:code""", """      // Асинхронная проверка: запрос к серверу. Пока ответа нет, поле в состоянии pending
      validateHttp(promo.code, {
        request: ({ value }) => ({
          url: promoUrl(value()),
          context: cached(),
        }),
        // Не спрашивать сервер на каждую букву: запрос — после паузы в наборе
        debounce: 300,
        // Промокод есть. Хватает ли суммы товаров — узнаём только теперь
        onSuccess: (found: Promo) =>
          'minTotal' in found && this.cart.subtotal() < found.minTotal
            ? {
                kind: 'min-total',
                message:
                  'Сумма товаров меньше, чем нужно для этого промокода',
              }
            : undefined,
        onError: (error) =>
          error instanceof HttpErrorResponse && error.status === 404
            ? { kind: 'unknown', message: 'Нет такого промокода' }
            : {
                kind: 'server',
                message: 'Не удалось проверить промокод',
              },
      });"""),
    ("""  private async applyPromo() {
    // TODO: получить промокод с сервера и применить к корзине
  }""", """  private async applyPromo() {
    const promo = await firstValueFrom(
      this.http.get<Promo>(promoUrl(this.promoModel().code), {
        context: cached(),
      }),
    );
    this.cart.applyPromo(promo);
    // Промокод применён — поле снова пустое и нетронутое
    this.promoForm().reset({ code: '' });
  }"""))

# ---------- 13.6 Условные поля: доставка ----------

S6 = edit(R5, 'checkout/checkout.ts',
    ("""interface CheckoutData {
  contacts: { name: string; phone: string; email: string };
  comment: string;
}""", """interface CheckoutData {
  contacts: { name: string; phone: string; email: string };
  delivery: {
    method: 'pickup' | 'courier'; // самовывоз или курьер
    address: string;
    callBefore: boolean; // позвонить за час до приезда
  };
  comment: string;
}"""),
    ("// Оформление заказа: контакты покупателя и комментарий", "// Оформление заказа: контакты покупателя, доставка и комментарий"),
    ("""    contacts: { name: '', phone: '', email: '' },
    comment:""", """    contacts: { name: '', phone: '', email: '' },
    delivery: { method: 'pickup', address: '', callBefore: false },
    comment:"""),
    ("""        : undefined,
    );
  });""", """        : undefined,
    );
    // TODO: адрес и звонок — только при доставке курьером
  });

  // К оплате. Самовывоз — без платы за доставку
  protected readonly toPay = computed(
    () =>
      this.cart.total() -
      (this.checkoutForm.delivery.method().value() === 'pickup'
        ? this.cart.delivery()
        : 0),
  );"""))
S6 = edit(S6, 'checkout/checkout.html',
    ("""  <b>{{ cart.total() | price }}</b""", """  <b>{{ toPay() | price }}</b"""),
    ("""<p class="muted">Способ доставки появится здесь позже.</p>
""", ""),
    ("""<label class="field">
  Комментарий к заказу""", """<fieldset class="group">
  <legend>Доставка</legend>
  <div class="choice">
    <label>
      <input
        type="radio"
        value="pickup"
        [formField]="checkoutForm.delivery.method"
      />
      Самовывоз из магазина — бесплатно
    </label>
    <label>
      <input
        type="radio"
        value="courier"
        [formField]="checkoutForm.delivery.method"
      />
      Курьером
    </label>
  </div>
  <!-- TODO: адрес и звонок — только при доставке курьером -->
  <label class="field">
    Адрес
    <input
      autocomplete="street-address"
      [formField]="checkoutForm.delivery.address"
    />
    <app-field-errors [field]="checkoutForm.delivery.address" />
  </label>
  <label class="choice">
    <input
      type="checkbox"
      [formField]="checkoutForm.delivery.callBefore"
    />
    Позвонить за час до приезда
  </label>
</fieldset>
<label class="field">
  Комментарий к заказу"""))
S6 = edit(S6, 'checkout/checkout.css', ("""
.group legend {""", """
/* Варианты выбора: переключатели и флажки, по одному в строке */
.choice {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 14px;
}

.group legend {"""))

R6 = edit(S6, 'checkout/checkout.ts',
    ("""import {
  FormField,
  email,
  form,
  required,
  validate,
} from '@angular/forms/signals';""", """import {
  FormField,
  applyWhen,
  disabled,
  email,
  form,
  hidden,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';"""),
    ("""    // TODO: адрес и звонок — только при доставке курьером""", """    const delivery = checkout.delivery;
    // Самовывоз: адрес и звонок не нужны. Скрытое поле не проверяется и не влияет на форму
    hidden(delivery.address, {
      when: ({ valueOf }) => valueOf(delivery.method) === 'pickup',
    });
    hidden(delivery.callBefore, {
      when: ({ valueOf }) => valueOf(delivery.method) === 'pickup',
    });
    // Правила курьерской доставки — группой, пока выбран курьер
    applyWhen(
      checkout,
      ({ value }) => value().delivery.method === 'courier',
      (order) => {
        required(order.delivery.address, {
          message: 'Куда привезти заказ?',
        });
        minLength(order.delivery.address, 10, {
          message: 'Укажите улицу, дом и квартиру',
        });
        required(order.contacts.phone, {
          message: 'Курьеру нужен ваш телефон',
        });
      },
    );
    // Позвонить можно, только если есть номер. Строка — причина, её увидит покупатель
    disabled(delivery.callBefore, {
      when: ({ valueOf }) =>
        !valueOf(contacts.phone).trim() &&
        'Укажите телефон, и курьер позвонит заранее',
    });"""))
R6 = edit(R6, 'checkout/checkout.html',
    ("""  <!-- TODO: адрес и звонок — только при доставке курьером -->
  <label class="field">
    Адрес
    <input
      autocomplete="street-address"
      [formField]="checkoutForm.delivery.address"
    />
    <app-field-errors [field]="checkoutForm.delivery.address" />
  </label>
  <label class="choice">
    <input
      type="checkbox"
      [formField]="checkoutForm.delivery.callBefore"
    />
    Позвонить за час до приезда
  </label>""", """  <!-- Скрытое поле убираем из DOM сами: hidden только сообщает, что поле скрыто -->
  @if (!checkoutForm.delivery.address().hidden()) {
    <label class="field">
      Адрес
      <input
        autocomplete="street-address"
        [formField]="checkoutForm.delivery.address"
      />
      <app-field-errors [field]="checkoutForm.delivery.address" />
    </label>
  }
  @if (!checkoutForm.delivery.callBefore().hidden()) {
    <div class="choice">
      <label>
        <input
          type="checkbox"
          [formField]="checkoutForm.delivery.callBefore"
        />
        Позвонить за час до приезда
      </label>
      @for (
        reason of checkoutForm.delivery.callBefore().disabledReasons();
        track reason.message
      ) {
        <span class="muted">{{ reason.message }}</span>
      }
    </div>
  }"""))

# ---------- 13.7 Списки полей: открытки ----------

S7 = R6
R7 = edit(R6, 'checkout/checkout.ts',
    ("""import {
  FormField,
  applyWhen,""", """import {
  FormField,
  applyEach,
  applyWhen,"""),
    ("""  minLength,
  required,
  validate,
} from '@angular/forms/signals';""", """  maxLength,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';"""),
    ("""// Данные формы оформления заказа
interface CheckoutData {""", """// Сколько открыток можно добавить к заказу и сколько букв в каждой
const MAX_POSTCARDS = 3;
const POSTCARD_TEXT_MAX = 120;

// Открытка к подарку: кому и что написать
interface Postcard {
  to: string;
  text: string;
}

// Данные формы оформления заказа
interface CheckoutData {"""),
    ("""    callBefore: boolean; // позвонить за час до приезда
  };
  comment: string;
}""", """    callBefore: boolean; // позвонить за час до приезда
  };
  postcards: Postcard[];
  comment: string;
}"""),
    ("// Оформление заказа: контакты покупателя, доставка и комментарий", "// Оформление заказа: контакты покупателя, доставка, открытки и комментарий"),
    ("""    delivery: { method: 'pickup', address: '', callBefore: false },
    comment:""", """    delivery: { method: 'pickup', address: '', callBefore: false },
    postcards: [],
    comment:"""),
    ("""        'Укажите телефон, и курьер позвонит заранее',
    });
  });""", """        'Укажите телефон, и курьер позвонит заранее',
    });
    // Правила для каждой открытки списка — и для тех, что добавят потом
    applyEach(checkout.postcards, (postcard) => {
      required(postcard.to, { message: 'Кому эта открытка?' });
      maxLength(postcard.text, POSTCARD_TEXT_MAX, {
        message: `Не больше ${POSTCARD_TEXT_MAX} символов`,
      });
    });
  });

  protected readonly maxPostcards = MAX_POSTCARDS;
  protected readonly postcardTextMax = POSTCARD_TEXT_MAX;

  // Список полей растёт и сокращается вместе с массивом в модели
  protected addPostcard() {
    this.model.update((order) => ({
      ...order,
      postcards: [...order.postcards, { to: '', text: '' }],
    }));
  }

  protected removePostcard(index: number) {
    this.model.update((order) => ({
      ...order,
      postcards: order.postcards.filter((_, i) => i !== index),
    }));
  }"""))
R7 = edit(R7, 'checkout/checkout.html', ("""<label class="field">
  Комментарий к заказу""", """<fieldset class="group">
  <legend>Открытки к подарку</legend>
  <!-- Поле-массив перебирается, как массив: каждый элемент — поле-открытка -->
  @for (
    postcard of checkoutForm.postcards;
    track postcard;
    let i = $index
  ) {
    <div class="postcard">
      <label class="field">
        Кому
        <input [formField]="postcard.to" />
        <app-field-errors [field]="postcard.to" />
      </label>
      <label class="field">
        Текст
        <textarea rows="2" [formField]="postcard.text"></textarea>
        <span class="muted">
          {{ postcard.text().value().length }} / {{ postcardTextMax }}
        </span>
        <app-field-errors [field]="postcard.text" />
      </label>
      <button
        type="button"
        class="link-button"
        (click)="removePostcard(i)"
      >
        Убрать открытку
      </button>
    </div>
  } @empty {
    <p class="muted">Подпишем открытку к подарку — бесплатно.</p>
  }
  @if (checkoutForm.postcards.length < maxPostcards) {
    <p>
      <button type="button" class="link-button" (click)="addPostcard()">
        + Добавить открытку
      </button>
    </p>
  }
</fieldset>
<label class="field">
  Комментарий к заказу"""))
R7 = edit(R7, 'checkout/checkout.css', ("""
.group legend {""", """
/* Открытка: поля и «Убрать» — отдельным блоком */
.postcard {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--surface);
}

.group legend {"""))

# ---------- 13.8 Схемы: правила отдельно от компонента ----------

FORM_RULES_TS = """import { email, schema } from '@angular/forms/signals';

// Правила, общие для форм магазина. Схема — набор правил для поля определённого типа:
// её применяют к любому полю с таким значением, в любой форме
export const emailRules = schema<string>((field) => {
  email(field, { message: 'Похоже, в адресе опечатка' });
});
"""

CHECKOUT_SCHEMA_TS = """import {
  apply,
  applyEach,
  applyWhen,
  disabled,
  hidden,
  maxLength,
  minLength,
  required,
  schema,
  validate,
} from '@angular/forms/signals';
import { emailRules } from '../shared/form-rules';

// Сколько открыток можно добавить к заказу и сколько букв в каждой
export const MAX_POSTCARDS = 3;
export const POSTCARD_TEXT_MAX = 120;

// Контакты покупателя
export interface Contacts {
  name: string;
  phone: string;
  email: string;
}

// Открытка к подарку: кому и что написать
export interface Postcard {
  to: string;
  text: string;
}

// Данные формы оформления заказа
export interface CheckoutData {
  contacts: Contacts;
  delivery: {
    method: 'pickup' | 'courier'; // самовывоз или курьер
    address: string;
    callBefore: boolean; // позвонить за час до приезда
  };
  postcards: Postcard[];
  comment: string;
}

// Телефон пишут по-разному: «+7 (900) 123-45-67», «8 900 1234567». Считаем только цифры:
// их 11, первая — 7 или 8
function isPhone(text: string) {
  return /^[78]\\d{10}$/.test(text.replace(/\\D/g, ''));
}

// Контакты: как обращаться и как связаться
export const contactsSchema = schema<Contacts>((contacts) => {
  required(contacts.name, { message: 'Как к вам обращаться?' });
  validate(contacts.phone, ({ value }) =>
    value() && !isPhone(value())
      ? {
          kind: 'phone',
          message: 'Номер — 11 цифр, например +7 900 123-45-67',
        }
      : undefined,
  );
  apply(contacts.email, emailRules);
  // Перекрёстная проверка: правило поля e-mail читает и соседнее поле — телефон
  validate(contacts.email, ({ value, valueOf }) =>
    !value().trim() && !valueOf(contacts.phone).trim()
      ? {
          kind: 'contact',
          message: 'Укажите телефон или e-mail, чтобы мы могли связаться с вами',
        }
      : undefined,
  );
});

// Открытка: адресат обязателен, текст — не длиннее POSTCARD_TEXT_MAX
export const postcardSchema = schema<Postcard>((postcard) => {
  required(postcard.to, { message: 'Кому эта открытка?' });
  maxLength(postcard.text, POSTCARD_TEXT_MAX, {
    message: `Не больше ${POSTCARD_TEXT_MAX} символов`,
  });
});

// Вся форма оформления: схемы частей и правила, которые связывают части между собой
export const checkoutSchema = schema<CheckoutData>((checkout) => {
  apply(checkout.contacts, contactsSchema);
  applyEach(checkout.postcards, postcardSchema);

  const delivery = checkout.delivery;
  // Самовывоз: адрес и звонок не нужны. Скрытое поле не проверяется и не влияет на форму
  hidden(delivery.address, {
    when: ({ valueOf }) => valueOf(delivery.method) === 'pickup',
  });
  hidden(delivery.callBefore, {
    when: ({ valueOf }) => valueOf(delivery.method) === 'pickup',
  });
  // Правила курьерской доставки — группой, пока выбран курьер
  applyWhen(
    checkout,
    ({ value }) => value().delivery.method === 'courier',
    (order) => {
      required(order.delivery.address, {
        message: 'Куда привезти заказ?',
      });
      minLength(order.delivery.address, 10, {
        message: 'Укажите улицу, дом и квартиру',
      });
      required(order.contacts.phone, {
        message: 'Курьеру нужен ваш телефон',
      });
    },
  );
  // Позвонить можно, только если есть номер. Строка — причина, её увидит покупатель
  disabled(delivery.callBefore, {
    when: ({ valueOf }) =>
      !valueOf(checkout.contacts.phone).trim() &&
      'Укажите телефон, и курьер позвонит заранее',
  });
});
"""


def checkout_ts_8(text):
    """checkout.ts шага 7 → шага 8: типы, константы и правила уходят в checkout-schema.ts."""
    text = rep(text, """import {
  FormField,
  applyEach,
  applyWhen,
  disabled,
  email,
  form,
  hidden,
  maxLength,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';""", "import { FormField, form } from '@angular/forms/signals';")
    text = rep(text, "import { PricePipe } from '../shared/price-pipe';", """import { PricePipe } from '../shared/price-pipe';
import {
  CheckoutData,
  MAX_POSTCARDS,
  POSTCARD_TEXT_MAX,
  checkoutSchema,
} from './checkout-schema';""")
    start = text.index('// Телефон пишут по-разному')
    end = text.index('// Оформление заказа:')
    text = text[:start] + text[end:]
    start = text.index('  protected readonly checkoutForm = form(this.model, (checkout) => {')
    end = text.index('  protected readonly maxPostcards')
    text = text[:start] + """  // Правила формы — в схеме: компоненту остаются данные и действия
  protected readonly checkoutForm = form(this.model, checkoutSchema);

""" + text[end:]
    return text


R8 = put(R7, **{
    'shared/form-rules.ts': FORM_RULES_TS,
    'checkout/checkout-schema.ts': CHECKOUT_SCHEMA_TS,
    'checkout/checkout.ts': checkout_ts_8(R7['checkout/checkout.ts']),
})
R8 = edit(R8, 'login/login.ts',
    ("""import {
  FieldTree,
  FormField,
  FormRoot,
  email,
  form,
  minLength,
  required,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';""", """import {
  FieldTree,
  FormField,
  FormRoot,
  apply,
  form,
  minLength,
  required,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { emailRules } from '../shared/form-rules';"""),
    ("""      email(login.email, { message: 'Похоже, в адресе опечатка' });""", """      apply(login.email, emailRules);"""))

# ---------- 13.9 Своё поле: звёзды в форме отзыва ----------

R9 = edit(R8, 'shared/rating/rating.ts',
    ("""  input,
  model,
} from '@angular/core';
import { formatNumber } from '@angular/common';""", """  input,
  model,
  output,
} from '@angular/core';
import { formatNumber } from '@angular/common';
import { FormValueControl } from '@angular/forms/signals';"""),
    ("""// Рейтинг звёздами: показывает оценку и, если не readonly, даёт её выбрать""", """// Рейтинг звёздами: показывает оценку и, если не readonly, даёт её выбрать.
// FormValueControl — договор поля формы: компонент с model() value можно связать с полем через [formField]"""),
    ("""    '(keydown.arrowleft)': 'step(-0.5)',
  },
})
export class Rating {""", """    '(keydown.arrowleft)': 'step(-0.5)',
    // Ушли со звёзд — сообщаем форме: поле «тронуто»
    '(blur)': 'touch.emit()',
  },
})
export class Rating implements FormValueControl<number> {"""),
    ("""  readonly readonly = input(false, {
    transform: booleanAttribute,
  });""", """  readonly readonly = input(false, {
    transform: booleanAttribute,
  });
  // Покупатель закончил с полем. Форма слушает этот выход и отмечает поле тронутым
  readonly touch = output();"""))

R9 = edit(R9, 'game/game-page.ts',
    ("""import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';
import { RouterLink } from '@angular/router';""", """import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';
import {
  FormField,
  FormRoot,
  form,
  min,
  required,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';"""),
    ("""import { DurationPipe } from '../shared/duration-pipe';""", """import { DurationPipe } from '../shared/duration-pipe';
import { FieldAria } from '../shared/field-aria';
import { FieldErrors } from '../shared/field-errors/field-errors';"""),
    ("""    Countdown,
    DatePipe,
    DurationPipe,""", """    Countdown,
    DatePipe,
    DurationPipe,
    FieldAria,
    FieldErrors,
    FormField,
    FormRoot,"""),
    ("""  // Оценка нового отзыва и сообщение, если отправить не удалось
  protected readonly newRating = signal(5);
  protected readonly reviewError = signal('');
""", """  // Новый отзыв — форма: оценка звёздами и текст. Компонент Rating — тоже поле формы
  private readonly reviewModel = signal({ rating: 5, text: '' });
  protected readonly reviewForm = form(
    this.reviewModel,
    (review) => {
      min(review.rating, 1, {
        message: 'Поставьте оценку — хотя бы одну звезду',
      });
      required(review.text, { message: 'Напишите пару слов об игре' });
    },
    { submission: { action: () => this.addReview() } },
  );
"""),
    ("""  protected addReview(textBox: HTMLTextAreaElement) {
    const text = textBox.value.trim();
    if (!text) {
      return;
    }
    // Черновик: так отзыв будет выглядеть, когда сервер его сохранит
    const draft: Review = {
      id: this.nextDraftId--,
      gameId: this.id(),
      author: 'Вы',
      rating: this.newRating(),
      text,
      date: new Date().toISOString().slice(0, 10),
    };
    // Оптимистичное обновление: отзыв появляется сразу, не дожидаясь ответа сервера
    this.reviews.update((reviews) => [...reviews, draft]);
    textBox.value = '';
    this.reviewError.set('');

    this.http
      .post<Review>(`/api/games/${this.id()}/reviews`, {
        rating: draft.rating,
        text,
      })
      .subscribe({
        // Сервер сохранил отзыв: заменяем черновик настоящим
        next: (saved) =>
          this.reviews.update((reviews) =>
            reviews.map((review) =>
              review === draft ? saved : review,
            ),
          ),
        // Не получилось: убираем черновик и возвращаем текст в поле
        error: () => {
          this.reviews.update((reviews) =>
            reviews.filter((review) => review !== draft),
          );
          textBox.value = text;
          this.reviewError.set(
            'Не удалось отправить отзыв. Попробуйте ещё раз.',
          );
        },
      });
  }""", """  // Отправка формы отзыва. Ошибку, которую вернёт функция, форма покажет у себя
  private async addReview() {
    const { rating, text } = this.reviewModel();
    // Черновик: так отзыв будет выглядеть, когда сервер его сохранит
    const draft: Review = {
      id: this.nextDraftId--,
      gameId: this.id(),
      author: 'Вы',
      rating,
      text,
      date: new Date().toISOString().slice(0, 10),
    };
    // Оптимистичное обновление: отзыв появляется сразу, а форма снова пустая
    this.reviews.update((reviews) => [...reviews, draft]);
    this.reviewForm().reset({ rating: 5, text: '' });

    try {
      const saved = await firstValueFrom(
        this.http.post<Review>(`/api/games/${this.id()}/reviews`, {
          rating,
          text,
        }),
      );
      // Сервер сохранил отзыв: заменяем черновик настоящим
      this.reviews.update((reviews) =>
        reviews.map((review) => (review === draft ? saved : review)),
      );
      return undefined;
    } catch {
      // Не получилось: убираем черновик и возвращаем отзыв в форму
      this.reviews.update((reviews) =>
        reviews.filter((review) => review !== draft),
      );
      this.reviewModel.set({ rating, text });
      return {
        kind: 'server',
        message: 'Не удалось отправить отзыв. Попробуйте ещё раз.',
      };
    }
  }"""))
R9 = edit(R9, 'game/game-page.html', ("""      <div class="review-form">
        <app-rating
          [value]="newRating()"
          (valueChange)="newRating.set($event)"
        />
        <textarea
          #reviewText
          rows="3"
          placeholder="Ваш отзыв"
          aria-label="Текст отзыва"
        ></textarea>
        <button class="button" (click)="addReview(reviewText)">
          Отправить
        </button>
        @if (reviewError()) {
          <p class="error-message">{{ reviewError() }}</p>
        }
      </div>""", """      <form class="review-form" [formRoot]="reviewForm">
        <!-- Rating — свой компонент, но для формы такое же поле, как textarea -->
        <app-rating [formField]="reviewForm.rating" />
        <app-field-errors [field]="reviewForm.rating" />
        <textarea
          rows="3"
          placeholder="Ваш отзыв"
          aria-label="Текст отзыва"
          [formField]="reviewForm.text"
        ></textarea>
        <app-field-errors [field]="reviewForm.text" />
        @for (error of reviewForm().errors(); track error.kind) {
          <p class="error-message">{{ error.message }}</p>
        }
        <button class="button">Отправить</button>
      </form>"""))

# ---------- 13.10 Практикум: заказ ----------

R10 = edit(R9, 'checkout/checkout.ts',
    ("""import {
  takeUntilDestroyed,
  toObservable,
} from '@angular/core/rxjs-interop';""", """import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import {
  takeUntilDestroyed,
  toObservable,
} from '@angular/core/rxjs-interop';"""),
    ("import { FormField, form } from '@angular/forms/signals';", "import { FormField, FormRoot, form } from '@angular/forms/signals';"),
    ("import { debounceTime, distinctUntilChanged } from 'rxjs';", """import {
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
} from 'rxjs';"""),
    ("  imports: [FieldAria, FieldErrors, FormField, PricePipe, RouterLink],", "  imports: [FieldAria, FieldErrors, FormField, FormRoot, PricePipe, RouterLink],"),
    ("""export class Checkout {
  protected readonly cart = inject(CartStore);
""", """export class Checkout {
  protected readonly cart = inject(CartStore);
  private readonly http = inject(HttpClient);
  // Номер оформленного заказа. Пока заказа нет — null
  protected readonly orderId = signal<number | null>(null);
"""),
    ("""  protected readonly checkoutForm = form(this.model, checkoutSchema);""", """  protected readonly checkoutForm = form(this.model, checkoutSchema, {
    submission: { action: () => this.placeOrder() },
  });"""),
    ("""  constructor() {""", """  // Есть ли что потерять: покупатель менял форму, а заказ ещё не оформлен
  hasUnsavedChanges() {
    return this.checkoutForm().dirty() && this.orderId() === null;
  }

  // Оформление: заказ уходит на сервер. Ошибку, которую вернёт функция, форма покажет у себя
  private async placeOrder() {
    const { contacts, delivery, postcards, comment } = this.model();
    try {
      const order = await firstValueFrom(
        this.http.post<{ id: number }>('/api/orders', {
          items: this.cart.items().map((item) => ({
            gameId: item.game.id,
            quantity: item.quantity,
          })),
          contacts,
          delivery,
          postcards,
          comment,
          promo: this.cart.promo()?.code ?? null,
          total: this.toPay(),
        }),
      );
      this.orderId.set(order.id);
      this.cart.clear();
      localStorage.removeItem(DRAFT_KEY);
      return undefined;
    } catch (error) {
      // 409 — на складе меньше, чем в корзине. Сервер пишет, какой игры не хватило
      if (error instanceof HttpErrorResponse && error.status === 409) {
        return { kind: 'out-of-stock', message: error.error.message };
      }
      return {
        kind: 'server',
        message: 'Не удалось оформить заказ. Попробуйте ещё раз',
      };
    }
  }

  constructor() {"""))
R10 = edit(R10, 'checkout/checkout.html',
    ("""<a class="back-link" routerLink="/cart">← Корзина</a>
<h1>Оформление заказа</h1>""", """@if (orderId(); as id) {
<h1>Заказ №{{ id }} оформлен</h1>
<p>Спасибо! Мы свяжемся с вами, когда заказ будет готов.</p>
<a routerLink="/catalog">Вернуться в каталог</a>
} @else {
<a class="back-link" routerLink="/cart">← Корзина</a>
<h1>Оформление заказа</h1>
<form [formRoot]="checkoutForm">"""),
    ("""    Черновик сохранён
  }
</p>
""", """    Черновик сохранён
  }
</p>
<!-- Ошибки всей формы: их вернула отправка -->
@for (error of checkoutForm().errors(); track error.kind) {
  <p class="error-message">{{ error.message }}</p>
}
<button class="button" [disabled]="checkoutForm().submitting()">
  {{ checkoutForm().submitting() ? 'Оформляем…' : 'Оформить заказ' }}
</button>
</form>
}
"""))
R10 = edit(R10, 'checkout/checkout-guards.ts',
    ("import { CanActivateFn, Router } from '@angular/router';", """import {
  CanActivateFn,
  CanDeactivateFn,
  Router,
} from '@angular/router';"""),
    ("import { CartStore } from '../core/cart-store';", "import { CartStore } from '../core/cart-store';\nimport { Checkout } from './checkout';"),
    ("""    cart.items().length > 0 || router.createUrlTree(['/cart'])
  );
};""", """    cart.items().length > 0 || router.createUrlTree(['/cart'])
  );
};

// Уходят со страницы с заполненной, но не отправленной формой — спросить. false отменяет переход
export const unsavedCheckoutGuard: CanDeactivateFn<Checkout> = (
  checkout,
) =>
  !checkout.hasUnsavedChanges() ||
  confirm('Данные заказа не сохранятся. Уйти со страницы?');"""))
R10 = edit(R10, 'app.routes.ts',
    ("import { cartNotEmptyGuard } from './checkout/checkout-guards';", """import {
  cartNotEmptyGuard,
  unsavedCheckoutGuard,
} from './checkout/checkout-guards';"""),
    ("""    canActivate: [cartNotEmptyGuard],""", """    canActivate: [cartNotEmptyGuard],
    // Отпустить со страницы? Спрашивает гард перед уходом
    canDeactivate: [unsavedCheckoutGuard],"""))

steps = {
    '01-form-model': {'start': S1, 'solution': R1},
    '02-validation': {'start': R1, 'solution': R2},
    '03-submit': {'start': R2, 'solution': R3},
    '04-custom-validation': {'start': S4, 'solution': R4},
    '05-async-validation': {'start': S5, 'solution': R5},
    '06-conditional-fields': {'start': S6, 'solution': R6},
    '07-field-arrays': {'start': S7, 'solution': R7},
    '08-schemas': {'start': R7, 'solution': R8},
    '09-custom-control': {'start': R8, 'solution': R9},
    '10-practice': {'start': R9, 'solution': R10},
}

# ---------- 13.11 Реактивные формы: как читать старый код (без решения) ----------

REACTIVE_LOGIN_TS = """import { Component, inject, signal } from '@angular/core';
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
      validators: [Validators.required, Validators.minLength(4)],
    }),
  });

  constructor() {
    // Изменения значения — поток RxJS
    this.loginForm.controls.email.valueChanges.subscribe((email) =>
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
            error instanceof HttpErrorResponse && error.status === 401
              ? 'Неверный e-mail или пароль'
              : 'Не удалось войти. Попробуйте ещё раз',
          );
        },
      });
  }
}
"""

REACTIVE_LOGIN_HTML = """<h1>Вход (реактивные формы)</h1>
@if (userName()) {
  <p>Здравствуйте, {{ userName() }}! Вы вошли.</p>
} @else {
  <!-- formGroup связывает <form> с объектом формы, formControlName — поле с контролом по имени -->
  <form class="login-form" [formGroup]="loginForm" (ngSubmit)="logIn()">
    <label class="field">
      E-mail
      <input type="email" autocomplete="email" formControlName="email" />
      @let email = loginForm.controls.email;
      @if (email.touched && email.errors; as errors) {
        <ul class="field-errors">
          @if (errors['required']) {
            <li>Введите e-mail</li>
          }
          @if (errors['email']) {
            <li>Похоже, в адресе опечатка</li>
          }
        </ul>
      }
    </label>
    <label class="field">
      Пароль
      <input
        type="password"
        autocomplete="current-password"
        formControlName="password"
      />
      @let password = loginForm.controls.password;
      @if (password.touched && password.errors; as errors) {
        <ul class="field-errors">
          @if (errors['required']) {
            <li>Введите пароль</li>
          }
          @if (errors['minlength']) {
            <li>Пароль — не короче 4 символов</li>
          }
        </ul>
      }
    </label>
    @if (serverError()) {
      <p class="error-message">{{ serverError() }}</p>
    }
    <button class="button" [disabled]="submitting()">
      {{ submitting() ? 'Входим…' : 'Войти' }}
    </button>
  </form>
}
"""

S11 = put(R10, **{
    'login/reactive-login.ts': REACTIVE_LOGIN_TS,
    'login/reactive-login.html': REACTIVE_LOGIN_HTML,
})
S11 = edit(S11, 'app.routes.ts',
    ("import { Login } from './login/login';", "import { Login } from './login/login';\nimport { ReactiveLogin } from './login/reactive-login';"),
    ("""  { path: 'login', component: Login, title: 'Вход' },""", """  { path: 'login', component: Login, title: 'Вход' },
  // Шаг «Реактивные формы»: та же форма входа в старом стиле
  {
    path: 'login-reactive',
    component: ReactiveLogin,
    title: 'Вход (реактивные формы)',
  },"""))

steps['11-reactive-forms'] = {'start': S11}

# ---------- 13.12 Под капотом: дерево полей (без решения) ----------

FORMS_INSIDE_TS = """import { Injector, signal } from '@angular/core';
import {
  applyEach,
  form,
  required,
  validate,
} from '@angular/forms/signals';

// Опыт для шага «Под капотом»: как устроена форма. Вывод — в консоли
export function exploreForms(injector: Injector) {
  const model = signal({
    contacts: { name: '', phone: '' },
    postcards: [{ to: 'Маше' }, { to: 'Пете' }],
  });
  let schemaRuns = 0;
  let nameChecks = 0;
  // Вне конструктора компонента инжектор передаём явно
  const order = form(
    model,
    (path) => {
      schemaRuns++;
      console.log('1. Схема получила путь:', typeof path.contacts.name);
      validate(path.contacts.name, ({ value }) => {
        nameChecks++;
        return value() ? undefined : { kind: 'required' };
      });
      applyEach(path.postcards, (postcard) => required(postcard.to));
    },
    { injector },
  );

  console.log(
    '2. Форма — это функция:',
    typeof order,
    '| поле то же самое:',
    order.contacts === order.contacts,
  );

  // Запись в поле — новый объект модели, но нетронутые части — те же объекты
  const before = model();
  order.contacts.name().value.set('Маша');
  console.log(
    '3. Новый корень:',
    model() !== before,
    '| новый contacts:',
    model().contacts !== before.contacts,
    '| те же postcards:',
    model().postcards === before.postcards,
  );

  // Правила — вычисляемые сигналы: выполняются, когда ошибки читают, и только после изменений
  console.log('4. Проверок имени до чтения:', nameChecks);
  order.contacts.name().errors();
  order.contacts.name().errors();
  console.log('   после двух чтений:', nameChecks);
  order.contacts.name().value.set('');
  console.log('   после записи:', nameChecks);
  console.log('   форма верна:', order().valid(), '| проверок:', nameChecks);

  // Элементы массива форма метит символом прямо на объекте модели
  order.postcards[1].to().markAsTouched();
  const marked = model().postcards[1];
  console.log(
    '5. Символы на открытке:',
    Object.getOwnPropertySymbols(marked).map(String).join(', '),
    '| JSON:',
    JSON.stringify(marked),
  );
  // Переставили открытки местами — поле переехало вместе с объектом
  model.update((m) => ({
    ...m,
    postcards: [m.postcards[1], m.postcards[0]],
  }));
  console.log('   после перестановки тронута первая:', order.postcards[0].to().touched());
  // Копия через spread копирует и символ
  model.update((m) => ({
    ...m,
    postcards: m.postcards.map((postcard) => ({ ...postcard })),
  }));
  console.log('   после { ...postcard }:', order.postcards[0].to().touched());
  // Новый объект без символа — для формы это новая открытка
  model.update((m) => ({
    ...m,
    postcards: m.postcards.map((postcard) => ({ to: postcard.to })),
  }));
  console.log('   после { to: postcard.to }:', order.postcards[0].to().touched());

  console.log('6. Схема выполнилась раз:', schemaRuns);
}
"""

S12 = put(R10, **{'forms-inside.ts': FORMS_INSIDE_TS})
S12 = edit(S12, 'main.ts',
    ("import { appConfig } from './app.config';", "import { appConfig } from './app.config';\nimport { exploreForms } from './forms-inside';"),
    ("""bootstrapApplication(App, appConfig).catch((err) =>
  console.error(err),
);""", """bootstrapApplication(App, appConfig)
  // Опыт шага «Под капотом»: вывод — в консоли
  .then((app) => exploreForms(app.injector))
  .catch((err) => console.error(err));"""))

steps['12-forms-inside'] = {'start': S12}

if __name__ == '__main__':
    write_steps(ROOT, steps, base='12-rxjs/09-practice')
    print('ok')
