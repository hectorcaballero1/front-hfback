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
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--accent)',
          fontWeight: 500,
          letterSpacing: '0.05em',
          marginBottom: 12,
          userSelect: 'none',
        }}
      >
        H//
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

      <span className="sidebar-logo">HACK//UTEC</span>
    </aside>
  );
}
