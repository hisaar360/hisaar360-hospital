/**
 * WhatsApp helpers for receipt/token image share (same approach as hisaar-marque).
 *
 * Mobile: native Web Share with PNG file.
 * Desktop: copy PNG to clipboard → open chat (no text=) → user pastes image.
 */

export const normalizeWhatsAppPhone = (raw: string | null | undefined): string | null => {
  if (!raw) {
    return null;
  }
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) {
    return null;
  }
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    digits = `92${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits.startsWith('3')) {
    digits = `92${digits}`;
  }
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }
  return digits;
};

export const isMobileOrTabletDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua)) {
    return true;
  }

  const touchPoints = Number(navigator.maxTouchPoints || 0);
  const platform = String(navigator.platform || '');
  if (touchPoints > 1 && /Mac/i.test(platform)) {
    return true;
  }

  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches === true;
  const narrow = window.matchMedia?.('(max-width: 1024px)')?.matches === true;
  return coarse && narrow && touchPoints > 0;
};

export const isMacDesktop = (): boolean => {
  if (typeof navigator === 'undefined' || isMobileOrTabletDevice()) {
    return false;
  }
  const platform = String(navigator.platform || '');
  const ua = String(navigator.userAgent || '');
  return /Mac|Macintosh/i.test(platform) || /Mac OS X/i.test(ua);
};

/**
 * Customer chat only — NEVER add ?text=
 * Prefill text makes WhatsApp prioritize text instead of pasting the receipt image.
 */
export const buildWhatsAppChatUrl = (phone: string | null | undefined): string => {
  const normalized = normalizeWhatsAppPhone(phone);
  if (normalized) {
    return `https://web.whatsapp.com/send?phone=${normalized}`;
  }
  return 'https://web.whatsapp.com/';
};

export const pasteShortcutLabel = (): string => (isMacDesktop() ? '⌘V' : 'Ctrl+V');

export const buildDesktopPasteHint = (documentLabel = 'Receipt'): string => {
  const label = String(documentLabel || 'Receipt').trim() || 'Receipt';
  return `${label} image copied. Press ${pasteShortcutLabel()} in WhatsApp to paste the image.`;
};

export const buildDesktopDownloadHint = (documentLabel = 'Receipt'): string => {
  const label = String(documentLabel || 'Receipt').trim() || 'Document';
  return `${label} image downloaded. Attach the image file in WhatsApp.`;
};
