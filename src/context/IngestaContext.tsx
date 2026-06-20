import { createContext, useContext, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { useTenant } from './TenantContext';

export type PollingStatus = 'idle' | 'polling' | 'error';
type UploadMsg = { kind: 'ok' | 'err'; text: string } | null;

interface IngestaCtx {
  editor: string;
  setEditor: (v: string) => void;
  uploading: boolean;
  uploadMsg: UploadMsg;
  setUploadMsg: (m: UploadMsg) => void;
  procesar: () => Promise<void>;
  pollingStatus: PollingStatus;
  setPollingStatus: (s: PollingStatus) => void;
}

const Ctx = createContext<IngestaCtx | null>(null);

const LS_EDITOR = 'hfb.ingesta.editor';

function loadEditor(): string {
  try { return localStorage.getItem(LS_EDITOR) ?? ''; } catch { return ''; }
}

export function IngestaProvider({ children }: { children: ReactNode }) {
  const { activeTenant } = useTenant();

  const [editor, setEditorState] = useState<string>(loadEditor);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<UploadMsg>(null);
  const [pollingStatus, setPollingStatus] = useState<PollingStatus>('idle');

  const setEditor = (v: string) => {
    setEditorState(v);
    try { localStorage.setItem(LS_EDITOR, v); } catch { /* quota */ }
  };

  const procesar = async () => {
    let parsed: { tenantId?: string; consultas?: { id?: string; texto: string; remitente?: string }[] };
    try { parsed = JSON.parse(editor); } catch { return; }
    const consultas = (parsed.consultas ?? []).map((c, i) => ({
      ...c,
      id: c.id && String(c.id).trim() ? String(c.id) : `c-${Date.now().toString(36)}-${i}`,
    }));
    if (consultas.length === 0) return;

    const tenant = activeTenant;
    const payload = { ...parsed, tenantId: tenant, consultas };
    setUploading(true);
    setUploadMsg(null);
    try {
      const { uploadUrl } = await api.presign(tenant, 'consultas');
      await api.uploadToS3(uploadUrl, payload);

      const n = consultas.length;
      setUploadMsg({ kind: 'ok', text: `${n} ${n === 1 ? 'consulta subida' : 'consultas subidas'} a S3 correctamente.` });
    } catch (e) {
      setUploadMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Error al subir.' });
      setPollingStatus('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Ctx.Provider value={{
      editor, setEditor, uploading, uploadMsg, setUploadMsg,
      procesar, pollingStatus, setPollingStatus,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useIngesta() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useIngesta debe usarse dentro de IngestaProvider');
  return ctx;
}
