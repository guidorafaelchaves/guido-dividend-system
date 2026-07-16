# Portfolio Metrics Methodology

## Politica De Precisao

- Valores monetarios persistidos em centavos inteiros (`*_cents`).
- Quantidades persistidas como texto decimal para preservar casas fracionarias.
- Conversao para numero so deve ocorrer em servicos de dominio e testes.
- Arredondamento monetario deve ocorrer no limite de persistencia ou apresentacao.

## Preco Medio

Metodologia inicial: custo medio economico simples por ativo.

Formula:

```text
average_cost = open_cost_cents / open_quantity
```

Compras aumentam quantidade e custo. Vendas reduzem quantidade e reduzem custo proporcional ao preco medio anterior. Venda total zera quantidade e custo aberto. Taxas aumentam custo de compra e reduzem resultado realizado de venda quando informadas.

Esta fase ainda nao separa preco medio fiscal de custo economico. A interface deve nomear como "preco medio economico".

## Posicao

As posicoes sao derivadas das movimentacoes. Materializacao futura deve registrar versao da logica e reconciliacao.

Campos minimos:

- quantidade;
- custo aberto;
- preco medio economico;
- valor atual, quando houver cotacao;
- resultado nao realizado;
- renda recebida;
- renda provisionada;
- Yield on Cost.

## Proventos Pessoais

Formula inicial:

```text
personal_income = eligible_quantity * public_event_amount_per_unit
```

Estados:

- predicted;
- provisioned;
- confirmed;
- received;
- reconciled;
- divergent;
- canceled.

## Lacunas Conhecidas

- Impostos ainda nao automatizados.
- Bonificacao, desdobramento e grupamento foram modelados, mas exigem mais testes antes de uso em producao.
- Total Return depende de historico de cotacao confiavel.
