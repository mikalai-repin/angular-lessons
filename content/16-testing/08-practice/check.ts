import type { Check } from '@course/check';

// Проверка практикума: тесты оформления заказа написаны и проходят.
// Что именно проверяют тесты, проверка не знает: она смотрит на результаты прогона тестов ученика
const check: Check = ({ tests, unhandled, fail }) => {
  const SCHEMA = 'checkout/checkout-schema.spec.ts';
  const PAGE = 'checkout/checkout.spec.ts';
  const passed = (file: string) =>
    tests.filter((t) => t.file === file && t.state === 'pass')
      .length;

  const failed = tests.find((t) => t.state === 'fail');
  if (failed) {
    fail(
      `Тест «${failed.fullName}» (${failed.file}) не проходит: ${failed.errors[0] ?? 'смотрите отчёт'}. Почините его — проверка ждёт, что проходят все тесты.`,
    );
  }
  if (unhandled.length > 0) {
    fail(
      `В отчёте есть ошибки вне тестов (${unhandled.length}): ${unhandled[0].message}. Чаще всего это промис, которого тест не дождался, или исключение в обработчике.`,
    );
  }
  if (passed(SCHEMA) < 5) {
    fail(
      `В ${SCHEMA} проходящих тестов: ${passed(SCHEMA)}, а нужно не меньше пяти: правильный заказ, нет телефона и e-mail, телефон с ошибкой, курьер без адреса, открытка без адресата.`,
    );
  }
  if (passed(PAGE) < 3) {
    fail(
      `В ${PAGE} проходящих тестов: ${passed(PAGE)}, а нужно не меньше трёх: пустая форма не уходит, заказ оформлен, на складе не хватило (409).`,
    );
  }
  return { pass: true };
};

export default check;
