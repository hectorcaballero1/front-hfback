import type { Veredicto, Estado } from '../../types';

const VEREDICTO_LABELS: Record<Veredicto, string> = {
  respondido_rag: 'RAG',
  enrutado: 'Enrutado',
  no_aplica: 'No aplica',
};

const ESTADO_LABELS: Record<Estado, string> = {
  pendiente: 'Pendiente',
  procesando: 'Procesando',
  resuelto: 'Resuelto',
  fallido: 'Fallido',
};

interface VeredictoChipProps {
  veredicto: Veredicto | null;
}

export function VeredictoChip({ veredicto }: VeredictoChipProps) {
  if (!veredicto) return null;
  return (
    <span className={`chip chip--${veredicto}`}>
      {VEREDICTO_LABELS[veredicto]}
    </span>
  );
}

interface EstadoChipProps {
  estado: Estado;
}

export function EstadoChip({ estado }: EstadoChipProps) {
  const cls =
    estado === 'resuelto' ? 'chip--enrutado' :
    estado === 'fallido' ? 'chip--fallido' :
    estado === 'procesando' ? 'chip--rag' :
    'chip--no_aplica';
  return <span className={`chip ${cls}`}>{ESTADO_LABELS[estado]}</span>;
}
