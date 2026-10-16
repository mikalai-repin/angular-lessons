---
title: Реактивные формы
startFrom: custom
noSolution: true
focus: login/reactive-login.ts
url: /login-reactive
api: [FormGroup, FormControl, Validators, ReactiveFormsModule, formControlName, valueChanges]
---

Signal Forms появились в Angular недавно. До них большие формы писали на **реактивных формах** — `FormGroup` и `FormControl`. Этот API есть в Angular давно, не устарел (в 22.2 он `@publicApi`, без пометки `@deprecated`), и его вы встретите почти в любом существующем проекте. Писать на нём новые формы курс не предлагает, но читать такой код нужно уметь.

Этот шаг без задания. Мы перепишем знакомую форму входа на реактивных формах и сравним с тем, что получилось на Signal Forms.

## Что изменилось в коде

- новый компонент `login/reactive-login.ts` и его шаблон — та же форма входа: e-mail, пароль, те же правила, тот же `POST /api/login`;
- маршрут `/login-reactive` — превью уже на нём.

После этого шага демо-компонент уберём.

## Форма — дерево объектов

```ts login/reactive-login.ts
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
```

Главное отличие — **где живёт значение**. В Signal Forms значение лежит в вашем сигнале-модели, а форма — надстройка над ним. В реактивной форме значение хранит сам **контрол** — объект `FormControl`. Группа контролов — `FormGroup`, список — `FormArray`. Значение всей формы собирается из контролов: `loginForm.value`, `loginForm.getRawValue()`.

`nonNullable: true` — тоже наследие: без него `reset()` записывает в контрол `null`, и тип значения — `string | null`.

Правила — функции из класса `Validators`: `required`, `email`, `minLength(4)`, `pattern(…)`. Свои правила — функции, которые получают контрол и возвращают объект ошибок или `null`.

## Шаблон

```html login/reactive-login.html
<form class="login-form" [formGroup]="loginForm" (ngSubmit)="logIn()">
  <input type="email" formControlName="email" />
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
</form>
```

- `[formGroup]` связывает элемент `<form>` с объектом формы, `formControlName="email"` — поле ввода с контролом по имени внутри группы. Обе директивы — из `ReactiveFormsModule`: в `imports` компонента подключают весь модуль (это `NgModule` — из тех времён, когда компоненты собирали в модули).
- `(ngSubmit)` — событие отправки. Перезагрузку страницы директива `formGroup` отменяет сама, как `FormRoot`. А вот не отправлять форму с ошибками и показать ошибки во всех полях — ваша забота: в `logIn` первым делом `if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }`.
- Состояние — **обычные свойства**, а не сигналы: `email.touched`, `email.errors`, `loginForm.invalid`. Скобок нет.
- Ошибки — объект, а не массив: `{ required: true }`, `{ minlength: { requiredLength: 4, actualLength: 3 } }`. Текстов в правилах нет — сообщения пишут в шаблоне, по ключам ошибок. Обратите внимание на регистр: ключ `minlength`, а в Signal Forms `kind` — `minLength`.
- Состояния отправки нет: сигнал `submitting` и ошибку сервера `serverError` компонент заводит сам.

Изменения значения — поток RxJS:

```ts login/reactive-login.ts
this.loginForm.controls.email.valueChanges.subscribe((email) =>
  console.log('Реактивная форма: e-mail —', email),
);
```

## Сравнение

| | Signal Forms | Реактивные формы |
|---|---|---|
| Где значение | ваш сигнал-модель | внутри контролов |
| Структура | из формы модели, сама | `FormGroup`/`FormControl`/`FormArray` вручную |
| Правила | схема: `required(path)`, `validate` | `Validators.required`, функции-валидаторы |
| Состояние | сигналы: `touched()`, `errors()` | свойства: `touched`, `errors` |
| Ошибки | массив `{ kind, message }` | объект `{ required: true }` |
| Изменения | сигналы, `computed`, `effect` | Observable `valueChanges`, `statusChanges` |
| Отправка | `FormRoot`, `submission.action`, `submitting()` | `(ngSubmit)`, всё остальное вручную |
| Связь с элементом | `[formField]` | `formControlName`, `[formControl]` |

## Эксперименты

**Поток изменений.** Напечатайте в поле e-mail `user` — в консоли четыре строки «Реактивная форма: e-mail — …»: `valueChanges` присылает значение на каждую букву.

**Классы состояния.** Посмотрите в инструментах разработчика на поле e-mail: у него классы `ng-untouched ng-pristine ng-invalid`. Уйдите из поля — `ng-touched`. Реактивные формы ставят их сами, и в старых проектах ими часто рисуют ошибки (`input.ng-invalid.ng-touched { … }`). `[formField]` по умолчанию классов не ставит — поэтому в магазине рамку рисует `[aria-invalid='true']`, а этот атрибут ставят шаблон и директива `FieldAria`.

**Состояние без сигналов.** Добавьте в конструктор `setTimeout(() => this.loginForm.controls.email.setValue('user@'), 1000)`, а в шаблон над формой — `<p>Значение: {{ loginForm.value.email }}</p>`. Через секунду в поле появится `user@`: директива записывает значение в элемент сама. А строка «Значение:» останется пустой — пока вы не напечатаете что-нибудь в пароле. Шаблон читает обычное свойство, а не сигнал, поэтому Angular не знает, что пора проверить компонент. Ввод в поле — событие шаблона, после него Angular проверяет компонент, и строка обновляется. В приложениях с zone.js такого не было: zone.js запускал проверку после любого `setTimeout`. Переводя старый проект на зонлесс, эту разницу встретите первой. Уберите обе строки.

## Как в настоящем проекте: переход на Signal Forms

Переписывать большие формы разом не обязательно. В `@angular/forms/signals/compat` есть мосты (`@publicApi 22.0`):

- `compatForm(модель)` — форма Signal Forms, в модели которой могут лежать готовые `FormControl` из старого кода;
- `SignalFormControl` — контрол с правилами Signal Forms, который можно положить в старую `FormGroup`.

Так форму переводят по частям: сверху вниз или снизу вверх.

::: legacy Вы встретите в старом коде: FormBuilder
Вместо `new FormGroup({ email: new FormControl('') })` часто пишут через сервис `FormBuilder`: `inject(FormBuilder).nonNullable.group({ email: ['', [Validators.required, Validators.email]] })` — то же самое, только короче. А в совсем старом коде — `constructor(private fb: FormBuilder)` и `ngOnInit` с `this.form = this.fb.group(…)`.
:::
