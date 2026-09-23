/** Round to 2 decimal places to avoid floating-point drift in ledger math. */
export const roundMoney = (value: number): number =>
    Math.round((value + Number.EPSILON) * 100) / 100;

/** True when a monetary remainder is effectively zero after rounding. */
export const isMoneyZero = (value: number): boolean =>
    Math.abs(roundMoney(value)) < 0.005;

/** Minimum of two monetary amounts, rounded. */
export const minMoney = (a: number, b: number): number =>
    roundMoney(Math.min(a, b));
