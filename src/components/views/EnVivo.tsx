import { useEffect, useRef, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../api/client';
import type { Consulta, Stats, Veredicto } from '../../types';
import PulseValue from '../ui/PulseValue';

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
  texto: string;
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function verdictColor(e: ActivityEntry) {
  if (e.estado === 'fallido') return 'var(--danger)';
  switch (e.veredicto) {
    case 'respondido_rag': return 'var(--accent)';
    case 'enrutado':       return 'var(--blue)';
    default:               return 'var(--muted)';
  }
}

function verdictLabel(e: ActivityEntry) {
  if (e.estado === 'fallido') return 'falló';
  switch (e.veredicto) {
    case 'respondido_rag': return 'RAG';
    case 'enrutado':       return e.area ? `enrutado → ${e.area}` : 'enrutado';
    default:               return 'no aplica';
  }
}

// SVG donut chart
function VeredictDonut({ rag, enrutado, noAplica }: { rag: number; enrutado: number; noAplica: number }) {
  const total = rag + enrutado + noAplica;
  if (total === 0) return null;

  const R = 26, sw = 9, size = 68, cx = 34, cy = 34;
  const C = 2 * Math.PI * R;

  const segs = [
    { value: rag,      color: '#0D9488', label: 'RAG' },
    { value: enrutado, color: '#2563EB', label: 'Enrutado' },
    { value: noAplica, color: '#94A3B8', label: 'N/A' },
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
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>total {total}</div>
      </div>
    </div>
  );
}

// Stat card for throughput / rate metrics
function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, lineHeight: 1, color: color ?? 'var(--text)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function EnVivo({ onPollingStatus }: Props) {
  const { activeTenant } = useTenant();
  const [stats, setStats] = useState<Stats | null>(null);
  const [, setChangedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  const procRef = useRef<Map<string, Consulta>>(new Map());
  const startTimeRef = useRef<Date>(new Date());

  useEffect(() => {
    let active = true;
    procRef.current = new Map();
    startTimeRef.current = new Date();
    setStats(null);
    setChangedIds(new Set());
    setError(null);
    setActivity([]);

    let timer: ReturnType<typeof setTimeout>;
    const tenant = activeTenant;

    const poll = async () => {
      try {
        const [newStats, newProc] = await Promise.all([
          api.getStats(tenant),
          api.getConsultas({ tenantId: tenant, estado: 'procesando', limit: 10 }),
        ]);
        if (!active) return;

        setError(null);
        onPollingStatus('polling');

        // Departed → add to activity feed
        const newProcIds = new Set(newProc.items.map(c => c.consultaId));
        const departed = [...procRef.current.keys()].filter(id => !newProcIds.has(id));

        if (departed.length > 0) {
          Promise.all(departed.map(id => api.getConsulta(id, tenant).catch(() => null)))
            .then(results => {
              if (!active) return;
              results.forEach(c => {
                if (!c) return;
                setActivity(prev => [{
                  id: crypto.randomUUID(),
                  consultaId: c.consultaId,
                  veredicto: c.veredicto,
                  estado: c.estado as 'resuelto' | 'fallido',
                  area: c.area,
                  time: new Date(),
                  texto: c.texto,
                }, ...prev].slice(0, 20));
              });
            });
        }

        // Pulse
        const changed = new Set<string>();
        for (const c of newProc.items) {
          const prev = procRef.current.get(c.consultaId);
          if (!prev || prev.updatedAt !== c.updatedAt) changed.add(c.consultaId);
        }
        procRef.current = new Map(newProc.items.map(c => [c.consultaId, c]));

        setStats(newStats);
        if (changed.size > 0) {
          setChangedIds(changed);
          setTimeout(() => { if (active) setChangedIds(new Set()); }, 400);
        }

        const isDone = newStats.estados.pendiente + newStats.estados.procesando === 0;
        onPollingStatus(isDone ? 'idle' : 'polling');
        timer = setTimeout(poll, 1500);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Error de red');
        onPollingStatus('error');
        timer = setTimeout(poll, 3000);
      }
    };

    poll();
    return () => {
      active = false;
      clearTimeout(timer);
      onPollingStatus('idle');
    };
  }, [activeTenant]);

  const estados = stats?.estados ?? { pendiente: 0, procesando: 0, resuelto: 0, fallido: 0 };
  const total = stats?.total ?? 0;
  const veredictos = stats?.veredictos ?? { respondido_rag: 0, enrutado: 0, no_aplica: 0 };
  const resueltosPct = total > 0 ? Math.round((estados.resuelto / total) * 100) : 0;
  const ragPct = veredictos.respondido_rag + veredictos.enrutado + veredictos.no_aplica > 0
    ? Math.round((veredictos.respondido_rag / (veredictos.respondido_rag + veredictos.enrutado + veredictos.no_aplica)) * 100)
    : 0;

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      {error && (
        <div className="error-banner" role="alert">{error} · reintentando...</div>
      )}

      {/* ── Counter cards ─────────────────────────────────────────────── */}
      <div className="counters-grid" style={{ marginBottom: 24 }}>
        <div className="counter-card counter-card--pendiente">
          <div className="counter-card__label">Pendiente</div>
          <div className="counter-card__value"><PulseValue value={estados.pendiente} /></div>
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: total > 0 ? `${(estados.pendiente / total) * 100}%` : '0%', background: '#D97706' }} />
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
            <div className="progress-bar__fill" style={{ width: `${(estados.resuelto / (total || 1)) * 100}%`, background: 'var(--blue)' }} />
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

      {/* ── Métricas + Donut ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 28, alignItems: 'start' }}>
        <MetricCard
          label="Tasa de resolución"
          value={`${resueltosPct}%`}
          sub={`${estados.resuelto} de ${total} consultas`}
          color={resueltosPct >= 80 ? 'var(--accent)' : resueltosPct >= 50 ? 'var(--blue)' : 'var(--warning)'}
        />
        <MetricCard
          label="Resuelto por RAG"
          value={`${ragPct}%`}
          sub={`${veredictos.respondido_rag} respuestas autónomas`}
          color="var(--accent)"
        />
        {(veredictos.respondido_rag + veredictos.enrutado + veredictos.no_aplica > 0) && (
          <VeredictDonut
            rag={veredictos.respondido_rag}
            enrutado={veredictos.enrutado}
            noAplica={veredictos.no_aplica}
          />
        )}
      </div>

      {/* ── Chips de veredictos ───────────────────────────────────────── */}
      {(veredictos.respondido_rag + veredictos.enrutado + veredictos.no_aplica > 0) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
          <span className="chip chip--rag">RAG <PulseValue value={veredictos.respondido_rag} /></span>
          <span className="chip chip--enrutado">Enrutado <PulseValue value={veredictos.enrutado} /></span>
          <span className="chip chip--no_aplica">No aplica <PulseValue value={veredictos.no_aplica} /></span>
          {estados.fallido > 0 && (
            <span className="chip chip--fallido">Fallido <PulseValue value={estados.fallido} /></span>
          )}
        </div>
      )}

      {/* ── Feed de actividad reciente ────────────────────────────────── */}
      {activity.length > 0 && (
        <div>
          <div className="section-title">Actividad reciente</div>
          <div className="activity-feed">
            {activity.map(e => (
              <div key={e.id} className="activity-entry">
                <span
                  className="activity-entry__id"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}
                >
                  {e.consultaId}
                </span>
                <span
                  className="activity-entry__verdict"
                  style={{ color: verdictColor(e), fontSize: 12, fontWeight: 500, flexShrink: 0 }}
                >
                  {verdictLabel(e)}
                </span>
                <span
                  style={{ fontSize: 12, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {e.texto}
                </span>
                <span
                  className="activity-entry__time mono"
                  style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}
                >
                  {fmtTime(e.time)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!stats && !error && (
        <div className="empty-state" style={{ paddingTop: 40 }}>
          <div className="empty-state__title">Cargando datos...</div>
        </div>
      )}

      {stats && activity.length === 0 && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          El feed de actividad se pobla cuando consultas finalizan su procesamiento.
        </div>
      )}
    </div>
  );
}
