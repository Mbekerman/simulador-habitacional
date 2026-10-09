# Deploy automático no Railway

Fluxo: push em `main` → GitHub Actions (instalação, sintaxe e testes) → Railway.

## Conexão

1. Publicar este repositório no GitHub.
2. No projeto Railway `Simulador Caixa`, conectar um serviço ao repositório com branch `main`.
3. Ativar **Wait for CI** nas configurações do serviço para aguardar sucesso do workflow `CI`.
4. Configurar as variáveis do servidor:
   - `SIMULADOR_API_TOKEN`: chave da API de simulação.
   - `GOOGLE_SERVICE_ACCOUNT_JSON`: conteúdo JSON da conta de serviço já compartilhada com a planilha.
   - `SIMULADOR_API_URL`: opcional; padrão `https://simulador-cx.up.railway.app`.
5. Gerar um domínio público Railway.

O Railway instala dependências, inicia com `npm start` e verifica `/health` usando `railway.json`.
O servidor escuta `0.0.0.0` em Railway e usa a porta fornecida por `PORT`.
Mantenha uma réplica: a fila de gravação em Sheets e os tokens de atualização GPS são mantidos em memória por processo.

## Segredos

Não incluir chaves no Git, no workflow nem no navegador. A configuração local pode usar
`GOOGLE_APPLICATION_CREDENTIALS` com o caminho do JSON; em Railway use `GOOGLE_SERVICE_ACCOUNT_JSON`.
Não é necessário token Railway nos GitHub Actions quando o deploy usa a integração nativa.

## Verificação

Execute `npm ci`, `npm run check` e `npm test`. Após conectar, faça um push em `main`
e confirme o workflow aprovado e o novo commit implantado no Railway.

A conexão remota e a ativação de Wait for CI ainda precisam ser concluídas.
