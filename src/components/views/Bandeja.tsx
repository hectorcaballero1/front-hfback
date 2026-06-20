import { useRef, useState, type DragEvent } from 'react';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../api/client';

interface LogEntry {
  id: string;
  count: number;
  tenant: string;
  timestamp: Date;
  error?: string;
}

function timeAgo(d: Date): string {
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return `hace ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  return `hace ${Math.floor(diffMin / 60)}h`;
}

export default function Bandeja() {
  const { activeTenant } = useTenant();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [, forceRender] = useState(0);

  // Re-render every 30s to update time-ago labels
  useRef(setInterval(() => forceRender(n => n + 1), 30_000));

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      addLog({ count: 0, error: 'El archivo debe ser JSON.' });
      return;
    }

    let parsed: unknown;
    try {
      const raw = await file.text();
      parsed = JSON.parse(raw);
    } catch {
      addLog({ count: 0, error: 'JSON inválido. Revisá el formato.' });
      return;
    }

    const body = parsed as Record<string, unknown>;
    const consultas = Array.isArray(body.consultas) ? body.consultas : [];
    const payload = { ...body, tenantId: activeTenant };

    setUploading(true);
    try {
      const { uploadUrl } = await api.presign(activeTenant);
      await api.uploadToS3(uploadUrl, payload);
      addLog({ count: consultas.length });
    } catch (e) {
      addLog({ count: 0, error: e instanceof Error ? e.message : 'Error al subir.' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const addLog = ({ count, error }: { count: number; error?: string }) => {
    setLog(prev => [
      { id: crypto.randomUUID(), count, tenant: activeTenant, timestamp: new Date(), error },
      ...prev.slice(0, 19),
    ]);
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

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  return (
    <div>
      <h1 className="page-title">Bandeja</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
        Sube un JSON con consultas para inyectarlas al flujo de triage del tenant{' '}
        <span className="mono" style={{ color: 'var(--accent)' }}>{activeTenant}</span>.
      </p>

      {/* Upload area */}
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
        <Upload
          size={28}
          style={{ color: dragging ? 'var(--accent)' : 'var(--muted)', marginBottom: 12 }}
        />
        <div style={{ fontSize: 14, fontWeight: 500, color: dragging ? 'var(--accent)' : 'var(--text)', marginBottom: 4 }}>
          {uploading ? 'Subiendo...' : 'Arrastrá un JSON o hacé clic'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          Formato: {'{'} "tenantId": "...", "consultas": [{'{'} "id", "texto", "remitente" {'}'}] {'}'}
        </div>
      </div>

      {/* Ejemplo de formato */}
      <details style={{ marginTop: 16 }}>
        <summary
          style={{
            fontSize: 12,
            color: 'var(--muted)',
            cursor: 'pointer',
            userSelect: 'none',
            listStyle: 'none',
          }}
        >
          Ver formato esperado
        </summary>
        <pre
          className="mono"
          style={{
            marginTop: 8,
            padding: '12px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: 12,
            color: 'var(--text)',
            overflowX: 'auto',
            lineHeight: 1.6,
          }}
        >
{`{
  "tenantId": "${activeTenant}",
  "consultas": [
    {
      "id": "c-001",
      "texto": "¿Cuál es el plazo de entrega?",
      "remitente": "usuario@ejemplo.com"
    }
  ]
}`}
        </pre>
      </details>

      {/* Log */}
      {log.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div className="section-title">Inyecciones recientes</div>
          <div className="upload-log">
            {log.map(entry => (
              <div key={entry.id} className="upload-log-item">
                {entry.error ? (
                  <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                ) : (
                  <CheckCircle size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                )}

                {entry.error ? (
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--danger)', fontSize: 13 }}>{entry.error}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {entry.tenant} · {timeAgo(entry.timestamp)}
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>
                      <span className="upload-log-item__count">{entry.count}</span>
                      {' '}
                      {entry.count === 1 ? 'consulta inyectada' : 'consultas inyectadas'}
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {entry.tenant} · {timeAgo(entry.timestamp)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {log.length === 0 && (
        <div className="empty-state" style={{ paddingTop: 32 }}>
          <div className="empty-state__title">Sin inyecciones todavía.</div>
          <div className="empty-state__desc">
            Sube un JSON para empezar.
          </div>
        </div>
      )}
    </div>
  );
}
