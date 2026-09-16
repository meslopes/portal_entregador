# deploy-cloudrun.ps1 — Script de deploy para Google Cloud Run (PowerShell)
# Uso: .\deploy-cloudrun.ps1
#
# Pré-requisitos:
# 1. Google Cloud SDK instalado: https://cloud.google.com/sdk/docs/install
# 2. Conta Google Cloud com faturamento ativo
# 3. Projeto criado no Google Cloud Console
#
# Variáveis que você PRECISA ajustar antes de rodar:

# ===== CONFIGURAÇÕES — AJUSTAR =====
$PROJECT_ID = "project-0799c4fd-82a2-49a0-b7d"
$SERVICE_NAME = "muvlog-api"             # Nome do serviço no Cloud Run
$REGION = "southamerica-east1"           # São Paulo (mais perto do Supabase)
$IMAGE = "gcr.io/$PROJECT_ID/$SERVICE_NAME"
# ====================================

Write-Host "=== Deploy MuvLog Backend para Google Cloud Run ===" -ForegroundColor Cyan

# 1. Configurar projeto
Write-Host "`n[1/5] Configurando projeto $PROJECT_ID..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

# 2. Habilitar APIs necessárias
Write-Host "`n[2/5] Habilitando APIs..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com

# 3. Build da imagem Docker
Write-Host "`n[3/5] Construindo imagem Docker (pode levar 2-3 min)..." -ForegroundColor Yellow
gcloud builds submit --tag $IMAGE

# 4. Deploy no Cloud Run
Write-Host "`n[4/5] Fazendo deploy no Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $SERVICE_NAME `
  --image $IMAGE `
  --region $REGION `
  --platform managed `
  --allow-unauthenticated `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 5 `
  --concurrency 80 `
  --timeout 120 `
  --set-env-vars "FLASK_ENV=production" `
  --set-env-vars "DATABASE_URL=SUA_DATABASE_URL_AQUI" `
  --set-env-vars "SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')" `
  --set-env-vars "JWT_SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')" `
  --set-env-vars "SUPABASE_URL=https://dxcjudzyotitfqcpabmi.supabase.co" `
  --set-env-vars "SUPABASE_SERVICE_KEY=sua_key_aqui" `
  --set-env-vars "GOOGLE_MAPS_API_KEY=sua_key_aqui"

# 5. Obter URL do serviço
Write-Host "`n[5/5] Obtendo URL do serviço..." -ForegroundColor Yellow
$URL = gcloud run services describe $SERVICE_NAME --region $REGION --format "value(status.url)"

Write-Host "`n=== Deploy concluído! ===" -ForegroundColor Green
Write-Host "URL do backend: $URL" -ForegroundColor Green
Write-Host "`nPróximos passos:" -ForegroundColor Cyan
Write-Host "1. Atualize VITE_API_URL no frontend para: $URL"
Write-Host "2. Configure CORS no backend para aceitar seu domínio Vercel"
Write-Host "3. Teste: $URL/api/auth/login"
