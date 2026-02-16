import { createContext, useContext } from "react";
import { useHousehold } from "@/hooks/useHousehold";
import { State } from "@/lib/state";
import { HouseholdOnboarding } from "@/components/HouseholdOnboarding";
import type { Household } from "@/types/household";

interface HouseholdContextValue {
  household: Household;
  refetch: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { household, state, error, createHousehold, refetch } = useHousehold();

  if (state === State.INITIAL || state === State.PENDING) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (state === State.ERROR) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  if (state === State.NONE || !household) {
    return <HouseholdOnboarding onCreated={refetch} createHousehold={createHousehold} />;
  }

  return (
    <HouseholdContext.Provider value={{ household, refetch }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHouseholdContext() {
  const ctx = useContext(HouseholdContext);
  if (!ctx) {
    throw new Error("useHouseholdContext must be used within a HouseholdProvider");
  }
  return ctx;
}
