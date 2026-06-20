import { useEffect, useRef, useState } from 'react';
import { Upload, FileJson, Wand2, Eraser, Play, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useIngesta } from '../../context/IngestaContext';

const TEMPLATE = (tenant: string) => JSON.stringify({
  tenantId: tenant,
  consultas: [
    { texto: '¿Cuándo abre la matrícula del ciclo 2026-1?', remitente: 'ana@example.com' },
    { texto: 'Mi pago de pensión no se ve reflejado en el sistema, ¿pueden revisar?', remitente: 'luis@example.com' },
    { texto: 'Hola, vendo entradas para el concierto del sábado, escríbeme.', remitente: 'promo@spam.com' },
  ],
}, null, 2);

const PLACEHOLDER = `{
  "tenantId": "utec",
  "consultas": [
    { "texto": "¿Cuándo abre la matrícula?", "remitente": "ana@example.com" }
  ]
}

// Pegá o cargá un JSON. Usá «Ejemplo» para empezar.`;

export default function Ingesta() {
  const { activeTenant } = useTenant();
  const { editor, setEditor, uploading, uploadMsg, setUploadMsg, procesar } = useIngesta();
  const fileRef = useRef<HTMLInputElement>(null);

  const [parseError, setParseError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (editor.trim() === '') { setParseError(null); setCount(0); return; }
    try {
      const parsed = JSON.parse(editor);
      const arr = Array.isArray(parsed?.consultas) ? parsed.consultas : null;
      if (!arr) { setParseError('Falta el array "consultas".'); setCount(0); return; }
      const bad = arr.findIndex((c: { texto?: unknown }) => typeof c?.texto !== 'string' || !c.texto);
      if (bad !== -1) { setParseError(`La consulta #${bad} no tiene "texto" válido.`); setCount(arr.length); return; }
      setParseError(null);
      setCount(arr.length);
    } catch (e) {
      setParseError(e instanceof Error ? e.message.replace(/^JSON\.parse: /, '') : 'JSON inválido.');
    }
  }, [editor]);

  const format = () => { try { setEditor(JSON.stringify(JSON.parse(editor), null, 2)); } catch { /* noop */ } };
  const ejemplo = () => { setEditor(TEMPLATE(activeTenant)); setUploadMsg(null); };
  const limpiar = () => { setEditor(''); setUploadMsg(null); };
  const loadFile = (file: File) => { file.text().then(txt => { setEditor(txt); setUploadMsg(null); }); };

  const canProcess = !parseError && count > 0 && !uploading;

  return (
    <div className="ingesta">
      <div className="page-head">
        <h1 className="page-title" style={{ marginBottom: 4 }}>Ingesta</h1>
        <p className="page-subtitle">Editá el JSON y envialo al pipeline.</p>
      </div>

      <section className="editor-panel">
        <div className="editor-toolbar">
          <span className="editor-toolbar__title"><FileJson size={14} /> Payload de consultas</span>
          <span className="editor-toolbar__spacer" />
          <button className="btn btn--sm" onClick={() => fileRef.current?.click()}><Upload size={13} /> Cargar</button>
          <button className="btn btn--sm" onClick={format} disabled={!!parseError || !editor.trim()}><Wand2 size={13} /> Formatear</button>
          <button className="btn btn--sm" onClick={ejemplo}><FileJson size={13} /> Ejemplo</button>
          <button className="btn btn--sm" onClick={limpiar} disabled={!editor.trim()}><Eraser size={13} /> Limpiar</button>
          <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ''; }} />
        </div>

        <textarea
          className={`json-editor ${parseError ? 'invalid' : ''}`}
          value={editor}
          spellCheck={false}
          placeholder={PLACEHOLDER}
          onChange={e => setEditor(e.target.value)}
          aria-label="Editor de JSON de consultas"
        />

        <div className="editor-footer">
          <span className={`editor-status ${parseError ? 'editor-status--err' : editor.trim() ? 'editor-status--ok' : 'editor-status--idle'}`}>
            {parseError
              ? <><AlertCircle size={13} /> {parseError}</>
              : editor.trim()
                ? <><Check size={13} /> JSON válido · {count} {count === 1 ? 'consulta' : 'consultas'} · tenant <b>{activeTenant}</b></>
                : <>Pegá o cargá un JSON · tenant <b>{activeTenant}</b></>}
          </span>
          <button className="btn landing-cta btn--sm" onClick={procesar} disabled={!canProcess}>
            {uploading ? <Loader2 size={14} className="spin" /> : <Play size={14} />}
            {uploading ? 'Subiendo…' : 'Procesar'}
          </button>
        </div>

        {uploadMsg && (
          <div className={`upload-flash ${uploadMsg.kind === 'err' ? 'upload-flash--err' : ''}`}>
            {uploadMsg.kind === 'err' ? <AlertCircle size={14} /> : <Check size={14} />}
            {uploadMsg.text}
          </div>
        )}
      </section>
    </div>
  );
}
