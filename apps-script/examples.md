# Exemplos de payload

Substitua `SUA_URL` pela URL `/exec` do Apps Script publicado.

## Cadastrar ou atualizar ativo

```bash
curl -X POST "SUA_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "upsert_asset",
    "ticker": "PETR4",
    "nome": "Petrobras PN",
    "tipo": "ACAO",
    "setor": "Energia",
    "quantidade_atual": 120,
    "preco_medio": 36.20,
    "preco_atual": 38.42,
    "status": "manter",
    "tese": "Geradora de dividendos, acompanhar preco do petroleo e politica estatal",
    "risco": "Governanca estatal",
    "tags": ["dividendos", "energia"],
    "fonte": "dividend_system"
  }'
```

## Registrar operacao

```bash
curl -X POST "SUA_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add_operation",
    "data": "2026-05-16",
    "ticker": "MXRF11",
    "tipo": "COMPRA",
    "quantidade": 100,
    "preco_unitario": 10.05,
    "custos": 0,
    "valor_total": 1005,
    "corretora": "XP",
    "origem": "manual"
  }'
```

## Registrar provento

```bash
curl -X POST "SUA_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add_dividend",
    "ticker": "KNCR11",
    "tipo_provento": "RENDIMENTO",
    "data_com": "2026-05-12",
    "data_pagamento": "2026-05-20",
    "valor_unitario": 1.05,
    "quantidade_base": 55,
    "valor_total": 57.75,
    "status": "previsto",
    "origem": "radar_eventos"
  }'
```

## Registrar decisao

```bash
curl -X POST "SUA_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add_decision",
    "data": "2026-05-16",
    "ticker": "KNCR11",
    "decisao": "REFORCAR",
    "motivo": "Renda recorrente forte, P/VP equilibrado e boa aderencia a carteira",
    "confianca": 0.91,
    "resultado_esperado": "Aumentar renda mensal com risco controlado",
    "revisar_em": "2026-06-16",
    "status": "aberta"
  }'
```

## Registrar nota no Google Docs

```bash
curl -X POST "SUA_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "doc_note",
    "title": "Revisao mensal da carteira",
    "text": "A carteira segue focada em renda recorrente. FIIs de papel continuam relevantes, mas a concentracao deve ser monitorada.",
    "origem": "decision_engine"
  }'
```

