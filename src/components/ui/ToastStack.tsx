import { useEffect, useState } from 'react';
import { Check, ArrowRight, Minus, AlertTriangle } from 'lucide-react';
import type { Veredicto } from '../../types';

export interface ToastEvent {
  id: string;
  consultaId: string;
  veredicto: Veredicto | null;
  estado: 'resuelto' | 'fallido';
  area: string | null;
}

function toastMeta(e: ToastEvent): { color: string; bg: string; border: string; icon: React.ReactNode; label: string } {
  if (e.estado === 'fallido') {
    return {
      color: 'var(--danger)',
      bg: '#FF4D6D0F',
      border: '#FF4D6D40',
      icon: <AlertTriangle size={13} />,
      label: `${e.consultaId} falló`,
    };
  }
  switch (e.veredicto) {
    case 'respondido_rag':
      return {
        color: 'var(--accent)',
        bg: 'var(--accent-dim)',
        border: '#00D4AA40',
        icon: <Check size={13} />,
        label: `${e.consultaId} → respondido por RAG`,
      };
    case 'enrutado':
      return {
        color: '#2563EB',
        bg: '#EFF6FF',
        border: '#BFDBFE',
        icon: <ArrowRight size={13} />,
        label: e.area ? `${e.consultaId} → enrutado a ${e.area}` : `${e.consultaId} → enrutado`,
      };
    default:
      return {
        color: 'var(--muted)',
        bg: '#6B72800F',
        border: '#6B728040',
        icon: <Minus size={13} />,
        label: `${e.consultaId} → no aplica`,
      };
  }
}

function ToastItem({ event, onRemove }: { event: ToastEvent; onRemove: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const meta = toastMeta(event);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 3600);
    const t2 = setTimeout(onRemove, 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      className={`toast-item${leaving ? ' toast-item--leaving' : ''}`}
      style={{ background: meta.bg, borderColor: meta.border, color: meta.color }}
    >
      <span className="toast-item__icon">{meta.icon}</span>
      <span className="toast-item__label">{meta.label}</span>
    </div>
  );
}

export default function ToastStack({
  events,
  onRemove,
}: {
  events: ToastEvent[];
  onRemove: (id: string) => void;
}) {
  if (events.length === 0) return null;
  return (
    <div className="toast-stack">
      {events.map(e => (
        <ToastItem key={e.id} event={e} onRemove={() => onRemove(e.id)} />
      ))}
    </div>
  );
}
