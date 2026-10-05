import { Component, input, signal } from '@angular/core';

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
  // Видна ли вкладка. Это решает Tabs, поэтому здесь не вход, а сигнал, который Tabs меняет сам
  readonly active = signal(false);
}
