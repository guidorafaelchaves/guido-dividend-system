# Market Data Hub — aquisição, harmonização e publicação

## Escopo efetivamente implantado (18/10/2026)

O sistema removeu a dependência de token de cotações. As fontes têm papéis separados.

- **B3:** preços oficiais de fechamento por arquivo COTAHIST TXT importado manualmente pelo usuário, somente mercado à vista 010. Não há download automatizado do site da B3.
- **CSV:** preço, data e ticker fornecidos pelo usuário.
- **CVM:** consulta automática ao catálogo oficial de informes mensais FII. Nesta versão são armazenados os metadados e links dos ZIPs, ainda não os valores patrimoniais extraídos deles.
- **BCB:** consulta pública à série SGS 11 (Selic efetiva diária), para referência macroeconômica. Não representa cotação de ativos.

## Operação no dashboard

1. Importe as operações B3/atualize a carteira ou os ativos de sua lista.
2. Clique em **Adicionar arquivos B3/CSV** na parte superior do Dashboard e selecione o TXT descompactado ou CSV.
3. Clique em **Atualizar todo o sistema**.
4. A consolidação grava cotações, constrói histórico, recalcula posições e apresenta divergências bloqueadas. Sem novos preços, conserva o fechamento antigo e sua data real.

CSV aceito: colunas ticker, data e preço/fechamento; datas YYYY-MM-DD ou DD/MM/YYYY. Separador ponto e vírgula ou vírgula, com valores numéricos brasileiros.

## Regras verificadas

- Deduplicação por ticker + dia do pregão.
- Prioridade: arquivo oficial B3 acima do CSV manual e do cache legado.
- Não aceitar valores inválidos, zero, datas futuras ou mercados não à vista.
- Diferenças superiores a 1% no mesmo dia são sinalizadas e não substituem automaticamente o preço consolidado.
- Data de negociação e hora de importação são distintas.
- Nunca substituir cotação mais nova por dado de pregão anterior.
- Cotações e históricos são guardados em IndexedDB/localStorage; preservar backups e o Ledger.

## APIs existentes

- Gateway autenticado: GET/POST /api/market/sources.
- Market API autenticada: GET /me/market/sources; POST /me/market/refresh; GET /me/market/quotes.
- Importação D1 autenticada de administrador: POST /admin/market/import; JSON com source e quotes, no máximo 300 observações por lote.
- GET /api/market/quote informa ausência de feed licenciado; não simula preços ao vivo.

A integração D1 é separada do cache local do painel. Para servir a vários dispositivos, faltará conectar explicitamente a escrita do painel ao backend após autenticação e validação.

## Limitações e conformidade

- A B3 restringe coleta automatizada em páginas públicas. O usuário baixa manualmente o arquivo oficial ou contrata um feed autorizado.
- Dados CVM sob licença aberta ODbL exigem respeito à atribuição e condições de reutilização.
- Os relatórios CVM são ZIPs, exigindo extração e mapeamento CNPJ-ticker antes de calcular P/VP ou VPA automaticamente.
- Preços históricos não estão ajustados por eventos corporativos nesta etapa.
- A plataforma não tem uma fonte intradiária gratuita garantida e licenciada.
- GitHub e Cloudflare Workers possuem deploys distintos; merge no GitHub não comprova atualização do domínio workers.dev.

## Verificação

Execute npm run check e npm test; o GitHub Actions verifica a integridade do dashboard, o parser COTAHIST/CSV, precedência de fontes e sintaxe dos Workers.

Próximos incrementos: ingestão de relatórios FII da CVM, armazenamento multiusuário, ajustes corporativos e integração de fornecedor autorizado para atualização automática de preços quando disponível.
