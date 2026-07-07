import type { AuctionSimProfile } from './types';

let profile: AuctionSimProfile = {
  bestProjectedRosterValueCalls: 0,
  bestProjectedRosterValueCacheHits: 0,
  bestProjectedRosterValueCacheMisses: 0,
  completionSearchCalls: 0,
  completionCandidateCount: 0,
  completionCacheHits: 0,
  completionCacheMisses: 0,
  wtpEvaluations: 0,
};

export function resetAuctionSimProfile(): void {
  profile = {
    bestProjectedRosterValueCalls: 0,
    bestProjectedRosterValueCacheHits: 0,
    bestProjectedRosterValueCacheMisses: 0,
    completionSearchCalls: 0,
    completionCandidateCount: 0,
    completionCacheHits: 0,
    completionCacheMisses: 0,
    wtpEvaluations: 0,
  };
}

export function auctionSimProfileSnapshot(): AuctionSimProfile {
  return { ...profile };
}

export function countBestProjectedRosterValueCall(): void {
  profile.bestProjectedRosterValueCalls += 1;
}

export function countBestProjectedRosterValueCacheHit(): void {
  profile.bestProjectedRosterValueCacheHits += 1;
}

export function countBestProjectedRosterValueCacheMiss(): void {
  profile.bestProjectedRosterValueCacheMisses += 1;
}

export function countCompletionSearchCall(): void {
  profile.completionSearchCalls += 1;
}

export function countCompletionCandidates(count: number): void {
  profile.completionCandidateCount += Math.max(0, count);
}

export function countCompletionCacheHit(): void {
  profile.completionCacheHits += 1;
}

export function countCompletionCacheMiss(): void {
  profile.completionCacheMisses += 1;
}

export function countWtpEvaluation(): void {
  profile.wtpEvaluations += 1;
}
