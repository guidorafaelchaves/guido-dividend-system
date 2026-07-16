# Phase 2 Baseline

Auditoria factual capturada em 2026-07-13 antes da implementacao da Fase 2.

## Estado Do Repositorio

- Branch ativa: `main`
- Ultimo commit remoto/local: `389b872 Fix authorized Brapi price refresh coverage`
- Worktree antes da Fase 2: contem alteracoes da Fase 1 ainda nao commitadas.
- `npm run check`: passa.
- Lint dedicado: inexistente.
- Build dedicado: inexistente; o projeto e estatico.
- Testes automatizados: inexistentes antes desta fase.

## Funcionalidades Concluidas

- Portal publico inicial em `public/index.html`.
- Espelho para GitHub Pages em `docs/index.html`.
- Catalogo publico de ativos em `/ativos/`.
- Paginas estaticas de detalhe para tickers demo.
- Calendario publico em `/calendario/`.
- Mapa da Renda em `/mapa-da-renda/`.
- Ponte preservada para o legado em `/sistema/` e `dashboard.html#sistema`.
- Admin FinOps legado preservado em `admin.html`.
- Feature flags publicas em `public/platform/domain.js`.
- Modelo canonico inicial de ativos e eventos em `public/platform/domain.js`.
- Gateway BRAPI preparado no frontend e Worker `workers/saas-gateway`.

## Funcionalidades Parcialmente Concluidas

- Painel administrativo publico: existe como console inicial, mas ainda nao gerencia usuarios/planos/assinaturas.
- Integracao BRAPI: existe, mas ainda depende de fluxos separados e nao grava dados canonicos persistentes da plataforma.
- Persistencia: IndexedDB/localStorage no legado e D1 administrativo; ainda faltava banco de usuarios/produto.
- Autenticacao: existe Admin FinOps e gateway Supabase para SaaS, mas nao havia conta gratuita propria da plataforma.

## Funcionalidades Inexistentes Antes Desta Fase

- Cadastro e login de usuario final.
- Perfis e preferencias de conta.
- Favoritos persistentes por usuario.
- Watchlist persistente por usuario.
- Calendario personalizado.
- Alertas basicos.
- Notificacoes internas.
- Carteiras pessoais.
- Movimentacoes pessoais.
- Calculo central de preco medio fora da UI legada.
- Entitlements por plano.
- Assinaturas modeladas para produto final.
- Auditoria de acoes criticas do usuario final.
- Observabilidade operacional da plataforma de usuario.

## Riscos E Dividas Tecnicas

- `dashboard.html` concentra muitos motores e UI em um arquivo grande.
- A Fase 1 criou rotas estaticas por copia de shell HTML; isso funciona em GitHub Pages, mas exige sincronizacao.
- O portal da Fase 1 usa fixtures demonstrativos; ainda nao e fonte de verdade.
- Links absolutos com `/` funcionam no dominio raiz, mas podem exigir ajuste se publicado em subpath do GitHub Pages.
- Textos antigos tem sinais de encoding misto em alguns arquivos historicos.
- Nao havia teste de regressao para motores financeiros.

## Bloqueadores

- Nenhum bloqueador tecnico imediato para criar backend reversivel em Cloudflare Workers + D1.
- Provedor definitivo de cobranca nao definido; sera criada abstracao sem cobrar de verdade.
- Envio de e-mail nao configurado; recuperacao de acesso sera modelada por token backend, sem envio externo automatico.

## Decisoes Temporarias

- Manter frontend estatico.
- Criar Worker separado `platform-api` para conta, persistencia e produto, sem misturar com `admin-api`.
- Usar D1 como persistencia inicial porque o repo ja usa Cloudflare Workers/D1.
- Usar valores financeiros em centavos inteiros e quantidades como texto decimal para evitar float critico.

## Divergencias Entre Documentacao E Codigo

- A documentacao falava em plataforma publica ampla, mas o codigo real ainda era majoritariamente portal estatico e dashboard legado.
- Havia mencao a auth moderna, mas conta gratuita de usuario final ainda nao existia no codigo.
- Havia modelo canonico de ativos/eventos, mas sem banco persistente da plataforma.
