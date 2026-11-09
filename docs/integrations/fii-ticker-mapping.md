# Vínculo CNPJ/Código B3 para os FIIs

## Pipeline diário

1. Atualizar catálogo de dados abertos da CVM (`cvm-catalog.json`).
2. Extrair os informes mensais de FIIs de 2026 (`cvm-fii-metrics.json`), por CNPJ e competência.
3. Consultar o catálogo CSV público da Lummios para o cruzamento de ticker e CNPJ (licença CC BY 4.0; **não** é API paga).
4. Gerar `cvm-fii-by-ticker.json` somente com vínculos exatos, CNPJs validados, classe `fii` e sem identidades ambíguas.
5. Copiar o resultado para as pastas `public/data` e `docs/data` quando disponível.

Fonte cadastral: https://developers.lummios.com.br/dados-abertos.html
Licença do cadastro: https://creativecommons.org/licenses/by/4.0/
**Atribuição obrigatória:** Dados de identificação ticker/CNPJ: Lummios, CC BY 4.0.

## Limitações que permanecem

- O vínculo não foi confirmado com lista oficial de instrumentos/ISIN da B3.
- O arquivo da CVM é contábil, não fornece preço nem rendimento distribuído.
- Não extrapolar P/VP, dividend yield ou proventos com esses arquivos.
- FII com mais de um ticker associado ao mesmo CNPJ é colocado em quarentena, pois pode haver classes distintas.
- A data representa a competência do informe, não sua data de disponibilização.
- O pipeline pode falhar se o fornecedor CSV mudar o esquema ou ficar indisponível. Nesse caso, preserva o JSON anterior, e os fundos sem correspondência aparecem como indisponíveis.
- GitHub publicado e domínio chatgpt.site são infraestruturas distintas; não afirmar que aquele domínio foi atualizado sem inspecioná-lo.

## Frontend

`public/platform/cvmFiiAssetPanel.js` mostra apenas dados contábeis e fonte/licença na ficha do ativo, quando existir um vínculo validado em `/data/cvm-fii-by-ticker.json`. Não substitui valores de preço, DY ou ranking existentes.

## Próximo requisito antes de produzir P/VP

Obter ligação ticker ↔ ISIN ↔ classe de fundo e usar o valor patrimonial por cota correto da mesma classe, assim como fechamento autorizado, com data posterior à divulgação do informe.

## Primeira execução bem-sucedida — 09/11/2026

O fluxo independente confirmou 1.172 linhas cadastrais, 532 FIIs, 527 pares ticker/CNPJ aceitos e 357 vínculos com métricas CVM. Trinta e cinco CNPJs com múltiplos tickers foram excluídos por ambiguidade. Resultado publicado em `public/data/cvm-fii-by-ticker.json` e `docs/data/cvm-fii-by-ticker.json`.

## VPA conciliado — execução 09/11/2026

A execução GitHub Actions 42566859892 concluiu os 7 testes do parser, extraiu o arquivo de 2026 da CVM e refez o vínculo ticker/CNPJ.

Cobertura verificada:
- 1.427 fundos na base contábil; 904 com VPA validado.
- 357 tickers de FII vinculados por CNPJ; 302 com VPA validado.
- Exemplo de setembro/2026: MXRF11 R$ 9,352547, HGLG11 R$ 165,476630, KNRI11 R$ 163,639521.

A regra do VPA exige que PL / cotas emitidas coincida, com tolerância de 2%, com `Valor_Patrimonial_Cotas` do informe CVM da mesma competência; divergências de PL/cotas entre arquivos da mesma competência bloqueiam a publicação daquele VPA. Campos vazios não são estimados.

O painel do ativo pode mostrar o VPA quando `navValidated=true`. Não calcula P/VP sem preço de fechamento de origem autorizada e sem garantir cronologia da publicação do informe.

## Motor P/VP indicativo — 09/11/2026

O novo `public/platform/fiiPvp.js` calcula `precoFechamento / navCalculated` apenas quando `navValidated=true`, o ticker coincide, a cotação provém de `published-d1` (feed licenciado) ou `b3-official-file` (arquivo importado pelo usuário), a data do fechamento está entre 1 e 7 dias antes da data corrente (São Paulo), e não é anterior à competência contábil.

O painel `cvmFiiAssetPanel.js` consulta o `DividendMarketGateway` e mostra o P/VP com ambas as datas e fontes. Não aceita CSV manual genérico nem cache legado para calcular P/VP. O cálculo é **indicativo**, sem alegar que a competência seja a data de publicação do documento; não serve para backtesting histórico.

O workflow de testes `fii-pvp-check.yml` executou os 7 testes com sucesso em https://github.com/guidorafaelchaves/guido-dividend-system/actions/runs/42567296904. Evidência em `public/data/fii-pvp-test-status.json`. A publicação de cotações B3 D-1 permanece condicionada a fonte autorizada; sem ela, o indicador fica indisponível, a menos que o usuário importe um arquivo COTAHIST B3 oficial no sistema.

A hospedagem `dividend-system-next.guidorafaelchaves.chatgpt.site` não foi comprovadamente ligada a este repositório; mudanças GitHub não certificam o domínio público.
