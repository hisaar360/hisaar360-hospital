/**
 * Merge specialtyData for save without dropping legacy unknown keys/objects.
 */
export function mergeSpecialtyDataForSave(
  formValues: Record<string, unknown>,
  preserved: Record<string, unknown>
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...preserved };

  Object.entries(formValues || {}).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        payload[key] = trimmed;
      } else {
        // Explicit empty string means "clear documented form field" only when key is known on form.
        // Do not delete preserved legacy keys that are absent from formValues.
        delete payload[key];
      }
      return;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      payload[key] = value;
      return;
    }

    // Objects/arrays from form are unexpected; keep preserved value if any.
    if (!(key in payload)) {
      payload[key] = value;
    }
  });

  return payload;
}

export function splitPreservedSpecialtyData(
  data: Record<string, unknown> | null | undefined,
  formControlKeys: Set<string>
): { formPatch: Record<string, unknown>; preserved: Record<string, unknown> } {
  const formPatch: Record<string, unknown> = {};
  const preserved: Record<string, unknown> = {};

  Object.entries(data || {}).forEach(([key, value]) => {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      preserved[key] = value;
      return;
    }
    if (Array.isArray(value)) {
      preserved[key] = value;
      return;
    }
    if (formControlKeys.has(key)) {
      formPatch[key] = value ?? '';
      return;
    }
    // Scalar unknown legacy key — keep as preserved so it survives even if not on FormGroup
    preserved[key] = value;
  });

  return { formPatch, preserved };
}
