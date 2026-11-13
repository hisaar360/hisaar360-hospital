/** Paisa / 2-decimal money helpers for pharmacy returns and POS. */

const MONEY_EPSILON = 0.005;

export const roundMoney = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  const rounded = Math.round((numeric + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
};

/** Round each line amount then the sum (avoids float drift on multi-line returns). */
export const sumMoney = (values: Iterable<unknown>): number => {
  let total = 0;
  for (const value of values) {
    total = roundMoney(total + roundMoney(value));
  }
  return total;
};

export const moneyLte = (a: unknown, b: unknown): boolean =>
  roundMoney(a) <= roundMoney(b) + MONEY_EPSILON;

export const moneyGte = (a: unknown, b: unknown): boolean =>
  roundMoney(a) + MONEY_EPSILON >= roundMoney(b);

export const moneyEq = (a: unknown, b: unknown): boolean =>
  Math.abs(roundMoney(a) - roundMoney(b)) < MONEY_EPSILON;

export const clampMoney = (value: unknown, min: unknown, max: unknown): number =>
  roundMoney(Math.min(Math.max(roundMoney(value), roundMoney(min)), roundMoney(max)));
