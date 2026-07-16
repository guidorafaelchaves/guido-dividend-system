# Authentication Security

- Senhas com PBKDF2 + salt.
- Iteracoes configuraveis por ambiente.
- Sessoes assinadas via HMAC SHA-256.
- `SESSION_SECRET` em secret remoto.
- Rate limiting inicial para cadastro, login e reset.

## Risco Aceito

O frontend ainda usa Bearer token em storage local. Para producao sensivel, avaliar cookie `HttpOnly`, `Secure`, `SameSite` ou provedor de auth dedicado.
