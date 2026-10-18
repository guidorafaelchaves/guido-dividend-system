# Testes Da Central Administrativa

## Automatizados

Arquivo:

```text
tests/admin-data-center.test.mjs
```

Verifica:

- tabelas canonicas da migration;
- rotas admin do Worker;
- rota publica `/public/events`;
- ausencia de campos de token no admin legado;
- presenca da central no portal;
- uso de `publishedEventRepository`.

## Recomendados Para Producao

- CSV valido;
- cabecalhos alternativos;
- decimal brasileiro;
- arquivo duplicado;
- arquivo vazio;
- evento cancelado;
- ativo nao encontrado;
- erro Market 401;
- erro Market 429;
- timeout;
- lote de 20 ativos;
- divergencia de data;
- divergencia de valor;
- lote bloqueado;
- rollback;
- upload malicioso;
- tentativa de publicacao sem permissao.
