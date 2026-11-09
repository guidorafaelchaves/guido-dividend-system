# Radar: sincronização diária CVM + B3 D-1

## Rotina no repositório

Workflow: `.github/workflows/radar-eod.yml`.
Horário: **08h de Brasília, segunda a sexta-feira** (`0 11 * * 1-5` UTC).
O GitHub Actions pode atrasar o início agendado.

1. `scripts/refresh-cvm-catalog.mjs`: consulta a API CKAN oficial da CVM, valida os recursos HTTPS e salva `public/data/cvm-catalog.json`.
   Conjuntos: cadastro de companhias abertas, DFP, ITR e informes mensais de FII. O arquivo registra **metadados e URLs dos relatórios**, não valores financeiros calculados.
2. `scripts/refresh-radar-eod.mjs`: somente se houver feed HTTPS autorizado e licença confirmada, valida um lote de fechamentos B3 **do pregão anterior**, e salva `public/data/radar-eod.json`.
3. Commit dos JSONs alterados, sem sobrescrever último fechamento em caso de falha.
4. Cotações não são inventadas, e catálogo CVM não é apresentado como provento ou cotação.

## Pré-requisitos da etapa B3 — ainda pendente

- Secret GitHub Actions `RADAR_EOD_FEED_URL`: URL HTTPS de fornecedor autorizado com JSON.
- Secret opcional `RADAR_EOD_FEED_TOKEN`: bearer token.
- Variável GitHub Actions `RADAR_EOD_PUBLICATION_ALLOWED=true`: somente após a licença permitir publicação/redistribuição.
- Caso ausentes, **o workflow atualiza apenas a CVM**; o passo B3 é omitido.

Contrato esperado pelo parser B3:

```json
{
  "source": "Fornecedor autorizado",
  "tradeDate": "2026-11-06",
  "quotes": [{"ticker": "ABCD3", "close": 10.50, "volume": 100000}]
}
```

O exemplo é fictício. Em produção, o lote deve conter pelo menos dez ativos distintos, com preços positivos, sem datas futuras e com antiguidade de 1 a 7 dias corridos. Uma data anterior pode refletir feriados/finais de semana, portanto os clientes devem mostrar a **data efetiva do pregão**, não presumir atualização diária das cotações.

## Limites atuais

- CVM: nesta primeira etapa, coleta-se catálogo/metadados, não extração de ZIPs nem valores patrimoniais. Isso ainda não atualiza indicadores ou proventos do Radar.
- B3: inexiste URL autorizada configurada, e o arquivo de fechamentos não é produzido até ativação. Distribuição D-1 não significa acesso gratuito às fontes.
- Os novos JSONs são publicados **no repositório**. Falta confirmar se a hospedagem `dividend-system-next.guidorafaelchaves.chatgpt.site` é derivada dele. Sem essa confirmação, a atualização no endereço do usuário não está comprovada.
- O frontend ainda não consome esses arquivos. A integração visual requer acesso ao código/deploy exato.

Fontes oficiais:
- https://dados.cvm.gov.br/dataset/fii-doc-inf_mensal
- https://dados.cvm.gov.br/api/3/action/package_show?id=fii-doc-inf_mensal
- https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/distribuidores/perguntas-frequentes/
