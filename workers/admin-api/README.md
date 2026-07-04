# Radar Admin API

Backend seguro para o `admin.html` do Radar de Proventos.

## Arquitetura

- GitHub Pages hospeda apenas a SPA admin.
- Cloudflare Worker expõe a API segura.
- D1 guarda métricas de uso, custos, assinaturas e atividade.
- Secrets ficam no Worker, nunca no HTML.

## Endpoints

- `POST /admin/auth/session`
  - Entrada: `{ "email": "...", "password": "..." }`
  - Saída: `{ token, expiresAt, user }`
- `GET /admin/metrics?period=30d`
  - Header: `Authorization: Bearer <token>`
  - Saída compatível com `public/admin.html`.
- `POST /admin/ingest`
  - Header: `Authorization: Bearer <token>`
  - Entrada manual para custos/uso.
- `GET /health`

## Deploy

1. Instale/acesse Wrangler:

```bash
npm install
npx wrangler login
```

2. Crie o D1:

```bash
npx wrangler d1 create radar-admin-finops
```

3. Copie a configuração:

```bash
copy workers\admin-api\wrangler.toml.example workers\admin-api\wrangler.toml
```

Cole o `database_id` retornado pelo Cloudflare em `workers/admin-api/wrangler.toml`.

4. Aplique o schema:

```bash
cd workers\admin-api
npx wrangler d1 migrations apply radar-admin-finops --remote
```

5. Gere o hash da senha:

```bash
node scripts/hash-password.mjs "SUA_SENHA_FORTE_AQUI"
```

6. Grave os secrets:

```bash
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD_HASH
npx wrangler secret put ADMIN_JWT_SECRET
```

Use como `ADMIN_PASSWORD_HASH` o valor gerado no passo 5.

7. Faça deploy:

```bash
npx wrangler deploy
```

8. No `admin.html`, use como Backend seguro a URL do Worker, por exemplo:

```text
https://radar-admin-api.SEUSUBDOMINIO.workers.dev
```

## Seed opcional para homologação

```bash
npx wrangler d1 execute radar-admin-finops --remote --file seed.sql
```

## Segurança

- Não existe senha fixa no front-end.
- CORS é limitado por `ADMIN_ALLOWED_ORIGINS`.
- Sessões expiram em 30 minutos.
- Tokens são assinados com HMAC SHA-256 por `ADMIN_JWT_SECRET`.
- Senha é validada por PBKDF2 SHA-256.
- Secrets de Brapi, IA e provedores devem ser usados apenas no Worker ou em jobs de ingestão.

## Shape dos dados

O painel calcula:

- MRR, DAU, MAU, conversão, retenção.
- Custo Brapi, IA, cloud, suporte e pagamento.
- Custo por MAU, custo variável por pagante, margem bruta, LTV, LTV/CAC e preço ideal.
- Alertas ativos para custo por usuário, margem, retenção e aquisição.
