import { HospitalNotificationItem } from './hospital-notification.service';

export interface NotificationDayGroup {
  key: string;
  label: string;
  items: HospitalNotificationItem[];
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseCreatedAt(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Facebook-style day label relative to `now`. */
export function notificationDayLabel(createdAt: string | null | undefined, now = new Date()): string {
  const date = parseCreatedAt(createdAt);
  if (!date) {
    return 'Earlier';
  }

  const today = startOfLocalDay(now);
  const target = startOfLocalDay(date);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);

  if (diffDays === 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }

  const sameYear = target.getFullYear() === today.getFullYear();
  return target.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/**
 * Group notifications newest-first into day buckets:
 * Today → Yesterday → weekday/date headings.
 */
export function groupNotificationsByDay(
  items: HospitalNotificationItem[],
  now = new Date()
): NotificationDayGroup[] {
  const groups = new Map<string, NotificationDayGroup>();

  for (const item of items) {
    const date = parseCreatedAt(item.createdAt) || now;
    const key = dayKey(startOfLocalDay(date));
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    groups.set(key, {
      key,
      label: notificationDayLabel(item.createdAt, now),
      items: [item],
    });
  }

  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
}
