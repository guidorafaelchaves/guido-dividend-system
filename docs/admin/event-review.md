# Revisao De Eventos

## Objetivo

A revisao decide se um evento canonico pode seguir para publicacao.

## Estados

- `pending_review`
- `approved`
- `rejected`

## Divergencias

Divergencias B3 x Brapi usam `event_reconciliation_cases`.

Classificacoes:

- `exact_match`
- `probable_match`
- `new_b3_event`
- `new_brapi_event`
- `value_divergence`
- `date_divergence`
- `status_divergence`
- `possible_duplicate`
- `unmatched`

## Regra Editorial

Escolhas contra a fonte de maior precedencia exigem justificativa.
