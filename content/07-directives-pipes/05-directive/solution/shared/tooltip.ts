import {
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
} from '@angular/core';

// Подсказка при наведении: <span appTooltip="Текст подсказки">
@Directive({
  selector: '[appTooltip]',
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
  },
})
export class Tooltip {
  // Текст подсказки. Вход называется так же, как селектор: текст пишется прямо в атрибуте appTooltip
  readonly appTooltip = input.required<string>();

  // Хост — элемент, на котором стоит директива
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  // Элемент подсказки, пока она на экране
  private tip: HTMLElement | null = null;

  constructor() {
    // Хост уничтожен, пока подсказка видна (карточку убрал фильтр), — убрать и подсказку
    inject(DestroyRef).onDestroy(() => this.hide());
  }

  protected show() {
    this.hide();
    this.tip = document.createElement('div');
    this.tip.className = 'tooltip';
    this.tip.textContent = this.appTooltip();
    document.body.append(this.tip);
    // Под хостом, но не за правым краем страницы
    const rect = this.host.getBoundingClientRect();
    const left = Math.min(
      rect.left,
      document.documentElement.clientWidth -
        this.tip.offsetWidth -
        8,
    );
    this.tip.style.left = `${left + window.scrollX}px`;
    this.tip.style.top = `${rect.bottom + window.scrollY + 6}px`;
  }

  protected hide() {
    this.tip?.remove();
    this.tip = null;
  }
}
