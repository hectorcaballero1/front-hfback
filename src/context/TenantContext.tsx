import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../api/client';
import type { Tenant } from '../types';

interface TenantCtx {
  tenants: Tenant[];
  activeTenant: string;
  setActiveTenant: (id: string) => void;
}

const Ctx = createContext<TenantCtx>({
  tenants: [],
  activeTenant: 'utec',
  setActiveTenant: () => {},
});

const FALLBACK_TENANTS: Tenant[] = [
  { tenantId: 'utec', nombre: 'UTEC' },
  { tenantId: 'banco', nombre: 'Banco Nacional' },
];

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<Tenant[]>(FALLBACK_TENANTS);
  const [activeTenant, setActiveTenant] = useState('utec');

  useEffect(() => {
    api.getTenants()
      .then(list => {
        if (list.length > 0) {
          setTenants(list);
          if (!list.find(t => t.tenantId === activeTenant)) {
            setActiveTenant(list[0].tenantId);
          }
        }
      })
      .catch(() => {
        /* silently use fallback */
      });
  }, []);

  return (
    <Ctx.Provider value={{ tenants, activeTenant, setActiveTenant }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTenant = () => useContext(Ctx);
