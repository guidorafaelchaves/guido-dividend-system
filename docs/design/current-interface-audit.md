# Auditoria Visual Da Interface Atual

Data: 2026-07-13.

Escopo: home, catalogo, detalhe de ativo, calendario, mapa da renda e rotas privadas iniciais do Radar de Proventos.

## Diagnostico

### Hierarquia Visual

Problema: o hero abre com texto institucional e metricas pequenas, mas nao demonstra a experiencia do produto.

Consequencia: o visitante entende que ha uma plataforma, mas nao enxerga em cinco segundos o fluxo temporal de pagamentos.

Correcao: introduzir o `Radar Temporal de Proventos` na primeira dobra, com eventos posicionados no tempo, valor, status e distancia humana.

### Mensagem

Problema: a headline "Dividendos com metodo, fonte e status claro" descreve atributo interno.

Consequencia: a proposta parece tecnica e nao cria imagem mental de beneficio.

Correcao: trocar para uma frase orientada ao usuario: "O futuro da renda passiva, organizado por data."

### Prova Visual

Problema: a home usa cards simples com texto corrido.

Consequencia: o usuario precisa imaginar como o produto funciona.

Correcao: mostrar uma mini experiencia funcional com busca, proximos eventos, status, fonte, calendario compacto e simulador.

### Densidade E Espaco

Problema: os elementos atuais estao corretos, mas todos possuem peso visual semelhante.

Consequencia: CTA, metricas, status e aviso competem entre si.

Correcao: criar camadas: fundo atmosferico, camada de dados, conteudo principal. CTA principal deve ter maior peso; acesso legado deve ficar secundario.

### Navegacao

Problema: `Admin` aparece como item publico principal.

Consequencia: a narrativa comercial fica contaminada por operacao interna.

Correcao: manter acesso administrativo no footer/rotas, mas remover da navegacao publica principal.

### Cards De Eventos

Problema: cards e linhas de evento usam frases longas.

Consequencia: ticker, valor, data e status nao sao lidos instantaneamente.

Correcao: redesenhar card com ticker, tipo, valor por unidade, data, contagem humana, status e fonte.

### Calendario E Mapa

Problema: calendario e mapa sao listas/grade simples.

Consequencia: nao parecem protagonistas de produto.

Correcao: criar calendario termico discreto, fluxo mensal e pergunta guia em cada visualizacao.

### Movimento

Problema: nao ha assinatura visual de tempo/fluxo.

Consequencia: a experiencia nao reforca o conceito de radar temporal.

Correcao: adicionar animacoes CSS leves, parallax minimo via CSS/JS, contadores pontuais e respeitar `prefers-reduced-motion`.

### Responsividade

Problema: mobile comprime a mesma composicao.

Consequencia: hero e tabelas perdem prioridade.

Correcao: mobile deve priorizar busca, radar em trilha vertical, cards horizontais e agenda compacta.

### Acessibilidade

Problema: status depende muito de cor e nao possui tooltips/labels explicativos.

Consequencia: usuarios podem nao entender diferenca entre confirmado, provisionado, estimado e projetado.

Correcao: status com texto, contraste, foco visivel e microcopy de metodologia.

## Conclusao

A base atual e funcional, mas a percepcao de valor ainda esta abaixo do produto. O redesign deve transformar a primeira dobra em uma demonstracao viva e reorganizar a narrativa publica em torno de `Ativo + Tempo + Fluxo`.
