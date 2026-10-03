import { Component, input, output } from '@angular/core';
@Component({
  selector: 'app-todo-item',
  template: `<li (click)="toggled.emit(title())">{{ title() }} @if (done()) { ✓ }</li>`,
})
export class TodoItem {
  readonly title = input.required<string>();
  readonly done = input(false);
  readonly toggled = output<string>();
}
