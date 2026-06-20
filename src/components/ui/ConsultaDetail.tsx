import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../api/client';
import type { Consulta } from '../../types';
import { VeredictoChip } from './Chip';

const CLOSE_DUR = 220; // matches --panel-close-dur

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface Props {
  consultaId: string;
  tenantId: string;
  initial?: Consulta;
  onClose: () => void;
}

export default function ConsultaDetail({ consultaId, tenantId, initial, onClose }: Props) {
  const [consulta, setConsulta] = useState<Consulta | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    timerRef.current = setTimeout(onClose, CLOSE_DUR);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (initial) return;
    setLoading(true);
    api.getConsulta(consultaId, tenantId)
      .then(c => { setConsulta(c); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [consultaId, tenantId, initial]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isClosing]);

  return (
    <>
      <div
        className={`detail-overlay${isClosing ? ' is-closing' : ''}`}
        onClick={handleClose}
      />
      <aside
        className={`detail-panel${isClosing ? ' is-closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de consulta"
      >
        <header className="detail-panel__header">
          <div>
            <div className="detail-field__label" style={{ marginBottom: 2 }}>Detalle</div>
            <span className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>
              {consultaId}
            </span>
          </div>
          <button className="detail-close" onClick={handleClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </header>

        <div className="detail-panel__body">
          {loading && (
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Cargando...</p>
          )}
          {error && (
            <div className="error-banner">{error}</div>
          )}
          {consulta && (
            <>
              <div className="detail-field">
                <div className="detail-field__label">Texto</div>
                <div className="detail-field__value">{consulta.texto}</div>
              </div>

              <div className="detail-field">
                <div className="detail-field__label">Remitente</div>
                <div className="detail-field__value mono">{consulta.remitente}</div>
              </div>

              <div className="detail-field">
                <div className="detail-field__label">Veredicto</div>
                <div className="detail-field__value">
                  <VeredictoChip veredicto={consulta.veredicto} />
                  {!consulta.veredicto && <span style={{ color: 'var(--muted)' }}>—</span>}
                </div>
              </div>

              {consulta.veredicto === 'respondido_rag' && consulta.respuesta && (
                <div className="detail-field">
                  <div className="detail-field__label">Respuesta RAG</div>
                  <div
                    className="detail-field__value"
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: '10px 12px',
                      lineHeight: 1.7,
                    }}
                  >
                    {consulta.respuesta}
                  </div>
                  {consulta.fuente && (
                    <div style={{ marginTop: 6 }}>
                      <span className="chip chip--rag">
                        Fuente: {consulta.fuente}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {consulta.veredicto === 'enrutado' && consulta.area && (
                <div className="detail-field">
                  <div className="detail-field__label">Área asignada</div>
                  <div className="detail-field__value">
                    <span className="chip chip--enrutado">{consulta.area}</span>
                  </div>
                </div>
              )}

              {consulta.modelo && (
                <div className="detail-field">
                  <div className="detail-field__label">Modelo</div>
                  <div className="detail-field__value mono">{consulta.modelo}</div>
                </div>
              )}

              <div className="separator" />

              <div className="detail-field">
                <div className="detail-field__label">Recibida</div>
                <div className="detail-field__value mono" style={{ fontSize: 12 }}>
                  {fmt(consulta.timestamp)}
                </div>
              </div>
              <div className="detail-field">
                <div className="detail-field__label">Actualizada</div>
                <div className="detail-field__value mono" style={{ fontSize: 12 }}>
                  {fmt(consulta.updatedAt)}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
