export type Estado = 'pendiente' | 'procesando' | 'resuelto' | 'fallido';
export type Veredicto = 'respondido_rag' | 'enrutado' | 'no_aplica';
export type View = 'landing' | 'envivo' | 'bandeja' | 'corpus' | 'procesados';

export interface Tenant {
  tenantId: string;
  nombre: string;
}

export interface Stats {
  tenantId: string;
  estados: {
    pendiente: number;
    procesando: number;
    resuelto: number;
    fallido: number;
  };
  veredictos: {
    respondido_rag: number;
    enrutado: number;
    no_aplica: number;
  };
  total: number;
}

export interface Consulta {
  consultaId: string;
  tenantId: string;
  texto: string;
  remitente: string;
  estado: Estado;
  veredicto: Veredicto | null;
  area: string | null;
  respuesta: string | null;
  fuente: string | null;
  modelo: string | null;
  fragmento?: string | null;
  timestamp: string;
  updatedAt: string;
}

export interface ConsultasResponse {
  items: Consulta[];
  nextCursor: string | null;
  count: number;
}
