# MARKET Integration

## Estado

O job `sync_quotes` existe no Worker e grava `asset_quotes` e `asset_quote_history`.

## Fluxo

MARKET -> Worker job -> validacao -> D1 canonico -> API interna -> frontend.

## Preview

Desativado por:

- `MARKET_SYNC_ENABLED=false`
- `MARKET_TOKEN` ainda nao configurado

Quando ativar, usar secret remoto e lote limitado.
