import { ArrowRight, Check, GitBranch, Layers, Zap, Users } from 'lucide-react';

interface Props {
  onEnter: () => void;
}

export default function Landing({ onEnter }: Props) {
  return (
    <div className="landing">

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <header className="landing-header">
        <div className="landing-header__logo">
          <img
            src="/logo.png"
            alt="High Flying Birds"
            style={{ height: 28, width: 'auto', objectFit: 'contain' }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          HIGH FLYING BIRDS
        </div>
        <button className="btn landing-cta" onClick={onEnter} style={{ padding: '7px 16px', fontSize: 13 }}>
          Entrar al sistema <ArrowRight size={13} />
        </button>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-inner">
          <div className="landing-hero__text">
            <div className="landing-hero__tag">Triage inteligente · LLM + RAG</div>
            <h1 className="landing-hero__headline">
              El triage que tu organización<br />
              hace a mano,<br />
              <em>automatizado.</em>
            </h1>
            <p className="landing-hero__sub">
              Cada consulta en texto libre, leída, entendida y resuelta
              o enrutada al área correcta. Sin formularios rígidos,
              sin reenvíos manuales, sin consultas perdidas.
            </p>
            <button className="btn landing-cta" onClick={onEnter}>
              Ver el sistema en vivo <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ───────────────────────────────────────────────────── */}
      <section className="landing-section">
        <div className="landing-inner">
          <div className="landing-section__eyebrow">Cómo funciona</div>
          <h2 className="landing-section__title">Tres veredictos posibles, cero ambigüedad</h2>
          <div className="landing-features">

            <div className="landing-feature">
              <div className="landing-feature__step">01</div>
              <div className="landing-feature__icon landing-feature__icon--rag">
                <Check size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <h3 className="landing-feature__title">Responde lo que ya está documentado</h3>
              <p className="landing-feature__desc">
                Si la consulta tiene respuesta en tus reglamentos o FAQs, la responde
                al instante citando la fuente exacta. Sin inventar, sin alucinar,
                solo sobre documentación real.
              </p>
              <div className="landing-feature__chip">
                <span className="chip chip--rag">RAG</span>
              </div>
            </div>

            <div className="landing-feature">
              <div className="landing-feature__step">02</div>
              <div className="landing-feature__icon landing-feature__icon--enrutado">
                <GitBranch size={18} style={{ color: 'var(--blue)' }} />
              </div>
              <h3 className="landing-feature__title">Enruta lo que necesita un humano</h3>
              <p className="landing-feature__desc">
                Identifica el área correcta por el contenido del mensaje, sin importar
                a qué buzón llegó el correo. Soporte, finanzas, matrícula: el LLM
                entiende la intención, no solo las palabras clave.
              </p>
              <div className="landing-feature__chip">
                <span className="chip chip--enrutado">Enrutado</span>
              </div>
            </div>

            <div className="landing-feature">
              <div className="landing-feature__step">03</div>
              <div className="landing-feature__icon landing-feature__icon--scale">
                <Layers size={18} style={{ color: 'var(--muted)' }} />
              </div>
              <h3 className="landing-feature__title">Procesa en volumen, asíncrono</h3>
              <p className="landing-feature__desc">
                Sube cientos de consultas y el sistema las drena solo, con reintentos
                automáticos y sin perder datos. Arquitectura serverless que escala a
                N workers sin cambiar una línea de código.
              </p>
              <div className="landing-feature__chip">
                <span className="chip chip--no_aplica">Escalable</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Por qué un LLM ──────────────────────────────────────────────────── */}
      <section className="landing-section landing-section--alt">
        <div className="landing-inner landing-narrow">
          <div className="landing-section__eyebrow">Por qué un LLM y no reglas</div>
          <h2 className="landing-section__title">Las reglas se rompen.<br />La intención no.</h2>
          <p style={{ color: 'var(--muted)', lineHeight: 1.8, fontSize: 14, textWrap: 'pretty' }}>
            Un sistema de reglas por palabra clave que funciona para{' '}
            <span className="mono" style={{ color: 'var(--text)', background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4 }}>"¿cuándo es la matrícula?"</span>
            {' '}falla con{' '}
            <span className="mono" style={{ color: 'var(--text)', background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4 }}>"me quedé fuera del proceso de inscripción"</span>.
            Un LLM entiende la{' '}
            <strong style={{ color: 'var(--text)', fontWeight: 600 }}>intención</strong> detrás del texto.
            Cualquier variación lingüística, jerga o error tipográfico produce
            el mismo veredicto correcto.
          </p>
        </div>
      </section>

      {/* ── Impacto ─────────────────────────────────────────────────────────── */}
      <section className="landing-section">
        <div className="landing-inner">
          <div className="landing-section__eyebrow">Impacto operativo</div>
          <h2 className="landing-section__title">Menos tiempo de respuesta.<br />Cero consultas perdidas.</h2>
          <div className="landing-impact">
            {[
              { icon: <Zap size={14} style={{ color: 'var(--accent)' }} />, text: 'Respuesta inmediata en consultas con respuesta documentada, sin esperar a que un humano lo vea.' },
              { icon: <Check size={14} style={{ color: 'var(--accent)' }} />, text: 'Cero consultas perdidas por mal direccionamiento. El área correcta las recibe siempre.' },
              { icon: <Users size={14} style={{ color: 'var(--accent)' }} />, text: 'Personal enfocado solo en lo que requiere criterio humano real.' },
            ].map((item, i) => (
              <div key={i} className="landing-impact__item">
                <div className="landing-impact__icon">{item.icon}</div>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agnóstico al dominio ────────────────────────────────────────────── */}
      <section className="landing-section landing-section--alt">
        <div className="landing-inner landing-narrow">
          <div className="landing-section__eyebrow">Multi-tenant · Agnóstico al dominio</div>
          <h2 className="landing-section__title">El mismo sistema. Cualquier organización.</h2>
          <p style={{ color: 'var(--muted)', lineHeight: 1.8, fontSize: 14, textWrap: 'pretty' }}>
            El mismo sistema sirve para una universidad y un banco, y opera ambos
            en paralelo, aislados. Solo cambian los documentos de la base de
            conocimiento y las áreas de enrutamiento. La arquitectura es la misma.
            Agregar un nuevo tenant es cuestión de configuración, no de código.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            <span className="chip chip--rag" style={{ fontFamily: 'var(--font-mono)' }}>utec</span>
            <span className="chip chip--enrutado" style={{ fontFamily: 'var(--font-mono)' }}>banco</span>
            <span className="chip chip--no_aplica">+ cualquier dominio</span>
          </div>
        </div>
      </section>

      {/* ── Footer CTA ──────────────────────────────────────────────────────── */}
      <section className="landing-footer-cta">
        <div className="landing-inner">
          <div className="landing-footer-cta__eyebrow">High Flying Birds · Triage AI</div>
          <h2 className="landing-footer-cta__title">
            Listo para ver el sistema<br />en acción.
          </h2>
          <button className="btn landing-cta landing-cta--inverse" onClick={onEnter}>
            Ver el sistema en vivo <ArrowRight size={14} />
          </button>
        </div>
      </section>

    </div>
  );
}
