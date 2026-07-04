# Radar SaaS Gateway

Camada serverless para o modo público multi-tenant. O front-end estático chama este Worker com o JWT do BaaS; o Worker valida a sessão no Supabase e só então usa os secrets de Brapi/OpenAI.

## Rotas

- `GET /api/brapi/quote?ticker=MXRF11&range=1y&interval=1d`
- `POST /api/openai/analysis`
- `GET /health`

## Secrets

```bash
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put BRAPI_TOKEN
npx wrangler secret put OPENAI_API_KEY
```

## Regra de negócio

O gateway é estritamente focado em dados de mercado, proventos e análise intrínseca de dividendos. Não há rotas de peso de carteira, rebalanceamento ou alocação ideal.
