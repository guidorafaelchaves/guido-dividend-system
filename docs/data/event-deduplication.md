# Deduplicacao De Eventos

Fingerprint canonico:

```text
ticker | tipo | valor | record date | ex date | payment date | fonte | referencia
```

Objetivo:

- evitar duplicidade entre B3 e Brapi;
- detectar republicacao;
- preservar mudanca de data ou valor;
- suportar eventos parcelados;
- permitir revisao humana quando houver ambiguidade.

Nunca depender apenas de ticker e data.
