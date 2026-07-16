# Upload Seguro

Controles obrigatorios:

- limite de tamanho;
- MIME real;
- hash SHA-256;
- nome seguro;
- bloqueio de executaveis;
- protecao contra path traversal;
- protecao contra zip bomb;
- timeout;
- limite de linhas;
- limite de planilhas;
- nenhuma macro;
- nenhuma execucao de formula;
- neutralizacao de CSV injection em exportacoes.

Arquivos brutos devem ir para R2 ou equivalente. D1 deve guardar metadados, linhas normalizadas e eventos canonicos.
