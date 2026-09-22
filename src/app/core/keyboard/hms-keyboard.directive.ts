import { Directive, Input, OnDestroy, OnInit } from '@angular/core';
import { HmsKeyboardService } from './hms-keyboard.service';
import { HmsKeyboardHandler, HmsKeyboardPageContext } from './hms-keyboard.types';

/**
 * Place on a page root element to register keyboard handling for that view.
 *
 * @example
 * <div id="main-content" hmsKeyboard pageId="lab-order-create"
 *   [keyboardHandler]="onPageKeydown" [escapeHandler]="onPageEscape">
 */
@Directive({
  selector: '[hmsKeyboard]',
  standalone: true,
})
export class HmsKeyboardDirective implements OnInit, OnDestroy {
  @Input({ required: true }) pageId = '';
  @Input() keyboardHandler: HmsKeyboardHandler | null = null;
  @Input() escapeHandler: (() => boolean) | null = null;

  private unregister: (() => void) | null = null;

  constructor(private keyboard: HmsKeyboardService) {}

  ngOnInit(): void {
    if (!this.pageId || !this.keyboardHandler) {
      return;
    }

    const context: HmsKeyboardPageContext = {
      id: this.pageId,
      onKeydown: (event) => this.keyboardHandler?.(event) ?? false,
      onEscape: this.escapeHandler || undefined,
    };
    this.unregister = this.keyboard.register(context);
  }

  ngOnDestroy(): void {
    this.unregister?.();
    this.unregister = null;
  }
}
