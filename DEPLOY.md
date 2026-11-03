# Deploy no Google Cloud Run

Até 3/nov/2026 o simulador ficava no Railway, que bloqueou a conta. Agora fica no Cloud Run, no projeto
do Google Cloud `simulador-caixa-511114` (o mesmo da conta de serviço que grava na planilha).

Fluxo: push em `main` → Cloud Build (buildpack de Node, `npm start`) → serviço `simulador-caixa`.
O GitHub Actions continua rodando sintaxe e testes; o build não espera o CI.

## Criar o serviço (uma vez, no console)

1. Cloud Run → **Implantar contêiner** → **Implantar continuamente a partir de um repositório**,
   repositório `Mbekerman/simulador-habitacional`, branch `^main$`, tipo de build **Go, Node.js, Python...
   (buildpacks)**, sem Dockerfile.
2. Região `southamerica-east1`, nome `simulador-caixa`, **Permitir acesso público**.
3. Escalonamento: mínimo 0, **máximo 1 instância** (a fila de gravação na planilha e os tokens de
   atualização do GPS ficam na memória do processo).
4. Segurança → **Conta de serviço**: `simulador-caixa@simulador-caixa-511114.iam.gserviceaccount.com`.
   Assim a planilha é gravada sem chave JSON: o servidor usa a credencial do próprio Cloud Run.
5. Variáveis e secrets:
   - `SIMULADOR_API_TOKEN`: chave da API de simulação, de preferência como secret do Secret Manager
     (a conta de serviço precisa do papel **Acessador de secrets** nesse secret).
   - `SIMULADOR_API_URL`: opcional; padrão `https://simulador-cx.up.railway.app`.
   - `GOOGLE_SERVICE_ACCOUNT_JSON`: não usar no Cloud Run. Só para outro servidor sem conta de serviço.
6. Porta: o Cloud Run passa `PORT`; o servidor escuta `0.0.0.0` quando `K_SERVICE` existe.

Verificação de saúde: `GET /health`. `GET /api/config` mostra `authenticated: true` quando o token está.

## Segredos

Não incluir chaves no Git, no workflow nem no navegador. Localmente, use
`GOOGLE_APPLICATION_CREDENTIALS` com o caminho do JSON ou `GOOGLE_SERVICE_ACCOUNT_JSON`.
A planilha só aceita a conta `simulador-caixa@simulador-caixa-511114.iam.gserviceaccount.com`.

## Verificação

Execute `npm ci`, `npm run check` e `npm test`. Depois do deploy, abra o endereço `*.run.app`,
faça uma simulação de teste com registro e confira a linha nova na planilha.
