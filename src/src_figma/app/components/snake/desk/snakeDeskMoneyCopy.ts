import { snakeMoneyNonnegative } from '../../../../../engines/snakeMoney';

export function snakeBoardOverBudgetReason(planCushion: number | null): string | null {
  if (planCushion === null || !Number.isFinite(planCushion) || snakeMoneyNonnegative(planCushion)) return null;
  return `YOUR 22-MAN BOARD IS $${Math.abs(Math.round(planCushion)).toLocaleString()} OVER BUDGET.`;
}
