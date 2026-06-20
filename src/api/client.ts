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

  presign: (tenantId: string) =>
    fetch(`${BASE}/uploads/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId }),
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
