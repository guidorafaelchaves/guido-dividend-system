# Metodologia De Retornos Do Calendario

Data: 2026-07-13

## Retorno Deste Evento Sobre O Preco Atual

Formula:

```text
retornoDoEvento = valorPorUnidade / precoAtual * 100
```

Exemplo:

```text
R$ 0,10 / R$ 10,20 = 0,98%
```

Rotulo usado na interface:

```text
Retorno deste evento sobre preco atual
```

Esse percentual nao e Dividend Yield anual, nao inclui variacao de preco, impostos, custos, reinvestimento ou garantias de recebimento.

## Retorno Sobre Preco Medio

Formula para usuario autenticado:

```text
retornoSobreCusto = valorPorUnidade / precoMedio * 100
```

Esse calculo so deve aparecer quando houver preco medio matematicamente valido.

## Eventos Sem Preco Ou Valor

- Sem preco atual: nao exibir percentual.
- Sem valor por unidade: nao estimar renda.
- Preco zero ou negativo: retornar `null` para percentual.
- Valor negativo: nao projetar como renda positiva.

## Renda Acumulada

Para ativo:

```text
retornoAcumulado = somaDosValoresPorUnidade / precoDeReferencia * 100
```

Para carteira:

```text
retornoDaCarteira = rendaTotalProjetada / capitalTotal * 100
```

Percentuais isolados de ativos diferentes nao devem ser somados como se fossem diretamente comparaveis.
