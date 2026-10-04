import { DestroyRef, Directive, ElementRef, afterNextRender, inject, output } from '@angular/core';

// Сообщает, что хост-элемент появился на экране: <div (appInView)="…">
@Directive({ selector: '[appInView]' })
export class InView {
  // В шаблоне выход называется как селектор: (appInView)="…"
  readonly visible = output({ alias: 'appInView' });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    // IntersectionObserver — API браузера: создаём его после отрисовки, когда хост уже в документе
    afterNextRender(() => {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.visible.emit();
        }
      });
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
