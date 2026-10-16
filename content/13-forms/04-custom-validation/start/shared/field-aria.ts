import { Directive, computed, inject } from '@angular/core';
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
    '[attr.aria-describedby]':
      'showErrors() ? errorsId() : null',
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
