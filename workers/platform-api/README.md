# Guido Financial Platform API

Worker de produto para a Fase 2: autenticacao de usuarios, perfis, planos, favoritos, watchlist, alertas, notificacoes, carteiras e auditoria.

## Ambiente Local

```powershell
npx wrangler d1 create guido-financial-platform
Copy-Item wrangler.toml.example wrangler.toml
npx wrangler d1 migrations apply guido-financial-platform --local
npx wrangler secret put SESSION_SECRET
npx wrangler dev
```

## Endpoints Principais

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/password-reset/request`
- `GET /me`
- `PATCH /me/profile`
- `GET /me/preferences`
- `PUT /me/preferences`
- `GET /me/dashboard`
- `GET|POST /favorites`
- `GET|POST /watchlists`
- `POST /watchlists/:id/items`
- `GET|POST /alerts`
- `GET /notifications`
- `GET|POST /portfolios`
- `POST /portfolios/:id/transactions`
- `GET /admin/users`
- `GET /admin/plans`

## Segurança

- Senhas usam PBKDF2 SHA-256.
- Sessao assinada com HMAC SHA-256.
- Dados privados exigem Bearer token.
- Rotas administrativas exigem papel `admin` ou `owner`.
- Logs nao devem incluir senhas, tokens ou payloads financeiros completos.
