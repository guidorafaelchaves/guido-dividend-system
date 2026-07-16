# Sincronizacao Brapi FIIs

## Regra De Seguranca

A Brapi nunca e chamada pelo frontend. O token fica apenas como secret do Worker.

O navegador pode ver:

```text
Token configurado
Final: ****7H2K
```

Nunca pode ver o token completo.

## Job

Job canonico:

```text
sync_brapi_fii_events
```

Caracteristicas:

- idempotente;
- lotes configuraveis;
- cursor;
- retry/backoff;
- checkpoint;
- logs;
- resumo final.

## Planejamento De Lotes

Endpoint:

```text
GET|POST /admin/brapi/plan
```

Retorna ativos, tamanho do lote, chamadas estimadas, lotes e estado mascarado do token.

## Publicacao

Eventos Brapi entram como fonte `brapi`, passam por conciliacao e revisao. Nao publicam automaticamente quando ha divergencia com B3.
