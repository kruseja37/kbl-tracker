export interface FranchiseManualSmokeFixtureEnvironment {
  dev?: boolean;
  mode?: string;
}

export const FRANCHISE_MANUAL_SMOKE_SETUP_ROUTE = '/__preview/franchise-v1-manual-smoke-setup';

export function isFranchiseManualSmokeFixtureEnabled(
  environment: FranchiseManualSmokeFixtureEnvironment = {
    dev: import.meta.env.DEV,
    mode: import.meta.env.MODE,
  },
): boolean {
  return environment.dev === true || environment.mode === 'test';
}

export function getFranchiseManualSmokeSetupRoute(
  environment?: FranchiseManualSmokeFixtureEnvironment,
): string | null {
  return isFranchiseManualSmokeFixtureEnabled(environment)
    ? FRANCHISE_MANUAL_SMOKE_SETUP_ROUTE
    : null;
}
