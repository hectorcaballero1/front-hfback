import { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useIngesta } from '../../context/IngestaContext';
import { api } from '../../api/client';
import type { Consulta, Estado, Stats } from '../../types';
import { VeredictoChip } from '../ui/Chip';
import ConsultaDetail from '../ui/ConsultaDetail';

const TABS: { id: Estado; label: string }[] = [
  { id: 'resuelto',   label: 'Resuelto' },
  { id: 'fallido',    label: 'Fallido' },
  { id: 'procesando', label: 'Procesando' },
  { id: 'pendiente',  label: 'Pendiente' },
];

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

export default function Consultas() {
  const { activeTenant } = useTenant();
  const { setPollingStatus } = useIngesta();

  const [tab, setTab] = useState<Estado>('resuelto');
  const [items, setItems] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(false);
  const [tableErr, setTableErr] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [selected, setSelected] = useState<Consulta | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  // ── Stats polling (activa el dot del topbar) ───────────────────────────────
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const s = await api.getStats(activeTenant);
        if (!alive) return;
        setStats(s);
        setPollingStatus(s.estados.pendiente + s.estados.procesando > 0 ? 'polling' : 'idle');
        timer = setTimeout(poll, 5000);
      } catch {
        if (alive) timer = setTimeout(poll, 8000);
      }
    };
    poll();
    return () => { alive = false; clearTimeout(timer); setPollingStatus('idle'); };
  }, [activeTenant, setPollingStatus]);

  // ── Tabla ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (cursor?: string) => {
    setLoading(true); setTableErr(null);
    try {
      const res = await api.getConsultas({ tenantId: activeTenant, estado: tab, limit: 20, cursor });
      setItems(res.items); setNextCursor(res.nextCursor); setCount(res.count);
    } catch (e) {
      setTableErr(e instanceof Error ? e.message : 'Error al cargar');
    } finally { setLoading(false); }
  }, [activeTenant, tab]);

  useEffect(() => {
    setCursorHistory([]); setCurrentCursor(undefined); setNextCursor(null);
    load(undefined);
  }, [activeTenant, tab, load]);

  // Refrescar tabla cuando la cola se vacía
  const prevBusy = useRef(false);
  useEffect(() => {
    if (!stats) return;
    const busy = stats.estados.pendiente + stats.estados.procesando > 0;
    if (prevBusy.current && !busy) load(currentCursor);
    prevBusy.current = busy;
  }, [stats, load, currentCursor]);

  const goNext = () => {
    if (!nextCursor) return;
    setCursorHistory(h => [...h, currentCursor ?? '']);
    setCurrentCursor(nextCursor); load(nextCursor);
  };
  const goPrev = () => {
    if (cursorHistory.length === 0) return;
    const prev = cursorHistory[cursorHistory.length - 1];
    setCursorHistory(h => h.slice(0, -1));
    const cur = prev === '' ? undefined : prev;
    setCurrentCursor(cur); load(cur);
  };

  const page = cursorHistory.length + 1;
  const e = stats?.estados;

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title" style={{ marginBottom: 4 }}>Consultas</h1>
      </div>

      {/* ── Tabs por estado ──────────────────────────────────────────────── */}
      <div className="filter-tabs" role="group" aria-label="Filtrar por estado">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`filter-tab ${tab === t.id ? 'active' : ''} ${t.id === 'fallido' && tab === 'fallido' ? 'filter-tab--danger' : ''}`}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
          >
            {t.label}
            {e && <span className="filter-tab__count">{e[t.id]}</span>}
          </button>
        ))}
        <button
          className="btn btn--sm"
          style={{ marginLeft: 'auto' }}
          onClick={() => load(currentCursor)}
          disabled={loading}
          aria-label="Actualizar"
        >
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {tableErr && <div className="error-banner" role="alert">{tableErr}</div>}
      {loading && <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>Cargando…</div>}

      {!loading && items.length === 0 && !tableErr && (
        <div className="empty-state">
          <div className="empty-state__title">Sin resultados</div>
          <div className="empty-state__desc">No hay consultas en estado «{tab}» para este tenant.</div>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Texto</th><th>Remitente</th><th>Veredicto</th><th>Detalle</th><th>Actualizada</th>
                </tr>
              </thead>
              <tbody>
                {items.map(c => (
                  <tr key={c.consultaId} onClick={() => setSelected(c)} tabIndex={0}
                    onKeyDown={ev => ev.key === 'Enter' && setSelected(c)} aria-label={`Ver detalle de ${c.consultaId}`}>
                    <td className="mono" style={{ fontSize: 11, color: 'var(--accent)', whiteSpace: 'nowrap' }}>{c.consultaId}</td>
                    <td style={{ maxWidth: 280 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.texto}</span>
                    </td>
                    <td className="mono" style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{c.remitente}</td>
                    <td>
                      <VeredictoChip veredicto={c.veredicto} />
                      {c.estado === 'fallido' && <span className="chip chip--fallido">Fallido</span>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {c.veredicto === 'respondido_rag' && c.fuente && <span className="chip chip--rag" style={{ fontSize: 10 }}>{c.fuente}</span>}
                      {c.veredicto === 'enrutado' && c.area && <span className="chip chip--enrutado" style={{ fontSize: 10 }}>{c.area}</span>}
                      {c.veredicto === 'no_aplica' && <span className="chip chip--no_aplica" style={{ fontSize: 10 }}>baja prioridad</span>}
                    </td>
                    <td className="mono" style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmt(c.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{count} en esta página · pág. {page}</span>
            <button className="pagination-btn" onClick={goPrev} disabled={cursorHistory.length === 0} aria-label="Anterior"><ChevronLeft size={14} /></button>
            <button className="pagination-btn" onClick={goNext} disabled={!nextCursor} aria-label="Siguiente"><ChevronRight size={14} /></button>
          </div>
        </>
      )}

      {selected && (
        <ConsultaDetail consultaId={selected.consultaId} tenantId={activeTenant} initial={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
