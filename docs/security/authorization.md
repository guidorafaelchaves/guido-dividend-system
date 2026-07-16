# Authorization

- Dados privados exigem Bearer token valido.
- Rotas admin exigem papel `admin` ou `owner`.
- Favoritos, watchlists, alertas e carteiras filtram por `user_id`.
- Debug endpoints retornam 404 em `ENVIRONMENT=production`.

## Testes Pendentes

- Suite automatizada de IDOR.
- Tentativa de acesso cruzado com dois usuarios.
- Escalada de papel por payload malicioso.
