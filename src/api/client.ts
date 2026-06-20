import type { Consulta, ConsultasResponse, Estado, Stats, Tenant, Veredicto } from '../types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  getTenants: () =>
    get<{ tenants: Tenant[] }>('/tenants').then(r => r.tenants),

  getStats: (tenantId: string) =>
    get<Stats>(`/stats?tenantId=${encodeURIComponent(tenantId)}`),

  getConsultas: (params: {
    tenantId: string;
    estado?: Estado;
    veredicto?: Veredicto;
    limit?: number;
    cursor?: string;
  }) => {
    const q = new URLSearchParams({ tenantId: params.tenantId });
    if (params.estado) q.set('estado', params.estado);
    if (params.veredicto) q.set('veredicto', params.veredicto);
    if (params.limit != null) q.set('limit', String(params.limit));
    if (params.cursor) q.set('cursor', params.cursor);
    return get<ConsultasResponse>(`/consultas?${q}`);
  },

  getConsulta: (id: string, tenantId: string) =>
    get<Consulta>(
      `/consultas/${encodeURIComponent(id)}?tenantId=${encodeURIComponent(tenantId)}`,
    ),

  /**
   * Trae TODAS las consultas de un estado paginando el endpoint /consultas.
   * /stats no es confiable (cuenta una sola página de 1MB), así que el dashboard
   * agrega los conteos reales desde acá. `maxPages` acota el costo si hay miles.
   */
  getAllConsultas: async (params: {
    tenantId: string;
    estado?: Estado;
    veredicto?: Veredicto;
    maxPages?: number;
  }): Promise<{ items: Consulta[]; truncated: boolean }> => {
    const maxPages = params.maxPages ?? 15;
    const items: Consulta[] = [];
    let cursor: string | undefined;
    let pages = 0;
    let truncated = false;
    do {
      const res = await api.getConsultas({
        tenantId: params.tenantId,
        estado: params.estado,
        veredicto: params.veredicto,
        limit: 100,
        cursor,
      });
      items.push(...res.items);
      cursor = res.nextCursor ?? undefined;
      pages += 1;
      if (cursor && pages >= maxPages) { truncated = true; break; }
    } while (cursor);
    return { items, truncated };
  },

  presign: (tenantId: string, tipo: 'consultas' | 'documentos' = 'consultas') =>
    fetch(`${BASE}/uploads/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, tipo }),
    }).then(async r => {
      if (!r.ok) throw new Error(`Presign falló: ${r.status} ${r.statusText}`);
      return r.json() as Promise<{ uploadUrl: string; key: string }>;
    }),

  uploadToS3: (uploadUrl: string, body: unknown) =>
    fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => {
      if (!r.ok) throw new Error(`S3 rechazó la subida: ${r.status}`);
    }),
};
