import { Component, inject } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { FieldAria } from '../shared/field-aria';
import { FieldErrors } from '../shared/field-errors/field-errors';
import { PricePipe } from '../shared/price-pipe';
import { MESSAGE_MAX, WRAPPINGS } from './gift-schema';
import { GiftStore } from './gift-store';

// Шаг 2, /gift/design: упаковка и открытка
@Component({
  selector: 'app-gift-design',
  imports: [
    FieldAria,
    FieldErrors,
    FormField,
    PricePipe,
    RouterLink,
  ],
  templateUrl: './gift-design.html',
})
export class GiftDesign {
  protected readonly gift = inject(GiftStore);
  private readonly router = inject(Router);

  protected readonly wrappings = WRAPPINGS;
  protected readonly messageMax = MESSAGE_MAX;

  protected next() {
    const design = this.gift.form.design();
    design.markAsTouched();
    if (design.valid()) {
      this.router.navigate(['/gift/confirm']);
    }
  }
}
