import { Activity, CheckSquare, Inbox, BookOpen } from 'lucide-react';
import type { View } from '../../types';

const NAV: { id: View; icon: typeof Activity; label: string }[] = [
  { id: 'envivo',     icon: Activity,    label: 'Dashboard' },
  { id: 'bandeja',   icon: Inbox,       label: 'Bandeja' },
  { id: 'corpus',    icon: BookOpen,    label: 'Corpus RAG' },
  { id: 'procesados', icon: CheckSquare, label: 'Procesados' },
];

interface Props {
  view: View;
  setView: (v: View) => void;
}

export default function Sidebar({ view, setView }: Props) {
  return (
    <aside className="layout__sidebar">
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 700,
          color: 'white',
          letterSpacing: '0.02em',
          marginBottom: 12,
          userSelect: 'none',
          flexShrink: 0,
          overflow: 'hidden',
          position: 'relative',
        }}
        aria-label="High Flying Birds"
      >
        <img
          src="/birds/logo.png"
          alt=""
          style={{ position: 'absolute', inset: 2, width: 'calc(100% - 4px)', height: 'calc(100% - 4px)', objectFit: 'contain', imageRendering: 'pixelated' }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <span style={{ position: 'relative' }}>HFB</span>
      </div>

      {NAV.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          className={`nav-btn ${view === id ? 'active' : ''}`}
          onClick={() => setView(id)}
          aria-label={label}
          aria-current={view === id ? 'page' : undefined}
        >
          <Icon size={18} />
          <span className="tooltip">{label}</span>
        </button>
      ))}

      <span className="sidebar-logo">High Flying Birds</span>
    </aside>
  );
}
