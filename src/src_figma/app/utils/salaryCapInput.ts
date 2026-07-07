import { LEAGUE_MINIMUM_SALARY } from "../../../data/rosterEngineConstants";
import { LEGAL_ROSTER } from "../../../data/rosterConstruction";

export const SALARY_CAP_FLOOR = Math.ceil(LEGAL_ROSTER.size * LEAGUE_MINIMUM_SALARY);

export function formatSalaryCapMoney(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

export function formatSalaryCapInput(value: number): string {
  return Math.round(value).toLocaleString();
}

export function parseSalaryCapInput(value: string): number | null {
  const normalized = value.replace(/,/g, "").trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function salaryCapHardError(parsedSalaryCap: number | null): string | null {
  if (parsedSalaryCap === null) return "ENTER A WHOLE-DOLLAR SALARY CAP.";
  if (parsedSalaryCap <= 0) return "SALARY CAP MUST BE GREATER THAN ZERO.";
  if (parsedSalaryCap < SALARY_CAP_FLOOR) {
    return `SALARY CAP MUST BE AT LEAST ${formatSalaryCapMoney(SALARY_CAP_FLOOR)}`;
  }
  return null;
}

export function salaryCapAdvisory(parsedSalaryCap: number | null, tierReference: number): string | null {
  if (salaryCapHardError(parsedSalaryCap) || parsedSalaryCap === null) return null;
  if (parsedSalaryCap < tierReference * 0.5) return "Very tight for this tier.";
  if (parsedSalaryCap > tierReference * 2) return "Rarely binding for this tier.";
  return null;
}

