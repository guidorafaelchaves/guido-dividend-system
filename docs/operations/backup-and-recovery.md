# Backup And Recovery

## Preview

Exportar D1:

```powershell
npx.cmd wrangler d1 export guido-financial-platform-preview --remote --output backup-preview.sql
```

## Retencao Recomendada

- Preview: antes de migrations relevantes.
- Producao futura: diario por 7 dias, semanal por 8 semanas, mensal por 12 meses.

## Recuperacao

Restaurar primeiro em banco nao produtivo e rodar smoke tests antes de trocar trafego.
