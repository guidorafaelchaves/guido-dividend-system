# Current State Baseline

Baseline capturado em 2026-07-13 antes da primeira camada publica do Dividend System.

## Git

- Branch: `main`
- Ultimo commit: `389b872 Fix authorized Brapi price refresh coverage`
- Estado inicial: worktree limpo apos clone
- Repositorio clonado em: `Dividend System/guido-dividend-system`

## Estrutura Inicial

```text
README.md
STRATEGY.md
DEPLOY.md
package.json
public/
  index.html
  dashboard.html
  admin.html
  authService.js
  configManager.js
  memory-client.js
  saasGatewayClient.js
docs/
  index.html
  dashboard.html
  admin.html
  SAAS_ARCHITECTURE.md
workers/
  admin-api/
  saas-gateway/
supabase/
apps-script/
```

## Runtime e Scripts

- Package manager detectado: npm
- Dependencia de desenvolvimento: `serve`
- Scripts:
  - `npm run start`: serve `public`
  - `npm run dev`: serve `public`
  - `npm run check`: valida presenca de entrada, dashboard e admin
  - `npm run admin:dev`, `admin:migrate`, `admin:deploy`
  - `npm run saas:deploy`

## Build, Teste e Lint

- Build dedicado: nao existe; projeto e estatico.
- Teste/check atual: `npm run check`.
- Lint dedicado: nao existe.
- Resultado inicial de `npm run check`: OK.

## Deploy

- `public/` e a origem local de desenvolvimento.
- `docs/` espelha arquivos para GitHub Pages.
- Workers:
  - `workers/admin-api`: backend seguro do Admin FinOps.
  - `workers/saas-gateway`: gateway para BRAPI sem expor token no frontend publico.

## Rotas e Superficies Existentes

- `/index.html`: entrada anterior de login seguro.
- `/dashboard.html#sistema`: sistema legado privado preservado.
- `/admin.html`: Admin FinOps existente.
- `docs/` contem copia para GitHub Pages.

## Storage e Integracoes

- Dashboard usa IndexedDB como memoria principal e localStorage leve/fallback.
- Configuracoes administrativas usam Web Crypto/IndexedDB quando disponivel.
- BRAPI existe no dashboard legado e tambem via `workers/saas-gateway`.
- Token BRAPI nao deve ser exposto no portal publico.

## Riscos Observados

- Aplicacao principal ainda concentra muita logica em `dashboard.html`.
- Nao ha suite automatizada de rotas publicas.
- Rotas limpas em GitHub Pages exigem arquivos `index.html` por diretorio ou fallback de servidor.
- Parte do texto historico aparece com mojibake em alguns arquivos, indicando mistura de encoding em entregas anteriores.
