# Preview Deployment

## Comandos Executados

```powershell
npx.cmd wrangler d1 create guido-financial-platform-preview
npx.cmd wrangler d1 migrations apply guido-financial-platform-preview --env preview --remote
npx.cmd wrangler secret bulk <temp-json> --env preview
npx.cmd wrangler deploy --env preview
```

## URL

`https://guido-financial-platform-api-preview.guidorafaelchaves.workers.dev`

## Smoke Test

Validado em 2026-07-13:

- health;
- DB health;
- integrations health;
- cadastro;
- sessao;
- favoritos;
- watchlist;
- carteira;
- alerta;
- dashboard;
- job `evaluate_alerts`.
