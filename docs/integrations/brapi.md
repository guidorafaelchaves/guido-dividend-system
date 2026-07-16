# BRAPI Integration

## Estado

O job `sync_quotes` existe no Worker e grava `asset_quotes` e `asset_quote_history`.

## Fluxo

BRAPI -> Worker job -> validacao -> D1 canonico -> API interna -> frontend.

## Preview

Desativado por:

- `BRAPI_SYNC_ENABLED=false`
- `BRAPI_TOKEN` ainda nao configurado

Quando ativar, usar secret remoto e lote limitado.
