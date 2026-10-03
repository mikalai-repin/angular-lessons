import { Component, inject, signal, viewChild, ElementRef, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { form, FormField, required } from '@angular/forms/signals';
import { CounterService } from './counter.service';
import { TodoItem } from './todo-item';

@Component({
  selector: 'app-root',
  imports: [TodoItem, FormField],
  template: `
    <h1 #title>Счёт: {{ counter.count() }} / {{ counter.double() }}</h1>
    <button id="inc" (click)="counter.inc()">+1</button>
    <ul>
      @for (t of todos(); track t.title) {
        <app-todo-item [title]="t.title" [done]="t.done" (toggled)="toggle($event)" />
      }
    </ul>
    <input id="name" [formField]="loginForm.name" />
    <p id="valid">valid={{ loginForm().valid() }} name={{ model().name }}</p>
  `,
})
class App {
  protected readonly counter = inject(CounterService);
  protected readonly todos = signal([{ title: 'Учить сигналы', done: false }, { title: 'Учить DI', done: true }]);
  protected readonly title = viewChild.required<ElementRef<HTMLElement>>('title');
  protected readonly model = signal({ name: '' });
  protected readonly loginForm = form(this.model, (p) => { required(p.name); });
  toggle(title: string) {
    this.todos.update((list) => list.map((t) => (t.title === title ? { ...t, done: !t.done } : t)));
    console.log('toggled', title, 'h1=', this.title().nativeElement.textContent);
  }
}

bootstrapApplication(App, { providers: [provideZonelessChangeDetection()] })
  .then(() => console.log('bootstrapped'))
  .catch((e) => console.error('BOOT ERROR', e));
