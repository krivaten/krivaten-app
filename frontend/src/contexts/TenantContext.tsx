import { createContext, useContext } from "react";
import { useTenant } from "@/hooks/useTenant";
import { State } from "@/lib/state";
import { TenantOnboarding } from "@/components/TenantOnboarding";
import type { Tenant } from "@/types/tenant";

interface TenantContextValue {
  tenant: Tenant;
  updateTenant: (updates: { name?: string; settings?: Record<string, unknown> }) => Promise<Tenant>;
  refetch: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { tenant, state, error, createTenant, updateTenant, refetch } = useTenant();

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

  if (state === State.NONE || !tenant) {
    return <TenantOnboarding onCreated={refetch} createTenant={createTenant} />;
  }

  return (
    <TenantContext.Provider value={{ tenant, updateTenant, refetch }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext() {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenantContext must be used within a TenantProvider");
  }
  return ctx;
}
