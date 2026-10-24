import {
  ApplicationRef,
  EnvironmentInjector,
  Service,
  createComponent,
  inject,
  inputBinding,
  outputBinding,
} from '@angular/core';
import { ConfirmDialog } from '../shared/confirm-dialog/confirm-dialog';

// Вопрос «Вы уверены?» в модальном окне. Окно создаётся из кода, когда нужно, и исчезает после ответа
@Service()
export class Confirmation {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);

  // Задать вопрос. Промис ответа: true — «да», false — отмена
  ask(question: string, action = 'Да'): Promise<boolean> {
    return new Promise((resolve) => {
      // TODO: создать ConfirmDialog (createComponent) с вопросом, подписью кнопки и ответом;
      // добавить его на страницу и в обнаружение изменений, после ответа — уничтожить
    });
  }
}
