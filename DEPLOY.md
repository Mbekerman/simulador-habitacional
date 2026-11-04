# Deploy no Google Cloud Run

Projeto `simulador-caixa-bkm`, região `southamerica-east1`, serviço `simulador-caixa`.

## Recursos

- Artifact Registry: `southamerica-east1-docker.pkg.dev/simulador-caixa-bkm/simulador/simulador-caixa`
- Conta de build: `simulador-build@simulador-caixa-bkm.iam.gserviceaccount.com` (artifactregistry.writer, logging.logWriter, storage.objectViewer)
- Conta de execução: `simulador-runtime@simulador-caixa-bkm.iam.gserviceaccount.com`
  - lê o segredo `simulador-api-token` (Secret Manager)
  - grava na planilha via Application Default Credentials: compartilhe a planilha com este e-mail como **Editor**
- Variáveis: `PUBLIC_HTTPS=1`, `SIMULADOR_API_URL=https://simulador-cx.up.railway.app`, `SIMULADOR_API_TOKEN` (segredo)

## Publicar

```sh
P=simulador-caixa-bkm
IMG=southamerica-east1-docker.pkg.dev/$P/simulador/simulador-caixa:$(date +%Y%m%d-%H%M%S)
gcloud builds submit . --config=cloudbuild.yaml --substitutions=_IMAGE=$IMG --region=southamerica-east1 --project=$P
gcloud run deploy simulador-caixa --image=$IMG --region=southamerica-east1 --project=$P \
  --service-account=simulador-runtime@$P.iam.gserviceaccount.com --max-instances=1 --port=8080 \
  --set-env-vars=SIMULADOR_API_URL=https://simulador-cx.up.railway.app,PUBLIC_HTTPS=1 \
  --set-secrets=SIMULADOR_API_TOKEN=simulador-api-token:latest --no-invoker-iam-check
```

Trocar a chave da API: `printf %s "$NOVA" | gcloud secrets versions add simulador-api-token --data-file=- --project=simulador-caixa-bkm` e publicar uma nova revisão.

## Notas

- Mantenha `max-instances=1`: a fila de gravação em Sheets e os tokens de GPS ficam em memória.
- O IP do cliente é o último valor de `X-Forwarded-For` (acrescentado pelo proxy do Google).
- `POST` só aceita `Origin` igual a `https://<host>` ou `PUBLIC_ORIGIN`.

## Verificação

`npm ci && npm run check && npm test`
