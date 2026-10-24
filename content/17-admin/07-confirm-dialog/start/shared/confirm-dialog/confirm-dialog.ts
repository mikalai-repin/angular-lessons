import {
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  viewChild,
} from '@angular/core';

// Окно «Вы уверены?»: вопрос и две кнопки. Ответ — в выход answer: true — «да», false — отмена или Esc
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  readonly question = input.required<string>();
  // Подпись кнопки «да»: «Удалить», «Уйти»
  readonly action = input('Да');
  readonly answer = output<boolean>();

  private readonly dialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    // Модальным <dialog> делает только showModal(), а вызвать его можно, когда элемент уже в документе
    afterNextRender(() =>
      this.dialog().nativeElement.showModal(),
    );
  }
}
