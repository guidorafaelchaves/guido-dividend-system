# Environments

## Development

- Worker: `guido-financial-platform-api-dev`
- D1: local simulation
- Origins: `http://localhost:4173`, `http://localhost:8787`
- Secrets: `.dev.vars`, nunca versionado
- Flags: e-mail, billing e BRAPI sync desativados por padrao

## Preview

- Worker: `guido-financial-platform-api-preview`
- URL: `https://guido-financial-platform-api-preview.guidorafaelchaves.workers.dev`
- D1: `guido-financial-platform-preview`
- D1 id: `3c1067a2-8806-4283-8dbd-8c71e2f36b2a`
- Origins: GitHub Pages, Cloudflare Pages e localhost de teste
- Secret aplicado: `SESSION_SECRET`
- Flags atuais: `EMAIL_ENABLED=false`, `BILLING_ENABLED=false`, `BRAPI_SYNC_ENABLED=false`

## Production

- Worker planejado: `guido-financial-platform-api`
- D1 planejado: `guido-financial-platform-production`
- Nao provisionado nesta fase.
- Nao aplicar migration destrutiva automaticamente.
- Exigir smoke preview aprovado antes de producao.
