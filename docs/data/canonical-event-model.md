# Modelo Canonico De Evento

Tabela principal:

```text
canonical_financial_events
```

Campos principais:

- `ticker`
- `asset_type`
- `event_type`
- `announcement_date`
- `record_date`
- `ex_date`
- `payment_date`
- `amount_per_unit`
- `gross_amount`
- `net_amount`
- `currency`
- `financial_status`
- `recurrence`
- `source_type`
- `source_id`
- `source_name`
- `confidence`
- `ingestion_status`
- `validation_status`
- `review_status`
- `publication_status`
- `public_visibility`
- `data_quality_score`
- `opportunity_score`
- `dedupe_key`

Valores financeiros ficam como texto decimal para evitar arredondamento indevido.
