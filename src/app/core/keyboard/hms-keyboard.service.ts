import { Injectable } from '@angular/core';
import {
  HmsKeyboardPageContext,
  isEditableTarget,
  isModKey,
  openFocusedSelectMenu,
  selectFocusedFieldOnEnter,
  shouldIgnoreKeyboardEvent,
  stepFocusedNumberInput,
} from './hms-keyboard.types';

/**
 * Registers the active page keyboard context. Only the top registered
 * context receives events (supports nested pages via stack).
 */
@Injectable({ providedIn: 'root' })
export class HmsKeyboardService {
  private readonly stack: HmsKeyboardPageContext[] = [];
  private bound = false;
  private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
    this.handleDocumentKeydown(event);
  };

  register(context: HmsKeyboardPageContext): () => void {
    this.ensureBound();
    this.stack.push(context);
    return () => this.unregister(context.id);
  }

  unregister(id: string): void {
    const index = this.stack.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.stack.splice(index, 1);
    }
    if (!this.stack.length) {
      this.teardown();
    }
  }

  get active(): HmsKeyboardPageContext | null {
    return this.stack.length ? this.stack[this.stack.length - 1] : null;
  }

  /** Shared helper: Ctrl/Cmd+S → true when pressed. */
  isSaveChord(event: KeyboardEvent): boolean {
    return isModKey(event) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 's';
  }

  /** Shared helper: Ctrl/Cmd+F → true. */
  isFindChord(event: KeyboardEvent): boolean {
    return isModKey(event) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'f';
  }

  /** Slash focuses search when not typing in an editable field. */
  isFocusSearchSlash(event: KeyboardEvent): boolean {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }
    return !isEditableTarget(event.target);
  }

  private ensureBound(): void {
    if (this.bound || typeof document === 'undefined') {
      return;
    }
    document.addEventListener('keydown', this.onDocumentKeydown, false);
    this.bound = true;
  }

  private teardown(): void {
    if (!this.bound || typeof document === 'undefined') {
      return;
    }
    document.removeEventListener('keydown', this.onDocumentKeydown, false);
    this.bound = false;
  }

  private handleDocumentKeydown(event: KeyboardEvent): void {
    if (shouldIgnoreKeyboardEvent(event)) {
      return;
    }

    const ctx = this.active;
    if (!ctx) {
      return;
    }

    if (event.key === 'Escape' && ctx.onEscape) {
      if (ctx.onEscape()) {
        event.preventDefault();
        return;
      }
    }

    // Make native <select> keyboard-friendly (Enter rarely opens the menu by default).
    if (openFocusedSelectMenu(event)) {
      event.preventDefault();
      return;
    }

    // ↑↓ on number fields (discount, fees, amount paid) — shared POS-style stepping.
    if (stepFocusedNumberInput(event)) {
      event.preventDefault();
      return;
    }

    // Enter on simple inputs selects value for overwrite (pages can opt out).
    if (selectFocusedFieldOnEnter(event)) {
      event.preventDefault();
      return;
    }

    const handled = ctx.onKeydown(event);
    if (handled) {
      event.preventDefault();
    }
  }
}
