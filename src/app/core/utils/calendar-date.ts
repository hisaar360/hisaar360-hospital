const YMD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export const toCalendarYmd = (value?: string | Date | null): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const isUtcMidnight =
      value.getUTCHours() === 0 &&
      value.getUTCMinutes() === 0 &&
      value.getUTCSeconds() === 0 &&
      value.getUTCMilliseconds() === 0;
    if (isUtcMidnight) {
      return [
        value.getUTCFullYear(),
        String(value.getUTCMonth() + 1).padStart(2, '0'),
        String(value.getUTCDate()).padStart(2, '0'),
      ].join('-');
    }

    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0'),
    ].join('-');
  }

  const raw = String(value || '').trim();
  const match = raw.match(YMD_PATTERN);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  if (!raw) {
    return '';
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return toCalendarYmd(parsed);
};

export const todayYmd = (): string => toCalendarYmd(new Date());
