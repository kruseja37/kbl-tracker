/** Shared sub-cent tolerance for nonlinear tax arithmetic and every Snake affordability gate. */
export const SNAKE_MONEY_EPSILON = 1e-6;

export function snakeMoneyNonnegative(value: number): boolean {
  return value >= -SNAKE_MONEY_EPSILON;
}

export function snakeMoneyAffordable(allInCost: number, budgetRemaining: number): boolean {
  return snakeMoneyNonnegative(budgetRemaining - allInCost);
}

export function snakeMoneyOverage(allInCost: number, budgetRemaining: number): number {
  return snakeMoneyAffordable(allInCost, budgetRemaining)
    ? 0
    : Math.max(0, allInCost - budgetRemaining);
}

/** Canonicalize harmless sub-cent residue without hiding a real over-budget pick. */
export function snakeMoneyRemaining(budgetRemaining: number, allInCost: number): number {
  const remaining = budgetRemaining - allInCost;
  return snakeMoneyNonnegative(remaining) ? Math.max(0, remaining) : remaining;
}
