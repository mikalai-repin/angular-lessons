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
      // Компонент без шаблона-родителя: входы и выход привязываем здесь же, при создании
      const dialog = createComponent(ConfirmDialog, {
        environmentInjector: this.injector,
        bindings: [
          inputBinding('question', () => question),
          inputBinding('action', () => action),
          outputBinding<boolean>('answer', (yes) => {
            resolve(yes);
            // Ответ получен — окно больше не нужно: убрать из DOM и из обнаружения изменений
            dialog.destroy();
          }),
        ],
      });
      // Хост-элемент <app-confirm-dialog> создан, но его нет на странице — добавляем сами
      document.body.append(dialog.location.nativeElement);
      // Представление окна — в обнаружение изменений приложения: иначе его никто не проверит
      this.appRef.attachView(dialog.hostView);
    });
  }
}
