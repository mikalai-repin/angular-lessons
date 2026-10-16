import { email, schema } from '@angular/forms/signals';

// Правила, общие для форм магазина. Схема — набор правил для поля определённого типа:
// её применяют к любому полю с таким значением, в любой форме
export const emailRules = schema<string>((field) => {
  email(field, { message: 'Похоже, в адресе опечатка' });
});
