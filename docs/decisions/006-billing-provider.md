# ADR 006 - Billing Provider

## Contexto

A plataforma precisa preparar monetizacao para planos `dividend_system` e `family_office`, mas nao ha autorizacao para cobranca real em producao.

## Alternativas

- Stripe.
- Mercado Pago.
- Asaas.
- Pagar.me.

## Escolha Atual

Nao escolher provider definitivo nesta fase. Implementar abstracao e webhook idempotente, mantendo `BILLING_ENABLED=false`.

## Justificativa

Evita acoplamento prematuro, cobranca falsa e ativacao financeira sem credenciais/decisao comercial.

## Proxima Decisao

Comparar sandbox de Asaas, Mercado Pago e Stripe para Pix, cartao, assinatura, webhooks, custo e compatibilidade com Workers.
