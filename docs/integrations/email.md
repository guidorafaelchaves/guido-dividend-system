# Email Integration

## Estado

Abstracao `sendEmail` implementada no Worker. Com `EMAIL_ENABLED=false`, o sistema registra `email_delivery_logs` com status `disabled` e nao finge envio.

## Templates

- verification;
- password_reset;
- welcome;
- alert;
- payment_reminder.

## Pendencia

Escolher provider e configurar sandbox. Possibilidades: Cloudflare Email Sending, Resend, Postmark ou outro provider transacional.
