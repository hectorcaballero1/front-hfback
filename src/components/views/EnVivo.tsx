import { useEffect, useRef, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../api/client';
import type { Consulta, Stats, Veredicto } from '../../types';
import PulseValue from '../ui/PulseValue';
import ToastStack, { type ToastEvent } from '../ui/ToastStack';

interface Props {
  onPollingStatus: (s: 'idle' | 'polling' | 'error') => void;
}

interface ActivityEntry {
  id: string;
  consultaId: string;
  veredicto: Veredicto | null;
  estado: 'resuelto' | 'fallido';
  area: string | null;
  time: Date;
}

function fmt(iso: string) {
  try { return new Date(iso).toLocaleTimeString('es-PE'); }
  catch { return iso; }
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function verdictLabel(e: ActivityEntry) {
  if (e.estado === 'fallido') return 'falló';
  switch (e.veredicto) {
    case 'respondido_rag': return 'RAG';
    case 'enrutado':       return e.area ? `enrutado → ${e.area}` : 'enrutado';
    default:               return 'no aplica';
  }
}

function verdictColor(e: ActivityEntry) {
  if (e.estado === 'fallido') return 'var(--danger)';
  switch (e.veredicto) {
    case 'respondido_rag': return 'var(--accent)';
    case 'enrutado':       return '#60A5FA';
    default:               return 'var(--muted)';
  }
}

// SVG donut — 3 segments stacked via stroke rotation
function VeredictDonut({ rag, enrutado, noAplica }: { rag: number; enrutado: number; noAplica: number }) {
  const total = rag + enrutado + noAplica;
  if (total === 0) return null;

  const R = 26, sw = 9, size = 68, cx = 34, cy = 34;
  const C = 2 * Math.PI * R;

  const segs = [
    { value: rag,      color: '#00D4AA', label: 'RAG' },
    { value: enrutado, color: '#60A5FA', label: 'Enrutado' },
    { value: noAplica, color: '#6B7280', label: 'N/A' },
  ];

  let cumFrac = 0;
  const arcs = segs.map(s => {
    const frac = s.value / total;
    const rotDeg = cumFrac * 360 - 90;
    cumFrac += frac;
    return { ...s, frac, rotDeg };
  });

  return (
    <div className="veredicto-chart">
      <svg width={size} height={size} style={{ flexShrink: 0, transform: 'scaleX(-1)' }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border)" strokeWidth={sw} />
        {arcs.map(a => a.value > 0 && (
          <circle
            key={a.label}
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke={a.color}
            strokeWidth={sw}
            strokeDasharray={`${a.frac * C} ${C}`}
            transform={`rotate(${a.rotDeg}, ${cx}, ${cy})`}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="veredicto-chart__legend">
        {segs.map(s => s.value > 0 && (
          <div key={s.label} className="veredicto-chart__item">
            <div className="veredicto-chart__dot" style={{ background: s.color }} />
            <span>{s.label}</span>
            <span className="mono" style={{ color: s.color, fontWeight: 600 }}>{s.value}</span>
          </div>
        ))}
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
          total {total}
        </div>
      </div>
    </div>
  );
}

export default function EnVivo({ onPollingStatus }: Props) {
  const { activeTenant } = useTenant();
  const [stats, setStats] = useState<Stats | null>(null);
  const [procesando, setProcesando] = useState<Consulta[]>([]);
  const [pendiente, setPendiente] = useState<Consulta[]>([]);
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [toasts, setToasts] = useState<ToastEvent[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  const procRef = useRef<Map<string, Consulta>>(new Map());
  const pendRef = useRef<Map<string, Consulta>>(new Map());
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    procRef.current = new Map();
    pendRef.current = new Map();
    setStats(null);
    setProcesando([]);
    setPendiente([]);
    setChangedIds(new Set());
    setError(null);
    setDone(false);
    setToasts([]);
    setActivity([]);

    let timer: ReturnType<typeof setTimeout>;
    const tenant = activeTenant;

    const poll = async () => {
      try {
        const [newStats, newProc, newPend] = await Promise.all([
          api.getStats(tenant),
          api.getConsultas({ tenantId: tenant, estado: 'procesando', limit: 5 }),
          api.getConsultas({ tenantId: tenant, estado: 'pendiente', limit: 10 }),
        ]);

        if (!activeRef.current) return;

        setError(null);
        onPollingStatus('polling');

        // Detect consultas that left procesando
        const newProcIds = new Set(newProc.items.map(c => c.consultaId));
        const departed = [...procRef.current.keys()].filter(id => !newProcIds.has(id));

        if (departed.length > 0) {
          Promise.all(departed.map(id => api.getConsulta(id, tenant).catch(() => null)))
            .then(results => {
              if (!activeRef.current) return;
              results.forEach(c => {
                if (!c) return;
                const event: ToastEvent & ActivityEntry = {
                  id: crypto.randomUUID(),
                  consultaId: c.consultaId,
                  veredicto: c.veredicto,
                  estado: c.estado as 'resuelto' | 'fallido',
                  area: c.area,
                  time: new Date(),
                };
                setToasts(prev => [...prev, event]);
                setActivity(prev => [event, ...prev].slice(0, 15));
              });
            });
        }

        // Detect changed items for pulse
        const changed = new Set<string>();
        for (const c of newProc.items) {
          const prev = procRef.current.get(c.consultaId);
          if (!prev || prev.updatedAt !== c.updatedAt) changed.add(c.consultaId);
        }
        for (const c of newPend.items) {
          const prev = pendRef.current.get(c.consultaId);
          if (!prev || prev.updatedAt !== c.updatedAt) changed.add(c.consultaId);
        }

        procRef.current = new Map(newProc.items.map(c => [c.consultaId, c]));
        pendRef.current = new Map(newPend.items.map(c => [c.consultaId, c]));

        setStats(newStats);
        setProcesando(newProc.items);
        setPendiente(newPend.items);

        if (changed.size > 0) {
          setChangedIds(changed);
          setTimeout(() => { if (activeRef.current) setChangedIds(new Set()); }, 400);
        }

        const isDone = newStats.estados.pendiente + newStats.estados.procesando === 0;
        if (isDone) {
          setDone(true);
          onPollingStatus('idle');
        } else {
          setDone(false);
          timer = setTimeout(poll, 1500);
        }
      } catch (e) {
        if (!activeRef.current) return;
        setError(e instanceof Error ? e.message : 'Error de red');
        onPollingStatus('error');
        timer = setTimeout(poll, 3000);
      }
    };

    poll();

    return () => {
      activeRef.current = false;
      clearTimeout(timer);
      onPollingStatus('idle');
    };
  }, [activeTenant]);

  const estados = stats?.estados ?? { pendiente: 0, procesando: 0, resuelto: 0, fallido: 0 };
  const total = stats?.total ?? 0;
  const resueltosPct = total > 0 ? (estados.resuelto / total) * 100 : 0;
  const veredictos = stats?.veredictos ?? { respondido_rag: 0, enrutado: 0, no_aplica: 0 };

  return (
    <div>
      <ToastStack events={toasts} onRemove={id => setToasts(p => p.filter(t => t.id !== id))} />

      <h1 className="page-title">En vivo</h1>

      {error && (
        <div className="error-banner" role="alert">
          {error} · reintentando...
        </div>
      )}

      {done && !error && (
        <div
          style={{
            background: 'var(--accent-dim)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius)',
            padding: '10px 14px',
            color: 'var(--accent)',
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          Cola drenada · {estados.resuelto} consultas resueltas
        </div>
      )}

      {/* Contadores */}
      <div className="counters-grid">
        <div className="counter-card counter-card--pendiente">
          <div className="counter-card__label">Pendiente</div>
          <div className="counter-card__value"><PulseValue value={estados.pendiente} /></div>
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: total > 0 ? `${(estados.pendiente / total) * 100}%` : '0%', background: '#FBBF24' }} />
          </div>
        </div>
        <div className="counter-card counter-card--procesando">
          <div className="counter-card__label">Procesando</div>
          <div className="counter-card__value"><PulseValue value={estados.procesando} /></div>
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: total > 0 ? `${(estados.procesando / total) * 100}%` : '0%', background: 'var(--accent)' }} />
          </div>
        </div>
        <div className="counter-card counter-card--resuelto">
          <div className="counter-card__label">Resuelto</div>
          <div className="counter-card__value"><PulseValue value={estados.resuelto} /></div>
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${resueltosPct}%`, background: '#60A5FA' }} />
          </div>
        </div>
        <div className="counter-card counter-card--fallido">
          <div className="counter-card__label">Fallido</div>
          <div className="counter-card__value"><PulseValue value={estados.fallido} /></div>
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: total > 0 ? `${(estados.fallido / total) * 100}%` : '0%', background: 'var(--danger)' }} />
          </div>
        </div>
      </div>

      {/* Veredictos: dona + chips */}
      {stats && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
          <VeredictDonut
            rag={veredictos.respondido_rag}
            enrutado={veredictos.enrutado}
            noAplica={veredictos.no_aplica}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="chip chip--rag">RAG <PulseValue value={veredictos.respondido_rag} /></span>
            <span className="chip chip--enrutado">Enrutado <PulseValue value={veredictos.enrutado} /></span>
            <span className="chip chip--no_aplica">No aplica <PulseValue value={veredictos.no_aplica} /></span>
          </div>
        </div>
      )}

      {/* EN PROCESO */}
      <div className="processing-section">
        <div className="section-title">En proceso</div>
        {procesando.length === 0 ? (
          <div className="card" style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '24px' }}>
            {done ? 'Cola vacía.' : 'Esperando consultas...'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {procesando.map(c => (
              <div key={c.consultaId} className={`processing-card ${changedIds.has(c.consultaId) ? 'row--pulse' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="processing-card__id">{c.consultaId}</span>
                  <span className="analyzing-badge">ANALIZANDO</span>
                </div>
                <p className="processing-card__text">{c.texto}</p>
                <div className="processing-card__meta">{c.remitente} · {fmt(c.timestamp)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EN COLA */}
      <div>
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>En cola</span>
          {estados.pendiente > 10 && (
            <span style={{ color: 'var(--muted)', fontWeight: 400 }}>+{estados.pendiente - 10} más</span>
          )}
        </div>
        {pendiente.length === 0 ? (
          <div className="card" style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '24px' }}>
            {done ? 'Sin consultas pendientes.' : 'Cola vacía.'}
          </div>
        ) : (
          <div className="queue-list">
            {pendiente.map((c, i) => (
              <div key={c.consultaId} className={`queue-item ${changedIds.has(c.consultaId) ? 'row--pulse' : ''}`}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', width: 20, flexShrink: 0 }}>{i + 1}</span>
                <span className="queue-item__id">{c.consultaId}</span>
                <span className="queue-item__text">{c.texto}</span>
                <span className="queue-item__remitente">{c.remitente}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Worker info */}
      <div className="worker-info">
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: done ? 'var(--muted)' : 'var(--accent)', display: 'inline-block', flexShrink: 0 }} />
        <span className="mono" style={{ fontSize: 11 }}>1 worker activo · escalable a N</span>
        {total > 0 && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>total: {total}</span>}
      </div>

      {/* Feed de actividad */}
      {activity.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div className="section-title">Actividad reciente</div>
          <div className="activity-feed">
            {activity.map(e => (
              <div key={e.id} className="activity-entry">
                <span className="activity-entry__id">{e.consultaId}</span>
                <span className="activity-entry__verdict" style={{ color: verdictColor(e) }}>
                  {verdictLabel(e)}
                </span>
                <span className="activity-entry__time">{fmtTime(e.time)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
