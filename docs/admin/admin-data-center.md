# Central Administrativa De Proventos

Data: 2026-07-13

## Papel

A Central Administrativa governa a informacao financeira exibida ao publico. Ela recebe arquivos B3, sincroniza dados Brapi pelo backend, normaliza, deduplica, concilia, revisa e publica eventos canonicos.

## Regra Principal

Importar, sincronizar ou detectar nao significa publicar.

Estados separados:

- ingestao: `queued`, `processing`, `processed`, `failed`;
- validacao: `unvalidated`, `valid`, `warning`, `invalid`, `blocked`;
- revisao: `pending_review`, `approved`, `rejected`;
- publicacao: `draft`, `published`, `archived`, `superseded`;
- financeiro: `announced`, `provisioned`, `confirmed`, `estimated`, `projected`, `paid`, `cancelled`.

## Rotas

- `/admin/`
- `/admin/proventos/`
- `/admin/importacoes/`
- `/admin/importacoes/nova/`
- `/admin/brapi/`
- `/admin/eventos/`
- `/admin/revisao/`
- `/admin/publicacao/`
- `/admin/ativos/`
- `/admin/fontes/`
- `/admin/qualidade/`
- `/admin/jobs/`
- `/admin/auditoria/`
- `/admin/finops/`
- `/admin/seguranca/`
- `/admin/configuracoes/`

## Backend

Endpoints principais no `platform-api`:

- `GET /admin/data-center`
- `POST /admin/imports/b3/detect`
- `POST /admin/imports/b3`
- `GET|POST /admin/brapi/plan`
- `GET /admin/events`
- `POST /admin/events/approve`
- `GET /admin/publication/prepare`
- `POST /admin/publication/publish`
- `GET /public/events`
