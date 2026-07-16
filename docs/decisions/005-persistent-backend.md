# ADR 005 - Backend Persistente Da Plataforma

## Contexto

A Fase 2 precisa adicionar conta gratuita, watchlist, favoritos, alertas, carteiras, planos e auditoria sem romper o Dividend System legado. O repositorio atual e estatico no frontend, usa GitHub Pages/`docs`, possui Workers Cloudflare para Admin FinOps e SaaS Gateway, e ja contem migrations D1 administrativas.

## Alternativas Consideradas

- Migrar tudo para framework full-stack.
- Usar Supabase direto no frontend.
- Usar Firebase.
- Manter frontend estatico e criar API propria serverless.
- Usar apenas localStorage/IndexedDB.

## Escolha

Manter frontend estatico e criar um Worker Cloudflare separado, `workers/platform-api`, usando D1 como banco persistente.

## Justificativa

- Menor risco de ruptura do dashboard legado.
- Compatibilidade com GitHub Pages e Cloudflare Pages.
- Aproveita stack ja presente no repositorio.
- Mantem segredos e regras de autorizacao no backend.
- Custo inicial baixo e reversibilidade boa.
- Permite evoluir para Workers, Queues, Cron Triggers e observabilidade sem reescrever o portal.

## Custos

- D1 e Workers adicionam configuracao de ambiente.
- Autenticacao propria exige cuidado com senha, sessao, reset e auditoria.
- GitHub Pages puro nao fornece backend; ambiente de producao precisa apontar para a API Worker.

## Riscos

- Auth propria nao substitui um provedor maduro em longo prazo.
- Envio de e-mail depende de integracao posterior.
- D1 precisa de migrations disciplinadas para evitar divergencia entre ambientes.
- CORS e URLs devem ser configurados por ambiente.

## Consequencias

- `platform-api` vira fonte de verdade para dados privados.
- Frontend publico continua aberto.
- Recursos privados usam Bearer token emitido pelo Worker.
- O Admin FinOps existente permanece separado.

## Estrategia De Migracao

1. Criar schema D1 canonico de produto.
2. Criar endpoints de auth, perfil, watchlist, favoritos, alertas e carteiras.
3. Conectar frontend privado a API.
4. Migrar motores financeiros para servicos testaveis.
5. Adaptar o dashboard legado para consumir servicos compartilhados quando seguro.

## Reversibilidade

A decisao e reversivel porque o frontend estatico e o dashboard legado permanecem intactos. O Worker novo pode ser substituido por Supabase, Firebase ou API propria mantendo contratos REST semelhantes.
