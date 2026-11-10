# Histórico documental de proventos — FIIs e FIAGROs

O Radar separa três famílias: **cadastro de ticker/CNPJ** (Lummios, CC BY 4.0), **patrimônio/VPA contábil** (informe mensal CVM) e **pagamentos documentados** (documento individual de anúncio/distribuição). Não se calcula dividendo ou data-com a partir de VPA ou do campo de dividend yield mensal do informe contábil.

A CVM disponibiliza informes mensais estruturados [no Portal de Dados Abertos](https://dados.cvm.gov.br/dataset/fii-doc-inf_mensal), mas esses dados **não substituem** o documento de cada distribuição.

## Fonte, formato e acesso

Entrada normalizada CSV UTF-8, com colunas obrigatórias:

```csv
ticker,cnpj,kind,ex_date,payment_date,amount_per_unit,announcement_date,source_document_id,source_url
```

As datas são ISO `AAAA-MM-DD`. `kind` é `RENDIMENTO` ou `AMORTIZACAO` e `amount_per_unit` é decimal com ponto, sem símbolo de moeda. `source_document_id` identifica o anúncio; `source_url` é um HTTPS que leva ao documento original. A mera existência do link **não prova** que seu conteúdo foi conferido: os registros permanecem com `verificationStatus=document-linked-unverified-content` até verificação adicional.

A fonte só pode ser importada caso haja permissão de leitura, processamento, armazenamento e publicação do JSON derivado. Não se usa scraping de portais com restrições, nem chaves dentro do repositório.

### Como executar

1. Em GitHub Settings → Secrets and variables → Actions, cadastrar o secret `FII_DISTRIBUTIONS_FEED_URL` com o endereço HTTPS do CSV autorizado.
2. Cadastrar as variáveis `FII_DISTRIBUTIONS_RIGHTS_CONFIRMED=true` e `FII_DISTRIBUTIONS_PUBLICATION_ALLOWED=true` **apenas depois de confirmar os direitos contratuais**.
3. Abrir Actions → **Importar historico documental de proventos FII** → Run workflow. Informar a fonte em `source_name`.

A execução produz `public/data/fii-distributions.json` e `docs/data/fii-distributions.json`, somente quando há registros elegíveis. O arquivo de entrada não é exposto no repositório.

## Regras de qualidade e histórico

- Rejeitar ticker/CNPJ divergentes do catálogo vigente; datas inválidas ou anúncio futuro; pagamento anterior à data-com; valor não positivo; ID ou URL do documento ausente;
- Eliminar duplicações exatas de uma mesma parcela econômica; colocar em quarentena documentos diferentes para a mesma parcela, **inclusive entre importações**;
- Preservar lançamentos antigos nas próximas importações; quarentenas ficam registradas até revisão;
- Exibir cada lançamento com data-com, data de pagamento **informada**, valor por cota, classe e link da fonte;
- Manter amortizações fora da soma de rendimentos e do dividend yield;
- **Não publicar nem apresentar pagamento como confirmado** apenas porque existe uma linha CSV com link; conferir documento original e situação do pagamento é uma etapa futura;
- **Não fundir automaticamente** esse arquivo com a agenda de eventos públicos, pois o estado dos registros é de conteúdo não verificado.

A interface em `/ativos/?ticker=MXRF11` mostra o histórico apenas quando a fonte autorizada estiver configurada e os registros houverem sido importados. Sem isso, mostra ausência de arquivo, nunca pagamentos fictícios.

A próxima etapa é conferir o conteúdo efetivo dos documentos, conciliar revisões, e só então publicar eventos confirmados na agenda principal.
