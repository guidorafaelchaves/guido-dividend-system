# Seguranca De Secrets Administrativos

## Regra

Nenhum secret fica no frontend, IndexedDB, localStorage ou bundle publico.

Tokens Brapi, OpenAI e equivalentes devem ficar como Worker secrets ou armazenamento backend protegido.

## Interface

A UI pode exibir apenas:

```text
Token configurado
Final: ****7H2K
Atualizado em 13/07/2026
```

## Correção Feita

O `public/admin.html` legado deixou de conter campos de token. Ele agora encaminha para `/admin/` e informa que credenciais nao sao salvas no navegador.
