# Atualização diária do Radar (fechamento B3)

A rotina `.github/workflows/radar-eod.yml` roda às **23h de Brasília**, de segunda a sexta-feira (02:00 UTC do dia seguinte). Pode ser atrasada pelo GitHub. Não consulta preço em tempo real.

## Ativação (pendente)
1. Contrate ou habilite uma fonte com licença que permita uso e **publicação no site**. Plano pessoal do Dados B3 não concede redistribuição pública.
2. Configure o secret `RADAR_EOD_FEED_URL` com endpoint HTTPS retornando JSON.
3. Configure `RADAR_EOD_FEED_TOKEN` se a fonte exigir bearer token.
4. Só depois de verificar a licença, configure a variável de Actions `RADAR_EOD_PUBLICATION_ALLOWED=true`.
5. Execute manualmente pelo GitHub Actions uma vez para testar. Consulte o log e o arquivo `public/data/radar-eod.json`.
6. Integre o frontend com `/data/radar-eod.json` apenas após confirmar que o domínio publicado é o mesmo projeto e que a licença cobre sua audiência.

Contrato JSON esperado:

```json
{
  "source": "Fornecedor licenciado",
  "tradeDate": "2026-11-06",
  "quotes": [
    {"ticker": "PETR4", "close": 40.23, "volume": 200000}
  ]
}
```

Exemplo ilustrativo apenas; não são dados de mercado reais. O feed de produção deve conter ao menos 10 tickers.

Validações: preço positivo, ticker válido, sem duplicação, pregão não futuro e não mais antigo que 7 dias; falha não sobrescreve o snapshot anterior. O commit é idempotente por data e conteúdo. Sem feed ou licença, o workflow falha explicitamente — não inventa dados.

## Limites
- Este mecanismo **não conecta automaticamente** a versão hospedada em `dividend-system-next.guidorafaelchaves.chatgpt.site`: seu deploy precisa ser identificado.
- Indicadores e proventos não são fornecidos por este snapshot; o arquivo contém apenas fechamentos e volume opcional.
- É preciso confirmar a disponibilidade do fechamento às 23h com o fornecedor; em caso de atraso, o job terá data antiga e poderá ser repetido manualmente.
