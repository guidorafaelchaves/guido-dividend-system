# Guido Dividend System - Memoria Real

Este kit cria uma memoria real para o Dividend System usando:

- Google Sheets para dados estruturados.
- Google Docs para memoria narrativa e auditoria.
- Google Apps Script como ponte HTTP.

## 1. Criar o projeto Apps Script

1. Abra <https://script.google.com>.
2. Clique em `Novo projeto`.
3. Renomeie para `Guido Dividend System Memory`.
4. Apague o codigo inicial.
5. Cole todo o conteudo de `Code.gs`.
6. Salve.

## 2. Rodar o setup pela primeira vez

1. No seletor de funcoes, escolha `setupMemory`.
2. Clique em `Executar`.
3. Autorize as permissoes do Google.

O script vai criar:

- `Guido Dividend System - Memoria Patrimonial`
- `Guido Dividend System - Diario Patrimonial`

## 3. Publicar como Web App

1. Clique em `Implantar`.
2. Clique em `Nova implantacao`.
3. Selecione tipo `App da Web`.
4. Configure:
   - Executar como: `Eu`
   - Quem pode acessar: `Qualquer pessoa`
5. Clique em `Implantar`.
6. Copie a URL terminada em `/exec`.

Essa URL sera a `DIVIDEND_MEMORY_API_URL`.

## 4. Testar no navegador

Abra:

```text
SUA_URL_DO_WEB_APP?action=setup
```

Depois abra:

```text
SUA_URL_DO_WEB_APP?action=data
```

Se tudo estiver certo, voce vera um JSON com `ativos`, `operacoes`, `proventos`, `snapshots`, `decisoes`, `radarEventos`, `config` e `log`.

## 5. Testar cadastro de ativo

Use um POST JSON para a URL `/exec`:

```json
{
  "action": "upsert_asset",
  "ticker": "MXRF11",
  "nome": "Maxi Renda FII",
  "tipo": "FII",
  "segmento": "Papel",
  "quantidade_atual": 100,
  "preco_medio": 10.05,
  "status": "manter",
  "tese": "FII de renda recorrente para acompanhamento mensal",
  "fonte": "teste_manual"
}
```

O ativo deve aparecer na aba `Ativos` e uma nota deve entrar no Google Docs.

## 6. Endpoints disponiveis

Todos os endpoints usam a mesma URL do Web App.

### GET

```text
?action=setup
?action=data
?action=data&only=ativos
```

### POST

```text
action=upsert_asset
action=add_operation
action=add_dividend
action=add_decision
action=add_radar_event
action=snapshot
action=doc_note
action=log
```

## 7. Papel de cada memoria

Sheets:

- Cadastro consolidado de ativos.
- Operacoes.
- Proventos.
- Snapshots.
- Decisoes.
- Eventos do radar.
- Logs tecnicos.

Docs:

- Tese de investimento.
- Decisoes importantes.
- Revisoes de carteira.
- Explicacoes do Decision Engine.
- Historico narrativo do patrimonio.

## 8. Proximo passo no Dividend System

Depois que a URL `/exec` estiver funcionando, o app deve ganhar:

1. Campo `Memory API URL` na Central API.
2. Botao `Sincronizar memoria`.
3. Botao `Carregar memoria`.
4. Envio automatico de ativos consolidados para `upsert_asset`.
5. Envio de decisoes do Decision Engine para `add_decision`.
6. Envio de notas/dossies para `doc_note`.

