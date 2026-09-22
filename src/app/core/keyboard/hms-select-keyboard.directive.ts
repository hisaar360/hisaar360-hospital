import { Directive, HostListener } from '@angular/core';
import { openFocusedSelectMenu } from './hms-keyboard.types';

/**
 * Makes native <select> keyboard-friendly: Enter / Space / Alt+↓ opens the options list
 * via showPicker() where the browser supports it.
 *
 * Import this directive in the page component — selector `select` applies to all
 * selects in that template.
 */
@Directive({
  selector: 'select',
  standalone: true,
})
export class HmsSelectKeyboardDirective {
  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (openFocusedSelectMenu(event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
