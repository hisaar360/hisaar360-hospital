import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyService } from '../../core/services/currency.service';

/**
 * Shared money formatter for the whole HMS UI.
 * Uses the hospital/company currency symbol from CurrencyService (default Rs.).
 *
 * Usage: {{ amount | hmsCurrency }} or {{ amount | hmsCurrency:2 }}
 */
@Pipe({
  name: 'hmsCurrency',
  standalone: true,
  pure: false,
})
export class HmsCurrencyPipe implements PipeTransform {
  constructor(private currency: CurrencyService) {}

  transform(value: unknown, fractionDigits?: number): string {
    return this.currency.format(value, {
      fractionDigits: fractionDigits ?? undefined,
    });
  }
}
