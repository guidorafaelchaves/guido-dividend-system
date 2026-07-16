# Billing Integration

## Estado

Billing esta modelado e desativado por flag.

- `/billing/checkout`: responde desativado enquanto `BILLING_ENABLED=false`.
- `/billing/webhook`: registra evento recebido com hash do payload, mas ainda nao concede acesso.

## Pendencia

Escolher provider sandbox, configurar assinatura de webhook e ativar somente em preview.
