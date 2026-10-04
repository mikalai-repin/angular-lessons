import { Component, contentChildren, effect, signal } from '@angular/core';
import { Tab } from './tab';

// Вкладки: кнопки с названиями и содержимое выбранной вкладки
@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.html',
  styleUrl: './tabs.css',
})
export class Tabs {
  // Вкладки, которые родитель вложил между <app-tabs> и </app-tabs>
  protected readonly tabs = contentChildren(Tab);
  // Номер выбранной вкладки
  protected readonly selected = signal(0);

  constructor() {
    // Выбранную вкладку показать, остальные спрятать
    effect(() => {
      const selected = this.selected();
      this.tabs().forEach((tab, index) => tab.active.set(index === selected));
    });
  }
}
