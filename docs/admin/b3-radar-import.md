# Importacao B3 - Radar De Proventos

## Perfil Implementado

Perfil inicial:

```text
B3 - Radar de Proventos
```

Campos canonicos:

- ticker;
- ISIN;
- nome do ativo;
- tipo do ativo;
- tipo de provento;
- data de anuncio;
- Data COM;
- Data EX;
- pagamento;
- valor bruto por unidade;
- valor liquido;
- moeda;
- status;
- codigo do evento;
- data de referencia.

## Aliases

Aliases como `Data COM`, `Data-Com`, `Data Base`, `Data de Corte` e `Ultimo Dia Com` ficam centralizados em `B3_RADAR_ALIASES`, sem condicionais espalhadas pela UI.

## Pipeline

1. Receber arquivo no backend.
2. Validar nome seguro, tamanho, hash e tipo.
3. Detectar separador e cabecalho.
4. Detectar perfil e confianca.
5. Gerar preview.
6. Confirmar mapeamento.
7. Normalizar linhas.
8. Persistir em `raw_import_rows` e `canonical_financial_events`.
9. Enviar para revisao.

## Limite Atual

CSV/TXT delimitado esta implementado no Worker. XLS/XLSX/ZIP entram na arquitetura de upload seguro e devem passar por parser backend dedicado antes de producao.
