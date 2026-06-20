import { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';

type PollingStatus = 'idle' | 'polling' | 'error';

interface Props {
  pollingStatus: PollingStatus;
}

export default function Header({ pollingStatus }: Props) {
  const { tenants, activeTenant, setActiveTenant } = useTenant();
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('es-PE'));

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('es-PE')), 1000);
    return () => clearInterval(t);
  }, []);

  const dotTitle =
    pollingStatus === 'polling' ? 'Polling activo' :
    pollingStatus === 'error'   ? 'Error de conexión' :
    'Inactivo';

  return (
    <header className="layout__header">
      <span className="header-title">TRIAGE · CONSOLA</span>

      <label htmlFor="tenant-select" className="sr-only">Tenant activo</label>
      <select
        id="tenant-select"
        className="tenant-select"
        value={activeTenant}
        onChange={e => setActiveTenant(e.target.value)}
      >
        {tenants.map(t => (
          <option key={t.tenantId} value={t.tenantId}>{t.nombre}</option>
        ))}
      </select>

      <span className="header-clock" aria-live="off">{time}</span>

      <div
        className={`polling-dot ${pollingStatus === 'polling' ? 'active' : pollingStatus === 'error' ? 'error' : ''}`}
        title={dotTitle}
        aria-label={dotTitle}
      />
    </header>
  );
}
