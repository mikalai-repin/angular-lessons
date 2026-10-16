import { Injector, signal } from '@angular/core';
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
      console.log(
        '1. Схема получила путь:',
        typeof path.contacts.name,
      );
      validate(path.contacts.name, ({ value }) => {
        nameChecks++;
        return value() ? undefined : { kind: 'required' };
      });
      applyEach(path.postcards, (postcard) =>
        required(postcard.to),
      );
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
  console.log(
    '   форма верна:',
    order().valid(),
    '| проверок:',
    nameChecks,
  );

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
  console.log(
    '   после перестановки тронута первая:',
    order.postcards[0].to().touched(),
  );
  // Копия через spread копирует и символ
  model.update((m) => ({
    ...m,
    postcards: m.postcards.map((postcard) => ({ ...postcard })),
  }));
  console.log(
    '   после { ...postcard }:',
    order.postcards[0].to().touched(),
  );
  // Новый объект без символа — для формы это новая открытка
  model.update((m) => ({
    ...m,
    postcards: m.postcards.map((postcard) => ({
      to: postcard.to,
    })),
  }));
  console.log(
    '   после { to: postcard.to }:',
    order.postcards[0].to().touched(),
  );

  console.log('6. Схема выполнилась раз:', schemaRuns);
}
