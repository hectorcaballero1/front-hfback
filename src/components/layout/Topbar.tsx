import { useEffect, useState } from 'react';
import { Upload, Database, BookOpen } from 'lucide-react';
import type { View } from '../../types';
import { useTenant } from '../../context/TenantContext';
import { useIngesta } from '../../context/IngestaContext';

const NAV: { id: View; icon: typeof Upload; label: string }[] = [
  { id: 'ingesta',   icon: Upload,   label: 'Ingesta' },
  { id: 'consultas', icon: Database, label: 'Consultas' },
  { id: 'corpus',    icon: BookOpen, label: 'Corpus RAG' },
];

interface Props {
  view: View;
  setView: (v: View) => void;
}

export default function Topbar({ view, setView }: Props) {
  const { tenants, activeTenant, setActiveTenant } = useTenant();
  const { pollingStatus } = useIngesta();
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
    <header className="topbar">
      <div className="topbar__brand">
        <img
          src="/logo.png"
          alt="High Flying Birds"
          className="topbar__logo-img"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <span className="topbar__brand-text">HIGH FLYING BIRDS</span>
      </div>

      <nav className="topbar__nav" aria-label="Navegación principal">
        {NAV.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`topnav-btn ${view === id ? 'active' : ''}`}
            onClick={() => setView(id)}
            aria-current={view === id ? 'page' : undefined}
          >
            <Icon size={15} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="topbar__right">
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
      </div>
    </header>
  );
}
