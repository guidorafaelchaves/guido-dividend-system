# Production Deployment

Producao ainda nao foi provisionada.

## Checklist Antes De Produzir

- Criar D1 `guido-financial-platform-production`.
- Atualizar `database_id` em `wrangler.jsonc`.
- Aplicar migrations em producao apenas apos backup/smoke preview.
- Configurar `SESSION_SECRET` de producao.
- Definir dominio/origins finais.
- Desativar endpoints debug por `ENVIRONMENT=production`.
- Configurar e-mail ou manter explicitamente desativado.
- Configurar billing sandbox antes de qualquer cobranca real.
- Rodar smoke tests.
- Registrar rollback.
