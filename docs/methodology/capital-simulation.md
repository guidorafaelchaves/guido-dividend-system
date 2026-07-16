# Metodologia De Simulacao De Capital

Data: 2026-07-13

## Modos

### Capital Por Ativo

O mesmo capital e aplicado individualmente a cada ativo.

Uso principal: comparacao.

Exemplo: quanto R$ 10.000 em cada ativo gerariam no proximo evento.

### Capital Distribuido

O capital total e dividido entre os ativos exibidos.

Uso principal: simulacao de carteira hipotetica.

Exemplo: como R$ 10.000 distribuidos entre os ativos selecionados poderiam gerar renda no periodo.

## Quantidade Estimada

Formula:

```text
quantidade = capitalSimulado / precoAtual
```

Por padrao, a UI permite quantidade fracionaria para simulacao educacional. Regras futuras por classe de ativo devem definir arredondamento especifico.

## Valor Estimado Do Evento

Formula:

```text
valorEstimado = quantidade * valorPorUnidade
```

Rotulo:

```text
R$ 98,00 brutos estimados
```

## Transparencia

Todo valor simulado deve ser tratado como bruto, estimado e informacional. Nao inclui impostos, custos, variacao de preco, elegibilidade real ou confirmacao futura.
