import { environment } from '../../../environments/environment';

/** Resolve relative media paths (/uploads, /api) to the API origin. */
export const resolveAssetUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('/uploads/') || url.startsWith('/api/')) {
    const serverOrigin = environment.apiBaseUrl.replace(/\/api\/v1\/?$/, '');
    return `${serverOrigin}${url}`;
  }
  return url;
};

export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export const initialsFromName = (name?: string | null): string => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) {
    return '?';
  }
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

export const validateProfilePhotoFile = (file: File | null | undefined): string | null => {
  if (!file) {
    return 'Please choose a PNG, JPEG, or WEBP image.';
  }

  const ext = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
  const typeOk = ALLOWED_TYPES.has(file.type);
  const extOk = ALLOWED_EXTENSIONS.includes(ext);
  if (!typeOk && !extOk) {
    return 'Only JPG, JPEG, PNG, and WEBP images are allowed.';
  }

  if (file.size > PROFILE_PHOTO_MAX_BYTES) {
    return 'Image must be 5 MB or smaller.';
  }

  return null;
};
