# Redesign Do Calendario De Renda

Data: 2026-07-13

## Conceito

O calendario foi reposicionado como Calendario de Renda: uma experiencia que combina data, capital investido, rendimento por unidade e confianca do evento.

## Estrutura Entregue

- Cabecalho analitico com eventos, ativos, dias de pagamento, retorno medio, simulacao e confianca.
- Simulador global com capital rapido, valor personalizado, capital por ativo e capital distribuido.
- Grade mensal com intensidade financeira, valor estimado e distribuicao de status.
- Painel do dia selecionado com cards avancados de evento.
- Visao agenda para leitura cronologica, especialmente no mobile.
- Linha do tempo para proximidade dos pagamentos.
- Grafico de renda acumulada no periodo.
- Distribuicao de renda confirmada, provisionada e estimada.
- Comparacao tabular entre eventos.
- Bloco de calendario pessoal com ponte para watchlist, carteira e metas.

## Componentes Implementados

- `CalendarHeader`
- `CapitalSimulator`
- `CalendarToolbar`
- `CalendarMonthGrid`
- `CalendarDayCell`
- `CalendarDayPanel`
- `CalendarEventCard`
- `CalendarEventComparison`
- `CalendarAgendaView`
- `CalendarTimelineView`
- `IncomeAccumulationChart`
- `ConfidenceDistribution`
- `PortfolioCalendarToggle`
- `CalendarNarrative`

## Decisoes Visuais

- Intensidade financeira usa preenchimento sutil, barra inferior e marcas de status.
- Eventos estimados permanecem rotulados e visualmente menos solidos.
- O painel do dia fica sticky no desktop e vira fluxo empilhado no mobile.
- A agenda e a linha do tempo reaproveitam os mesmos dados calculados pelo servico de dominio.

## Limites Preservados

- Nenhuma regra de autenticacao, banco, API, RBAC ou publicacao foi alterada.
- Percentuais sao apresentados como retorno deste evento sobre preco atual.
- Valores estimados sao brutos e informacionais.
- O calendario pessoal foi demonstrado na interface, mas continua dependente da area autenticada para posicoes reais, preco medio, metas e conciliacao.
