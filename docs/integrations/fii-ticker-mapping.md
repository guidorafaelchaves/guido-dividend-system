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
