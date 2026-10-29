# ==============================================================
# AgentIQ - Production Kubernetes Deployment Script (PowerShell)
# ==============================================================

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " Starting AgentIQ Kubernetes Cluster Deployment" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Build local container images
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "Building AgentIQ backend container image..." -ForegroundColor Yellow
    docker build -t agentiq-backend:latest -f backend/Dockerfile .

    Write-Host "Building AgentIQ frontend container image..." -ForegroundColor Yellow
    docker build -t agentiq-frontend:latest -f frontend/Dockerfile ./frontend
}

# 2. Deploy via Kustomize
Write-Host "Applying Kubernetes manifests via Kustomize..." -ForegroundColor Yellow
kubectl apply -k k8s/

# 3. Wait for PostgreSQL
Write-Host "Waiting for PostgreSQL StatefulSet to be ready..." -ForegroundColor Yellow
kubectl rollout status statefulset/agentiq-postgres -n agentiq --timeout=120s

# 4. Wait for Backend
Write-Host "Waiting for AgentIQ backend deployment to be ready..." -ForegroundColor Yellow
kubectl rollout status deployment/agentiq-backend -n agentiq --timeout=180s

# 5. Wait for Frontend
Write-Host "Waiting for AgentIQ frontend deployment to be ready..." -ForegroundColor Yellow
kubectl rollout status deployment/agentiq-frontend -n agentiq --timeout=120s

Write-Host "======================================================" -ForegroundColor Green
Write-Host " AgentIQ Kubernetes Deployment Successfully Rolled Out!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
kubectl get all -n agentiq
