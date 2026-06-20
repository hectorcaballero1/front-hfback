# HACK//UTEC · Triage

Consola de operador para el sistema de triage inteligente de consultas. Un backend serverless recibe consultas en texto libre, un LLM les asigna un veredicto (`respondido_rag`, `enrutado`, `no_aplica`) y este frontend permite inyectarlas, monitorear el procesamiento en tiempo real y verificar los resultados.

Multitenant (UTEC / Banco Nacional). Consume una API REST por polling HTTP.

## Requisitos

- Node 18+
- pnpm

## Desarrollo

```bash
cp .env.example .env   # configurar VITE_API_URL
pnpm install
pnpm dev
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base de la API REST (sin slash final) |

## Build

```bash
pnpm build
```
