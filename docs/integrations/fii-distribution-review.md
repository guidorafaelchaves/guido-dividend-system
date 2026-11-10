# Revisão humana e publicação de anúncios de proventos

## Objetivo
Não transformar um registro importado com link em "evento confirmado" sem conferência do documento de origem. A conferência deve comparar documento original, ticker, CNPJ, espécie, data-com, pagamento informado e valor por cota.

## Entrada de revisão
Arquivo CSV **privado**, não hospedado no repositório público, com colunas exatas:

```csv
ticker,cnpj,kind,ex_date,payment_date,amount_decimal,source_document_id,decision,reviewer,reviewed_at,evidence_note
```

`decision`: `APPROVED`, `REJECTED` ou `CANCELLED`. O campo `reviewer` deve ser um **identificador funcional/alias**, não nome ou contato pessoal, pois a trilha derivada poderá ser publicada. `reviewed_at` é data ISO. `evidence_note` documenta o que foi conferido. Todos os campos econômicos e o ID da fonte devem coincidir exatamente com `public/data/fii-distributions.json`.

A planilha de revisão não deve conter dados pessoais, credenciais, informações bancárias nem dados não autorizados para publicação.

## Fluxo GitHub Actions
1. Importar arquivo licenciado de distribuições no workflow `fii-distributions-import.yml`.
2. Um operador confere **cada documento original** e registra sua decisão na planilha CSV privada.
3. Configurar secret `FII_REVIEW_CSV_URL` com URL HTTPS de acesso restrito à planilha.
4. Configurar variáveis `FII_REVIEW_ATTESTATION_CONFIRMED=true` e `FII_REVIEW_PUBLICATION_ALLOWED=true` **somente** se houver revisão real e autorização de publicação.
5. Disparar manualmente `.github/workflows/fii-distribution-review.yml` no GitHub Actions.

A saída `public/data/fii-reviewed-events.json` é espelhada em `docs/data`; a planilha privada não é adicionada ao Git.

## Semântica e segurança
- `APPROVED` significa **anúncio documental conferido**, não transferência/liquidação financeira comprovada.
- `REJECTED` e `CANCELLED` não entram na linha do tempo, e um cancelamento não pode ser revertido automaticamente.
- Falhas por identidade divergente ou ausência do documento original impedem publicação.
- A revisão permanece vinculada ao documento e à parcela exata. Mudanças de valor/data precisam de nova análise.
- Nenhum evento entra no Radar sem arquivo de revisão presente e aprovação explícita.
- Quando eventos revisados são publicados para um ticker, as demonstrações (fixtures) daquele ticker não são apresentadas como eventos reais.
- O calendário identifica o lançamento como "Anúncio conferido; pagamento efetivo não verificado" e oferece o documento quando disponível.
- O arquivo consolidado **não representa dados de distribuição oficial ou liquidação validados pela B3**, a menos que a fonte e a conferência documental realmente o comprovem.

## Estado atual
A integração e os testes foram implementados, mas **não há arquivo documental autorizado nem lote de revisão configurados ou executados**. Nenhum anúncio real foi aprovado automaticamente. O próximo passo material depende de uma fonte legitimamente acessível e da revisão de seus documentos.
