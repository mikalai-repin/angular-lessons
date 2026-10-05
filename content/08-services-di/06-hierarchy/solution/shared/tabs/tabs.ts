import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  contentChildren,
  signal,
  viewChildren,
} from '@angular/core';
import { TABS, Tab, TabsParent } from './tab';

// Вкладки: кнопки с названиями и содержимое выбранной вкладки
@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.html',
  styleUrl: './tabs.css',
  // Кто внутри <app-tabs> попросит TABS, получит этот же экземпляр Tabs
  providers: [{ provide: TABS, useExisting: Tabs }],
})
export class Tabs implements TabsParent {
  // Вкладки, которые родитель вложил между <app-tabs> и </app-tabs>
  protected readonly tabs = contentChildren(Tab);
  // Номер выбранной вкладки
  protected readonly selected = signal(0);
  // Выбранная вкладка. Каждая Tab сама сравнивает её с собой
  readonly selectedTab = computed(
    () => this.tabs()[this.selected()],
  );

  // Кнопки вкладок из шаблона Tabs: #tabButton
  private readonly buttons =
    viewChildren<ElementRef<HTMLElement>>('tabButton');
  // Где стоит и какой ширины полоска под выбранной вкладкой
  protected readonly ink = signal({ left: 0, width: 0 });

  constructor() {
    // После отрисовки замерить кнопку выбранной вкладки — полоска встанет под неё
    afterRenderEffect({
      read: () => {
        const button =
          this.buttons()[this.selected()]?.nativeElement;
        if (button) {
          this.ink.set({
            left: button.offsetLeft,
            width: button.offsetWidth,
          });
        }
      },
    });
  }
}
