# Radar de Proventos SaaS Multi-Tenant

Marco arquitetural para lançamento público sem tocar no core analítico validado.

## Princípios

- O motor local de análise, parsing B3 e heurísticas permanecem preservados.
- Supabase gerencia usuários, tenants, configs e dados B3 isolados por RLS.
- IndexedDB segue como cache de alta performance.
- Cloudflare Workers escondem secrets de Brapi/OpenAI.
- Não existem tabelas, rotas ou métricas de peso de carteira, rebalanceamento ou alocação ideal.

## Fluxo

1. `authService.js` autentica no Supabase e guarda sessão curta no navegador.
2. `configManager.js` tenta carregar `user_system_configs` via RLS.
3. Se a nuvem estiver indisponível, o cache IndexedDB mantém a experiência fluida.
4. Chamadas sensíveis passam por `workers/saas-gateway`.
5. O gateway valida o JWT no Supabase antes de chamar Brapi/OpenAI com secrets do Worker.

## Tabelas

Veja `supabase/schema.sql`:

- `tenants`
- `tenant_memberships`
- `user_system_configs`
- `b3_import_batches`
- `b3_cashflow_events`
- `b3_trade_events`
- `b3_custody_snapshots`

## Próxima fase de migração

Substituir gradualmente chamadas diretas:

```js
fetch('https://brapi.dev/api/quote/...')
```

por:

```js
RadarSaasGateway.fetchBrapiQuote(ticker, { range:'1y', interval:'1d' })
```

E chamadas OpenAI diretas por:

```js
RadarSaasGateway.requestOpenAIAnalysis(payload)
```

Essa troca deve ser feita em pequenas etapas, sempre mantendo fallback local para o modo single-player.
