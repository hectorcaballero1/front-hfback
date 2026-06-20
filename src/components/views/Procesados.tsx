import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../api/client';
import type { Consulta, Veredicto } from '../../types';
import { VeredictoChip } from '../ui/Chip';
import ConsultaDetail from '../ui/ConsultaDetail';

type Filter = 'all' | Veredicto | 'fallido';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',            label: 'Todos' },
  { id: 'respondido_rag', label: 'RAG' },
  { id: 'enrutado',       label: 'Enrutados' },
  { id: 'no_aplica',      label: 'No aplica' },
  { id: 'fallido',        label: 'Fallidos' },
];

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function Procesados() {
  const { activeTenant } = useTenant();
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [selected, setSelected] = useState<Consulta | null>(null);

  const load = useCallback(async (cursor?: string) => {
    setLoading(true);
    setError(null);
    try {
      const esFallido = filter === 'fallido';
      const res = await api.getConsultas({
        tenantId: activeTenant,
        estado: esFallido ? 'fallido' : 'resuelto',
        veredicto: (!esFallido && filter !== 'all') ? (filter as Veredicto) : undefined,
        limit: 20,
        cursor,
      });
      setItems(res.items);
      setNextCursor(res.nextCursor);
      setCount(res.count);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [activeTenant, filter]);

  useEffect(() => {
    setCursorHistory([]);
    setCurrentCursor(undefined);
    setNextCursor(null);
    load(undefined);
  }, [activeTenant, filter]);

  const goNext = () => {
    if (!nextCursor) return;
    setCursorHistory(h => [...h, currentCursor ?? '']);
    setCurrentCursor(nextCursor);
    load(nextCursor);
  };

  const goPrev = () => {
    if (cursorHistory.length === 0) return;
    const prev = cursorHistory[cursorHistory.length - 1];
    setCursorHistory(h => h.slice(0, -1));
    const cur = prev === '' ? undefined : prev;
    setCurrentCursor(cur);
    load(cur);
  };

  const page = cursorHistory.length + 1;

  return (
    <div>
      <h1 className="page-title">Procesados</h1>

      {/* Filtros */}
      <div className="filter-tabs" role="group" aria-label="Filtrar por estado y veredicto">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`filter-tab ${filter === f.id ? 'active' : ''} ${f.id === 'fallido' && filter === 'fallido' ? 'filter-tab--danger' : ''}`}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {loading && (
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
          Cargando...
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-state__title">Sin resultados</div>
          <div className="empty-state__desc">
            {filter === 'fallido'
              ? 'No hay consultas fallidas. Todo procesó bien.'
              : 'No hay consultas resueltas con ese filtro todavía.'}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Texto</th>
                  <th>Remitente</th>
                  <th>Veredicto</th>
                  <th>Detalle</th>
                  <th>Actualizada</th>
                </tr>
              </thead>
              <tbody>
                {items.map(c => (
                  <tr
                    key={c.consultaId}
                    onClick={() => setSelected(c)}
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setSelected(c)}
                    aria-label={`Ver detalle de ${c.consultaId}`}
                  >
                    <td className="mono" style={{ fontSize: 11, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                      {c.consultaId}
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <span
                        style={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.texto}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {c.remitente}
                    </td>
                    <td>
                      <VeredictoChip veredicto={c.veredicto} />
                      {c.estado === 'fallido' && (
                        <span className="chip chip--fallido">Fallido</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {c.veredicto === 'respondido_rag' && c.fuente && (
                        <span className="chip chip--rag" style={{ fontSize: 10 }}>{c.fuente}</span>
                      )}
                      {c.veredicto === 'enrutado' && c.area && (
                        <span className="chip chip--enrutado" style={{ fontSize: 10 }}>{c.area}</span>
                      )}
                      {c.veredicto === 'no_aplica' && (
                        <span className="chip chip--no_aplica" style={{ fontSize: 10 }}>baja prioridad</span>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {fmt(c.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {count} consultas · pág. {page}
            </span>
            <button
              className="pagination-btn"
              onClick={goPrev}
              disabled={cursorHistory.length === 0}
              aria-label="Página anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              className="pagination-btn"
              onClick={goNext}
              disabled={!nextCursor}
              aria-label="Página siguiente"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </>
      )}

      {selected && (
        <ConsultaDetail
          consultaId={selected.consultaId}
          tenantId={activeTenant}
          initial={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
