import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Upload, CheckCircle, AlertCircle, ArrowRight, Minus } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../api/client';
import type { Consulta, Veredicto } from '../../types';
import ToastStack, { type ToastEvent } from '../ui/ToastStack';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadEntry {
  id: string;
  count: number;
  tenant: string;
  timestamp: Date;
  error?: string;
}

interface ResueltaEntry {
  id: string;
  consultaId: string;
  texto: string;
  veredicto: Veredicto | null;
  estado: 'resuelto' | 'fallido';
  area: string | null;
  timestamp: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(d: Date): string {
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return `hace ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  return `hace ${Math.floor(diffMin / 60)}h`;
}

function fmt(iso: string) {
  try { return new Date(iso).toLocaleTimeString('es-PE'); }
  catch { return iso; }
}

function VeredictoBadge({ veredicto, estado }: { veredicto: Veredicto | null; estado: string }) {
  if (estado === 'fallido') return <span className="chip chip--fallido">Fallido</span>;
  if (veredicto === 'respondido_rag') return <span className="chip chip--rag">RAG</span>;
  if (veredicto === 'enrutado') return <span className="chip chip--enrutado">Enrutado</span>;
  return <span className="chip chip--no_aplica">No aplica</span>;
}

function VeredictIcon({ veredicto, estado }: { veredicto: Veredicto | null; estado: string }) {
  if (estado === 'fallido') return <AlertCircle size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />;
  if (veredicto === 'respondido_rag') return <CheckCircle size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />;
  if (veredicto === 'enrutado') return <ArrowRight size={14} style={{ color: 'var(--blue)', flexShrink: 0 }} />;
  return <Minus size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />;
}

const EJEMPLO = (tenant: string) =>
  `{
  "tenantId": "${tenant}",
  "consultas": [
    {
      "id": "c-001",
      "texto": "¿Cuál es el plazo de entrega?",
      "remitente": "usuario@ejemplo.com"
    }
  ]
}`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Bandeja() {
  const { activeTenant } = useTenant();
  const inputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadLog, setUploadLog] = useState<UploadEntry[]>([]);
  const [, forceRender] = useState(0);

  // Queue state
  const [procesando, setProcesando] = useState<Consulta[]>([]);
  const [pendiente, setPendiente] = useState<Consulta[]>([]);
  const [resueltas, setResueltas] = useState<ResueltaEntry[]>([]);
  const [toasts, setToasts] = useState<ToastEvent[]>([]);
  const [changedIds, setChangedIds] = useState<Set<string>>(new Set());

  const procRef = useRef<Map<string, Consulta>>(new Map());

  // Re-render every 30s for time-ago labels
  useRef(setInterval(() => forceRender(n => n + 1), 30_000));

  // ── Polling ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    procRef.current = new Map();
    setProcesando([]);
    setPendiente([]);
    setResueltas([]);
    setToasts([]);
    setChangedIds(new Set());

    let timer: ReturnType<typeof setTimeout>;
    const tenant = activeTenant;

    const poll = async () => {
      try {
        const [newProc, newPend] = await Promise.all([
          api.getConsultas({ tenantId: tenant, estado: 'procesando', limit: 10 }),
          api.getConsultas({ tenantId: tenant, estado: 'pendiente', limit: 20 }),
        ]);
        if (!active) return;

        // Detect departed
        const newProcIds = new Set(newProc.items.map(c => c.consultaId));
        const departed = [...procRef.current.keys()].filter(id => !newProcIds.has(id));

        if (departed.length > 0) {
          Promise.all(departed.map(id => api.getConsulta(id, tenant).catch(() => null)))
            .then(results => {
              if (!active) return;
              results.forEach(c => {
                if (!c) return;
                const entry: ResueltaEntry = {
                  id: crypto.randomUUID(),
                  consultaId: c.consultaId,
                  texto: c.texto,
                  veredicto: c.veredicto,
                  estado: c.estado as 'resuelto' | 'fallido',
                  area: c.area,
                  timestamp: new Date(),
                };
                setResueltas(prev => [entry, ...prev].slice(0, 30));
                setToasts(prev => [
                  ...prev,
                  { id: crypto.randomUUID(), consultaId: c.consultaId, veredicto: c.veredicto, estado: c.estado as 'resuelto' | 'fallido', area: c.area },
                ]);
              });
            });
        }

        // Detect changed for pulse
        const changed = new Set<string>();
        for (const c of newProc.items) {
          const prev = procRef.current.get(c.consultaId);
          if (!prev || prev.updatedAt !== c.updatedAt) changed.add(c.consultaId);
        }

        procRef.current = new Map(newProc.items.map(c => [c.consultaId, c]));

        setProcesando(newProc.items);
        setPendiente(newPend.items);

        if (changed.size > 0) {
          setChangedIds(changed);
          setTimeout(() => { if (active) setChangedIds(new Set()); }, 400);
        }

        timer = setTimeout(poll, 1500);
      } catch {
        if (!active) return;
        timer = setTimeout(poll, 3000);
      }
    };

    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [activeTenant]);

  // ── Upload ────────────────────────────────────────────────────────────────
  const addUploadLog = ({ count, error }: { count: number; error?: string }) => {
    setUploadLog(prev => [
      { id: crypto.randomUUID(), count, tenant: activeTenant, timestamp: new Date(), error },
      ...prev.slice(0, 9),
    ]);
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      addUploadLog({ count: 0, error: 'El archivo debe ser JSON.' });
      return;
    }
    let parsed: unknown;
    try {
      const raw = await file.text();
      parsed = JSON.parse(raw);
    } catch {
      addUploadLog({ count: 0, error: 'JSON inválido. Revisá el formato.' });
      return;
    }

    const body = parsed as Record<string, unknown>;
    const consultas = Array.isArray(body.consultas) ? body.consultas : [];
    const payload = { ...body, tenantId: activeTenant };

    setUploading(true);
    try {
      const { uploadUrl } = await api.presign(activeTenant, 'consultas');
      await api.uploadToS3(uploadUrl, payload);
      addUploadLog({ count: consultas.length });
    } catch (e) {
      addUploadLog({ count: 0, error: e instanceof Error ? e.message : 'Error al subir.' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };
  const onDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const hayActividad = procesando.length > 0 || pendiente.length > 0 || resueltas.length > 0;

  return (
    <div>
      <ToastStack events={toasts} onRemove={id => setToasts(p => p.filter(t => t.id !== id))} />

      <h1 className="page-title">Bandeja</h1>

      {/* ── Upload ──────────────────────────────────────────────────────── */}
      <div
        className={`upload-area ${dragging ? 'drag-over' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Soltar archivo JSON aquí o hacer clic para seleccionar"
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && !uploading && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{ cursor: uploading ? 'wait' : 'pointer' }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          onChange={onFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
          aria-hidden
        />
        <Upload size={28} style={{ color: dragging ? 'var(--accent)' : 'var(--muted)', marginBottom: 12 }} />
        <div style={{ fontSize: 14, fontWeight: 500, color: dragging ? 'var(--accent)' : 'var(--text)', marginBottom: 4 }}>
          {uploading ? 'Subiendo...' : 'Arrastrá un JSON o hacé clic'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          tenant: <span className="mono" style={{ color: 'var(--accent)' }}>{activeTenant}</span>
          {' · '}formato: consultas
        </div>
      </div>

      {/* Upload log (compact, inline) */}
      {uploadLog.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
          {uploadLog.map(entry => (
            <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '5px 0' }}>
              {entry.error
                ? <AlertCircle size={13} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                : <CheckCircle size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              }
              <span style={{ color: entry.error ? 'var(--danger)' : 'var(--text)' }}>
                {entry.error ?? `${entry.count} ${entry.count === 1 ? 'consulta inyectada' : 'consultas inyectadas'}`}
              </span>
              <span className="mono" style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 'auto' }}>
                {timeAgo(entry.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}

      <details style={{ marginTop: 12 }}>
        <summary style={{ fontSize: 12, color: 'var(--muted)', cursor: 'pointer', userSelect: 'none', listStyle: 'none' }}>
          Ver formato esperado
        </summary>
        <pre className="mono" style={{ marginTop: 8, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text)', overflowX: 'auto', lineHeight: 1.6 }}>
          {EJEMPLO(activeTenant)}
        </pre>
      </details>

      {/* ── Cola en vivo ─────────────────────────────────────────────────── */}
      {hayActividad ? (
        <div style={{ marginTop: 36 }}>

          {/* En proceso */}
          {procesando.length > 0 && (
            <div className="processing-section">
              <div className="section-title">En proceso</div>
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
            </div>
          )}

          {/* En cola */}
          {pendiente.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div className="section-title">
                <span>En cola</span>
                <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{pendiente.length}</span>
              </div>
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
            </div>
          )}

          {/* Resultados de esta sesión */}
          {resueltas.length > 0 && (
            <div>
              <div className="section-title">Resultados de esta sesión</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {resueltas.map(r => (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '10px 14px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <VeredictIcon veredicto={r.veredicto} estado={r.estado} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r.consultaId}</span>
                        <VeredictoBadge veredicto={r.veredicto} estado={r.estado} />
                        {r.area && (
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>→ {r.area}</span>
                        )}
                        <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
                          {timeAgo(r.timestamp)}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {r.texto}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state" style={{ paddingTop: 40 }}>
          <div className="empty-state__title">Cola vacía.</div>
          <div className="empty-state__desc">
            Sube un JSON para inyectar consultas y ver el procesamiento aquí.
          </div>
        </div>
      )}
    </div>
  );
}
