# Fluxo De Publicacao

## Preparacao

Endpoint:

```text
GET /admin/publication/prepare
```

Inclui apenas eventos com:

- validacao `valid` ou `warning`;
- revisao `approved`;
- publicacao `draft` ou `superseded`.

## Publicacao

Endpoint:

```text
POST /admin/publication/publish
```

Cria:

- `publication_batches`;
- `publication_batch_items`;
- `published_event_cache`.

## Garantias

- lote versionado;
- checksum;
- operador;
- ultima versao publica valida preservada;
- nenhum lote parcial deve ser consumido pelo portal;
- cache publico usa apenas `published_event_cache`.
