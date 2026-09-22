/**
 * Shared HMS keyboard standards (Mac + Windows).
 * Mac: Cmd = Meta; Windows: Ctrl. Use isModKey() for both.
 */

export type HmsKeyboardZone = string;

export type HmsPrintJobType = 'invoice' | 'a4';

export type HmsKeyboardHandler = (event: KeyboardEvent) => boolean | void;

export interface HmsKeyboardPageContext {
  id: string;
  /** Called for document keydowns while this page is active. Return true if handled. */
  onKeydown: HmsKeyboardHandler;
  /** Optional: Escape closes overlays first */
  onEscape?: () => boolean;
}

export interface HmsKeyboardShortcutHint {
  keys: string;
  action: string;
}

/** Standard shortcuts documented for all data-entry screens. */
export const HMS_KEYBOARD_STANDARDS: HmsKeyboardShortcutHint[] = [
  { keys: 'Tab / Shift+Tab', action: 'Next / previous field (catalog skipped — jump to payment)' },
  { keys: 'Enter', action: 'Add from search or confirm focused item' },
  { keys: 'Enter / Space / Alt+↓', action: 'Open focused dropdown (select)' },
  { keys: '↑ ↓', action: 'Lists; step amounts on number fields (Shift=×10)' },
  { keys: 'Enter (on amount)', action: 'Select value for quick overwrite' },
  { keys: 'Escape', action: 'Close overlay / clear search' },
  { keys: 'Ctrl/Cmd+S', action: 'Save (when available)' },
  { keys: 'Ctrl/Cmd+Enter', action: 'Save & Print (when available)' },
  { keys: 'Ctrl/Cmd+F or /', action: 'Focus primary search' },
];

export const isMacPlatform = (): boolean =>
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '');

/** True when Ctrl (Win/Linux) or Cmd (Mac) is held. */
export const isModKey = (event: KeyboardEvent): boolean =>
  isMacPlatform() ? event.metaKey : event.ctrlKey;

export const isEditableTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = ((el as HTMLInputElement).type || 'text').toLowerCase();
    return !['button', 'submit', 'checkbox', 'radio', 'file', 'reset', 'image'].includes(type);
  }
  return false;
};

export const shouldIgnoreKeyboardEvent = (event: KeyboardEvent): boolean => {
  if (event.defaultPrevented) return true;
  if (event.isComposing) return true;
  const el = event.target as HTMLElement | null;
  if (el?.closest?.('[data-hms-keyboard-ignore="true"]')) return true;
  return false;
};

export const selectInputContents = (target: EventTarget | null | undefined): void => {
  const el = target as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el || typeof el.select !== 'function') return;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    el.focus();
    el.select();
  }
};

/**
 * Open a focused native <select> menu. Browsers often ignore Enter on selects;
 * showPicker() (Chrome/Edge/Safari recent) makes Enter/Space keyboard-friendly.
 */
export const openFocusedSelectMenu = (event: KeyboardEvent): boolean => {
  const select = event.target as HTMLSelectElement | null;
  if (!select || select.tagName !== 'SELECT' || select.disabled) {
    return false;
  }

  const key = event.key;
  const shouldOpen =
    key === 'Enter' ||
    key === ' ' ||
    key === 'Spacebar' ||
    (key === 'ArrowDown' && event.altKey);

  if (!shouldOpen) {
    return false;
  }

  const picker = (select as HTMLSelectElement & { showPicker?: () => void }).showPicker;
  if (typeof picker !== 'function') {
    return false;
  }

  try {
    picker.call(select);
    return true;
  } catch {
    // Not allowed without user gesture / unsupported — leave browser default.
    return false;
  }
};

export const isNumberInput = (target: EventTarget | null): target is HTMLInputElement => {
  const el = target as HTMLInputElement | null;
  if (!el || el.tagName !== 'INPUT') return false;
  return (el.type || 'text').toLowerCase() === 'number';
};

/**
 * ↑↓ step focused number inputs (Shift = ×10). Works with Angular ngModel via input event.
 */
export const stepFocusedNumberInput = (event: KeyboardEvent): boolean => {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
    return false;
  }
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return false;
  }
  if (!isNumberInput(event.target)) {
    return false;
  }

  const el = event.target;
  if (el.disabled || el.readOnly) {
    return false;
  }

  const stepAttr = Number(el.step);
  const step = Number.isFinite(stepAttr) && stepAttr > 0 ? stepAttr : 1;
  const delta = (event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? step * 10 : step);
  const min = el.min !== '' && el.min != null ? Number(el.min) : Number.NEGATIVE_INFINITY;
  const max = el.max !== '' && el.max != null ? Number(el.max) : Number.POSITIVE_INFINITY;
  const current = el.value === '' ? 0 : Number(el.value);
  if (Number.isNaN(current)) {
    return false;
  }

  const next = Math.min(max, Math.max(min, current + delta));
  if (next === current) {
    return true;
  }

  el.value = String(next);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
};

/** Enter on a number field selects contents for fast overwrite. */
export const selectFocusedFieldOnEnter = (event: KeyboardEvent): boolean => {
  if (event.key !== 'Enter' || event.ctrlKey || event.metaKey || event.altKey) {
    return false;
  }
  if (!isNumberInput(event.target)) {
    return false;
  }
  selectInputContents(event.target);
  return true;
};
