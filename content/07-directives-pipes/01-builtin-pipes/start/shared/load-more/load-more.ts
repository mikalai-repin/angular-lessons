import { Component, DestroyRef, ElementRef, afterNextRender, inject, output } from '@angular/core';

// «Показать ещё»: кнопка, которая срабатывает и сама, когда покупатель докрутил до неё
@Component({
  selector: 'app-load-more',
  templateUrl: './load-more.html',
  styleUrl: './load-more.css',
})
export class LoadMore {
  readonly more = output();

  constructor() {
    // inject работает только здесь, в контексте внедрения, — не внутри afterNextRender
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    // IntersectionObserver — API браузера: создаём его после отрисовки, когда хост уже в документе
    afterNextRender(() => {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.more.emit();
        }
      });
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
