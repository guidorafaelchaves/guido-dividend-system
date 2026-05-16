# Guido Dividend System

Sistema pessoal de inteligencia patrimonial para transformar dados da B3, proventos, eventos futuros, cotacoes, FIIs e decisoes em memoria financeira real.

## Estrutura

- `public/index.html`: aplicativo web publicado.
- `public/memory-client.js`: cliente JS para conectar o app ao Google Apps Script de memoria.
- `apps-script/Code.gs`: backend Google Apps Script para Google Sheets + Google Docs.
- `apps-script/SETUP.md`: passo a passo para publicar o Web App de memoria.
- `apps-script/examples.md`: exemplos de payload para testar a memoria.

## Rodar localmente

```bash
npm install
npm run dev
```

Depois abra o endereco exibido pelo `serve`.

## Deploy no Cloudflare Pages

Configuracao recomendada:

- Framework preset: `None`
- Build command: vazio
- Build output directory: `public`

## Memoria real

O sistema usa duas memorias:

- Google Sheets: dados estruturados de ativos, operacoes, proventos, snapshots, decisoes, eventos e logs.
- Google Docs: memoria narrativa, dossies, teses e revisoes.

Para configurar, publique `apps-script/Code.gs` como Web App e guarde a URL `/exec`.

## Status da migracao

Esta versao foi reconstruida a partir do app publicado em:

<https://guido-dividend-system.pages.dev/>

Tambem inclui a primeira versao da camada de memoria real criada para o Dividend System.

