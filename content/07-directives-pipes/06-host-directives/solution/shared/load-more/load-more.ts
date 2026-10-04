import { Component, inject, output } from '@angular/core';
import { InView } from '../in-view';

// «Показать ещё»: кнопка, которая срабатывает и сама, когда покупатель докрутил до неё
@Component({
  selector: 'app-load-more',
  // InView работает на хосте <app-load-more>, как если бы родитель написал там appInView
  hostDirectives: [InView],
  templateUrl: './load-more.html',
  styleUrl: './load-more.css',
})
export class LoadMore {
  readonly more = output();

  constructor() {
    // Директива на том же хосте — её экземпляр выдаёт inject
    inject(InView).visible.subscribe(() => this.more.emit());
  }
}
