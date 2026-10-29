#!/usr/bin/env bash
# ==============================================================
# AgentIQ - Production Kubernetes Deployment Script
# ==============================================================

set -euo pipefail

echo "======================================================"
echo " Starting AgentIQ Kubernetes Cluster Deployment"
echo "======================================================"

# 1. Build local container images if running on Minikube / kind / local cluster
if command -v docker &> /dev/null; then
  echo "Building AgentIQ backend container image..."
  docker build -t agentiq-backend:latest -f backend/Dockerfile .

  echo "Building AgentIQ frontend container image..."
  docker build -t agentiq-frontend:latest -f frontend/Dockerfile ./frontend
fi

# 2. Deploy all resources via Kustomize
echo "Applying Kubernetes manifests via Kustomize..."
kubectl apply -k k8s/

# 3. Wait for PostgreSQL StatefulSet to become ready
echo "Waiting for PostgreSQL StatefulSet to be ready..."
kubectl rollout status statefulset/agentiq-postgres -n agentiq --timeout=120s

# 4. Wait for Backend Deployment to complete rollout
echo "Waiting for AgentIQ backend deployment to be ready..."
kubectl rollout status deployment/agentiq-backend -n agentiq --timeout=180s

# 5. Wait for Frontend Deployment to complete rollout
echo "Waiting for AgentIQ frontend deployment to be ready..."
kubectl rollout status deployment/agentiq-frontend -n agentiq --timeout=120s

echo "======================================================"
echo " AgentIQ Kubernetes Deployment Successfully Rolled Out!"
echo "======================================================"
kubectl get all -n agentiq

