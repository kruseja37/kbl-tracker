import { createContext, useContext } from "react";

import type { UseFranchiseDataReturn } from "@/hooks/useFranchiseData";

export const FranchiseDataContext = createContext<UseFranchiseDataReturn | null>(null);

export function useFranchiseDataContext(): UseFranchiseDataReturn {
  const context = useContext(FranchiseDataContext);
  if (!context) {
    throw new Error("useFranchiseDataContext must be used within FranchiseDataProvider");
  }
  return context;
}
