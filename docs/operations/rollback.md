# Rollback

## Worker

Usar Wrangler Versions/Rollback:

```powershell
npx.cmd wrangler versions list --env preview
npx.cmd wrangler rollback --env preview
```

## Banco

Evitar rollback destrutivo. Usar migration corretiva.

## Feature Flags

Desativar:

- `EMAIL_ENABLED`
- `BILLING_ENABLED`
- `BRAPI_SYNC_ENABLED`

## Frontend

Reverter commit ou publicar versao anterior de `docs/`.
