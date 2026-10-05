import { Component, InjectionToken, Signal, computed, inject, input } from '@angular/core';

// Что вкладке нужно от компонента Tabs, внутри которого она стоит
export interface TabsParent {
  readonly selectedTab: Signal<Tab | undefined>;
}

// Ключ, по которому вкладка находит свой Tabs. Импортировать класс Tabs сюда нельзя:
// tabs.ts уже импортирует tab.ts, и файлы импортировали бы друг друга
export const TABS = new InjectionToken<TabsParent>('TABS');

// Одна вкладка: название для кнопки и содержимое, которое передал родитель
@Component({
  selector: 'app-tab',
  templateUrl: './tab.html',
  host: {
    role: 'tabpanel',
    '[hidden]': '!active()',
  },
})
export class Tab {
  readonly label = input.required<string>();

  // Tabs, внутри которого стоит вкладка: DI ищет TABS вверх по элементам
  private readonly tabs = inject(TABS);
  // Видна ли вкладка: выбрана ли в Tabs именно она
  protected readonly active = computed(() => this.tabs.selectedTab() === this);
}
