# Testes Do Calendario De Renda

Data: 2026-07-13

## Testes Automatizados

Arquivo:

```text
tests/calendar-analytics.test.mjs
```

Cobertura:

- retorno do evento sobre preco atual;
- retorno sobre preco medio;
- quantidade estimada;
- valor estimado;
- capital por ativo;
- capital distribuido;
- evento sem preco;
- evento sem valor;
- preco zero;
- capital zero;
- evento extraordinario;
- resumo do periodo;
- resumo do dia;
- renda acumulada;
- filtro por busca, status e retorno minimo.

## Testes Visuais Recomendados

- Mes sem eventos.
- Mes com muitos eventos.
- Dia com um evento.
- Dia com muitos eventos.
- Ativo sem preco atual.
- Evento sem valor por unidade.
- Dados estimados e projetados.
- Mobile em agenda.
- Zoom de 200%.
- Movimento reduzido.
- Conexao lenta.

## Comandos

```text
node --check public/platform/calendarAnalytics.js
node --check public/platform/portal.js
npm.cmd test
```
