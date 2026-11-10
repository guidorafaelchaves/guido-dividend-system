# Reconciliação de instrumentos B3 — execução controlada

O catálogo público contém **498 candidatos FII e 29 FIAGROs** identificados por fonte de terceiros, não uma lista oficial de cotas ativas.

## Fonte e direitos

- A B3 publica cadastro de instrumentos negociáveis e especificação de instrumentos listados; contudo, a interface do Hub de Dados Públicos proíbe coleta automatizada. Não foi implementado scraping.
- É obrigatório obter o arquivo por via permitida, com direitos expressos de processamento, armazenamento e publicação de resultado derivado.
- Os campos de autorização são deliberadamente separados das permissões de cotações D-1.
- Nunca colocar credenciais ou arquivo bruto com restrição de distribuição no Git público.

Referências:
- https://www.b3.com.br/pt_br/dados/hub-de-dados-publicos/
- https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/boletins-diarios/pesquisa-por-pregao/

## Esquema normalizado exigido

O pipeline **não interpreta automaticamente o arquivo bruto oficial**, pois layouts podem variar.
O fornecedor autorizado ou um processo de transformação licenciado deve entregar CSV UTF-8:

```csv
ticker,isin,instrument_type,trading_status
ABCD11,BRABCDEFGHI0,FII,ACTIVE
```

A linha acima é **apenas ilustrativa**, não é evidência de negociação.
O ISIN tem que cumprir o dígito verificador ISO 6166; os valores de `instrument_type` são `FII` ou `FIAGRO`, e os de `trading_status` são `ACTIVE` ou `INACTIVE`.
O título/código deve ser identificado pelo arquivo autorizado, não inferido por nome. A data do snapshot é parâmetro independente.

## Ativação manual GitHub Actions

Workflow `.github/workflows/b3-instrument-reconciliation.yml` → **Run workflow** com data do arquivo (AAAA-MM-DD) e identificação da fonte.

Configurar antes:
1. Secret `B3_INSTRUMENTS_FEED_URL`: URL HTTPS do CSV normalizado autorizado.
2. Variable `B3_INSTRUMENTS_RIGHTS_CONFIRMED=true`: licença permite tratar/guardar resultados.
3. Variable `B3_INSTRUMENTS_PUBLICATION_ALLOWED=true`: licença permite publicar o JSON derivado.

Sem esses três requisitos, a execução falha fechada. Não há captura automática de conteúdo B3.

## Saída e interpretação

`public/data/fii-b3-reconciliation.json` (espelhado para `docs/data`):
- `observed-active`: arquivo autorizado registra instrumento ativo **naquela data**; não prova negociação efetiva, volume ou liquidez;
- `observed-inactive`: arquivo registra instrumento inativo naquela data;
- `ambiguous`: registros conflitantes ou inválidos;
- `class-conflict`: FIAGRO/FII divergentes entre as fontes;
- `unverified`: ausente do snapshot ou ainda não verificado. **Não significa deslistado.**

Cada resultado tem fonte, data, resumo e SHA-256 do arquivo de entrada para auditoria. O arquivo bruto não é republicado.
A interface `/ativos/` usa apenas essa evidência, sem inventar cotações e sem alterar proventos, patrimônio ou P/VP.

### Atualização futura

Uma vez autorizado o acesso, pode-se agendar a execução por dia útil e implementar um adaptador específico ao layout efetivo do fornecedor; não assumir compatibilidade com B3 antes de testá-lo.
