# Deploy e GitHub

## 1. Criar repositorio no GitHub

Crie um repositorio vazio no GitHub, por exemplo:

```text
guido-dividend-system
```

Nao marque para criar README, `.gitignore` ou license se quiser manter o historico local limpo.

## 2. Conectar o remoto

No terminal, dentro da pasta do projeto:

```bash
git remote add origin https://github.com/SEU_USUARIO/guido-dividend-system.git
git branch -M main
git push -u origin main
```

## 3. Cloudflare Pages

No Cloudflare Pages:

1. Conecte ao GitHub.
2. Escolha o repositorio `guido-dividend-system`.
3. Configure:
   - Build command: vazio
   - Output directory: `public`
4. Salve e faca o primeiro deploy.

## 4. Google Apps Script

O Apps Script nao faz deploy automaticamente pelo GitHub nesta fase.

Use:

```text
apps-script/Code.gs
```

Copie para o editor do Google Apps Script e publique como Web App.

## 5. Proximo passo tecnico

Depois da migracao basica:

1. Integrar `public/memory-client.js` diretamente no `index.html`.
2. Adicionar campos de configuracao da Memory API na aba Central API.
3. Criar botoes `Sincronizar memoria`, `Carregar memoria` e `Registrar decisao`.
4. Separar o HTML unico em modulos menores quando o projeto pedir manutencao mais pesada.

