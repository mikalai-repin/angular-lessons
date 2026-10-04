import { Component, ElementRef, afterRenderEffect, contentChildren, effect, signal, viewChildren } from '@angular/core';
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

  // Кнопки вкладок из шаблона Tabs: #tabButton
  private readonly buttons = viewChildren<ElementRef<HTMLElement>>('tabButton');
  // Где стоит и какой ширины полоска под выбранной вкладкой
  protected readonly ink = signal({ left: 0, width: 0 });

  constructor() {
    // Выбранную вкладку показать, остальные спрятать
    effect(() => {
      const selected = this.selected();
      this.tabs().forEach((tab, index) => tab.active.set(index === selected));
    });

    // После отрисовки замерить кнопку выбранной вкладки — полоска встанет под неё
    afterRenderEffect({
      read: () => {
        const button = this.buttons()[this.selected()]?.nativeElement;
        if (button) {
          this.ink.set({ left: button.offsetLeft, width: button.offsetWidth });
        }
      },
    });
  }
}
