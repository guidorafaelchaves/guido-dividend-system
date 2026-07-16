# Migration Runbook

## Preview

```powershell
cd workers\platform-api
npx.cmd wrangler d1 migrations apply guido-financial-platform-preview --env preview --remote
```

## Validar

```powershell
npx.cmd wrangler d1 execute guido-financial-platform-preview --remote --command "SELECT COUNT(*) AS tables_count FROM sqlite_master WHERE type='table';"
npx.cmd wrangler d1 execute guido-financial-platform-preview --remote --command "SELECT id,name,tier FROM plans ORDER BY tier;"
```

## Rollback

D1 migrations aplicadas nao devem ser revertidas destrutivamente sem backup. Preferir migration corretiva progressiva.
