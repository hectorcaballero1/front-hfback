import { ArrowRight, Check, GitBranch, Layers, Zap, Users } from 'lucide-react';

interface Props {
  onEnter: () => void;
}

export default function Landing({ onEnter }: Props) {
  return (
    <div className="landing">
      <header className="landing-header">
        <span className="mono landing-header__logo">HACK // UTEC</span>
        <button className="btn" onClick={onEnter}>
          Entrar al sistema
        </button>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero__tag mono">Triage inteligente · LLM + RAG</div>
        <h1 className="landing-hero__headline">
          El triage que tu organización<br />hace a mano, automatizado.
        </h1>
        <p className="landing-hero__sub">
          Cada consulta en texto libre, leída, entendida y resuelta o enrutada
          al área correcta. Sin formularios rígidos, sin reenvíos manuales,
          sin consultas perdidas.
        </p>
        <button className="btn landing-cta" onClick={onEnter}>
          Ver el sistema en vivo <ArrowRight size={14} />
        </button>
      </section>

      {/* Cómo funciona */}
      <section className="landing-section">
        <div className="section-title">Cómo funciona</div>
        <div className="landing-features">
          <div className="landing-feature">
            <div className="landing-feature__icon">
              <Check size={18} style={{ color: 'var(--accent)' }} />
            </div>
            <h3 className="landing-feature__title">Responde lo que ya está documentado</h3>
            <p className="landing-feature__desc">
              Si la consulta tiene respuesta en tus reglamentos o FAQs, la
              responde al instante citando la fuente exacta. Sin inventar,
              sin alucinar — solo sobre documentación real.
            </p>
            <div className="landing-feature__chip">
              <span className="chip chip--rag">RAG</span>
            </div>
          </div>

          <div className="landing-feature">
            <div className="landing-feature__icon">
              <GitBranch size={18} style={{ color: '#60A5FA' }} />
            </div>
            <h3 className="landing-feature__title">Enruta lo que necesita un humano</h3>
            <p className="landing-feature__desc">
              Identifica el área correcta por el contenido del mensaje, sin
              importar a qué buzón llegó el correo. Soporte, finanzas,
              matrícula — el LLM entiende la intención.
            </p>
            <div className="landing-feature__chip">
              <span className="chip chip--enrutado">Enrutado</span>
            </div>
          </div>

          <div className="landing-feature">
            <div className="landing-feature__icon">
              <Layers size={18} style={{ color: 'var(--muted)' }} />
            </div>
            <h3 className="landing-feature__title">Procesa en volumen, asíncrono</h3>
            <p className="landing-feature__desc">
              Sube cientos de consultas y el sistema las drena solo, con
              reintentos automáticos y sin perder datos. Arquitectura
              serverless que escala a N workers.
            </p>
            <div className="landing-feature__chip">
              <span className="chip chip--no_aplica">Escalable</span>
            </div>
          </div>
        </div>
      </section>

      {/* Por qué un LLM */}
      <section className="landing-section landing-section--alt">
        <div className="landing-narrow">
          <div className="section-title">Por qué un LLM y no reglas</div>
          <p style={{ color: 'var(--text)', lineHeight: 1.8, fontSize: 14, marginTop: 12, textWrap: 'pretty' }}>
            Las reglas por palabra clave se rompen apenas alguien redacta distinto.
            Un sistema basado en reglas que funciona para <span className="mono" style={{ color: 'var(--muted)' }}>"¿cuándo es la matrícula?"</span> falla
            con <span className="mono" style={{ color: 'var(--muted)' }}>"me quedé fuera del proceso de inscripción"</span>.
            Un LLM entiende la <em style={{ color: 'var(--accent)', fontStyle: 'normal', fontWeight: 500 }}>intención</em> detrás
            del texto, no solo sus palabras.
          </p>
        </div>
      </section>

      {/* Impacto */}
      <section className="landing-section">
        <div className="section-title">Impacto</div>
        <div className="landing-impact">
          <div className="landing-impact__item">
            <Zap size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span>Menos tiempo de primera respuesta</span>
          </div>
          <div className="landing-impact__item">
            <Check size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span>Cero consultas perdidas por mal direccionamiento</span>
          </div>
          <div className="landing-impact__item">
            <Users size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span>Personal enfocado solo en lo que requiere criterio humano</span>
          </div>
        </div>
      </section>

      {/* Agnóstico al dominio */}
      <section className="landing-section landing-section--alt">
        <div className="landing-narrow">
          <div className="section-title">Agnóstico al dominio</div>
          <p style={{ color: 'var(--text)', lineHeight: 1.8, fontSize: 14, marginTop: 12, textWrap: 'pretty' }}>
            El mismo sistema sirve para una universidad y un banco.
            En este prototipo operan en paralelo{' '}
            <span className="mono" style={{ color: 'var(--accent)' }}>utec</span> y{' '}
            <span className="mono" style={{ color: 'var(--accent)' }}>banco</span>.
            Solo cambian los documentos de la base de conocimiento y las
            áreas de enrutamiento. La arquitectura es la misma.
          </p>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="landing-footer-cta">
        <h2 className="landing-footer-cta__title">
          Listo para ver el sistema en acción
        </h2>
        <button className="btn landing-cta" onClick={onEnter}>
          Ver el sistema en vivo <ArrowRight size={14} />
        </button>
      </section>
    </div>
  );
}
