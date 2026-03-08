'use client';

import { createContext, useCallback, useContext, useState } from 'react';

export const CAMPUS_OPTIONS = [
  { value: 'delhi', label: 'Delhi Campus' },
  { value: 'mumbai', label: 'Mumbai Campus' },
  { value: 'bangalore', label: 'Bangalore Campus' },
] as const;

export type TenantId = (typeof CAMPUS_OPTIONS)[number]['value'];

type CampusContextType = {
  tenantId: TenantId;
  setTenantId: (id: TenantId) => void;
};

const CampusContext = createContext<CampusContextType | null>(null);

export function CampusProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenantIdState] = useState<TenantId>('delhi');
  const setTenantId = useCallback((id: TenantId) => {
    setTenantIdState(id);
  }, []);

  return (
    <CampusContext.Provider value={{ tenantId, setTenantId }}>
      {children}
    </CampusContext.Provider>
  );
}

export function useCampus() {
  const ctx = useContext(CampusContext);
  if (!ctx) throw new Error('useCampus must be used within CampusProvider');
  return ctx;
}
