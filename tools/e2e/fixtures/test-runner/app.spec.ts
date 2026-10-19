import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NotFound } from './not-found/not-found';

describe('маршруты', () => {
  it('неизвестный адрес — «Нет такой страницы»', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: NotFound }])],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/abc', NotFound);
    expect(harness.routeNativeElement?.textContent).toContain('Нет такой страницы');
  });
});
