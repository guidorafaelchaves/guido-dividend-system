# Phase 3 Baseline

Capturado em 2026-07-13.

## Commit Base

- Branch: `main`
- Commit base: `389b872 Fix authorized Brapi price refresh coverage`
- Estado: mudancas das Fases 1 e 2 ainda pendentes no worktree.

## Comandos Executados

- `node --check workers/platform-api/src/index.js`: passou.
- `npm.cmd run check`: passou.
- `npm.cmd test`: passou.
- `npm.cmd audit --audit-level=moderate`: 0 vulnerabilidades.
- `npx.cmd wrangler --version`: 4.110.0.
- `npx.cmd wrangler whoami`: autenticado em `guidorafaelchaves@gmail.com`.
- `npx.cmd wrangler d1 list`: apenas `radar-admin-finops` existia antes da Fase 3.

## Funcionalidades Reais Antes Da Fase 3

- Worker `platform-api` localmente validado.
- Frontend privado estruturado.
- Auth backend estrutural.
- Migration ampla escrita, ainda nao aplicada remotamente.

## Funcionalidades Apenas Estruturadas

- E-mail transacional.
- Billing.
- Jobs automaticos.
- Sync BRAPI canonico.
- Smoke tests remotos.

## Servicos Externos Ausentes No Inicio

- D1 da plataforma.
- `SESSION_SECRET` remoto.
- Provider de e-mail.
- Provider de cobranca sandbox.
- Token BRAPI para sync job.

## Variaveis/Secrets Exigidos

- `SESSION_SECRET` obrigatorio.
- `BRAPI_TOKEN` opcional para sync.
- `EMAIL_API_KEY` opcional, gated por `EMAIL_ENABLED`.
- `BILLING_WEBHOOK_SECRET` opcional, gated por `BILLING_ENABLED`.

## Riscos Encontrados

- Cadastro remoto retornou Cloudflare 1101 na primeira versao operacional.
- Causa mitigada: cadastro foi alterado de `DB.batch` grande para escritas sequenciais; smoke remoto passou.
- PBKDF2 ficou configuravel por ambiente para controlar custo em Workers.

## Plano De Execucao

1. Provisionar D1 preview.
2. Aplicar migrations.
3. Deployar Worker preview.
4. Configurar `SESSION_SECRET`.
5. Rodar smoke tests remotos.
6. Validar jobs e health checks.
7. Documentar pendencias de e-mail, billing e BRAPI token.
