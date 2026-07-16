# Auditoria Do Calendario Atual

Data: 2026-07-13

## Estrutura Da Grade

Problema: a grade anterior renderizava dias simples, com ate tres marcadores de densidade e sem cabecalho de semana.
Consequencia: o usuario via atividade, mas nao entendia valor, confianca ou impacto financeiro.
Solucao proposta: transformar a grade em Calendario de Renda, com dia, eventos, valor simulado, intensidade e status.
Impacto esperado: leitura rapida de concentracao temporal e financeira.

## Legibilidade E Hierarquia

Problema: todos os dias tinham peso visual parecido.
Consequencia: dias relevantes nao se destacavam de forma suficiente.
Solucao proposta: usar camadas de data, densidade, retorno estimado e status predominante.
Impacto esperado: o usuario percebe onde a renda se concentra antes de abrir detalhes.

## Tamanho Das Celulas

Problema: celulas compactas nao suportavam informacao monetaria.
Consequencia: a grade precisava ser complementada por lista inferior.
Solucao proposta: aumentar celulas no desktop e migrar mobile para agenda.
Impacto esperado: desktop analitico e mobile mais usavel.

## Exibicao Dos Eventos

Problema: eventos apareciam como linhas com ticker, data e valor por unidade.
Consequencia: faltava traducao do dado em impacto financeiro.
Solucao proposta: cards avancados com valor estimado, retorno deste evento, quantidade estimada, datas e fonte.
Impacto esperado: cada evento passa a responder quanto, quando e com qual confianca.

## Diferenciacao De Status

Problema: status existia nos chips, mas a celula nao mostrava distribuicao.
Consequencia: confirmado, provisionado e estimado ficavam pouco perceptiveis na visao mensal.
Solucao proposta: marcas de status na celula e distribuicao de confianca abaixo do grafico acumulado.
Impacto esperado: estimativas ficam claramente separadas de eventos confirmados.

## Filtros

Problema: nao havia busca ou filtros rapidos no calendario.
Consequencia: comparar ativo, status ou evento exigia leitura manual.
Solucao proposta: busca por ativo/empresa/evento, filtros de confirmados e retorno acima de 0,5%.
Impacto esperado: exploracao mais rapida e menor carga cognitiva.

## Mobile

Problema: a grade mensal virava uma lista simples e perdia a funcao de agenda.
Consequencia: o usuario mobile precisava rolar demais para entender o periodo.
Solucao proposta: agenda como visao padrao em telas menores, mantendo alternancia para mes e linha do tempo.
Impacto esperado: experiencia otimizada para toque e leitura cronologica.

## Dados Monetarios E Capital Investido

Problema: o calendario mostrava valor por unidade, mas nao valor estimado a receber.
Consequencia: R$ 0,10 parecia abstrato para o visitante.
Solucao proposta: simulador global com capital por ativo e capital distribuido.
Impacto esperado: o usuario entende o impacto de R$ 1.000, R$ 10.000 ou outro valor.

## Data-Com, Data Ex E Pagamento

Problema: as datas apareciam em texto corrido.
Consequencia: elegibilidade e pagamento podiam se confundir.
Solucao proposta: separar data-com, data ex e pagamento nos cards avancados.
Impacto esperado: maior clareza de elegibilidade sem alterar regras financeiras.

## Continuidade Visual

Problema: grade e lista inferior pareciam blocos independentes.
Consequencia: selecionar um dia nao criava continuidade de leitura.
Solucao proposta: painel lateral do dia selecionado, grafico acumulado e comparacao no mesmo fluxo.
Impacto esperado: a pagina passa de calendario estatico para instrumento analitico.
