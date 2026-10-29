# AgentIQ Kubernetes Production Deployment Guide

This directory contains production-ready Kubernetes manifests and orchestration scripts to deploy the complete **AgentIQ** autonomous enterprise analytics platform across local or cloud Kubernetes clusters (Minikube, Docker Desktop, kind, k3s, GKE, EKS, AKS).

---

## Architecture Overview

```
                                      [ Internet / Client ]
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │    Ingress Controller │
                                    │   (agentiq-ingress)   │
                                    └───────────┬───────────┘
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       │                                                 │
          Path: /api, /docs, /openapi.json                            Path: /
                       │                                                 │
                       ▼                                                 ▼
          ┌─────────────────────────┐                       ┌─────────────────────────┐
          │  agentiq-backend Service│                       │ agentiq-frontend Service│
          │       (Port 8000)       │                       │        (Port 80)        │
          └────────────┬────────────┘                       └────────────┬────────────┘
                       │                                                 │
                       ▼                                                 ▼
          ┌─────────────────────────┐                       ┌─────────────────────────┐
          │  agentiq-backend Pods   │                       │  agentiq-frontend Pods  │
          │   (2-10 Replicas, HPA)  │                       │       (2 Replicas)      │
          └────────────┬────────────┘                       └─────────────────────────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
┌──────────────┐               ┌───────────────┐
│  PostgreSQL  │               │ Persistent    │
│  + pgvector  │               │ Volume Claim  │
│ (StatefulSet)│               │ (/app/uploads)│
└──────────────┘               └───────────────┘
```

---

## Directory Manifests

| File | Purpose |
| :--- | :--- |
| **`namespace.yaml`** | Creates dedicated `agentiq` namespace for isolated workloads |
| **`configmap.yaml`** | Application configuration parameters (chunking, limits, environment) |
| **`secret.yaml`** | Database credentials, JWT secret keys, and AI provider API keys |
| **`storage-pvc.yaml`** | 10Gi PersistentVolumeClaim for PDF uploads and ingested files |
| **`postgres.yaml`** | PostgreSQL 16 + `pgvector` StatefulSet with persistent storage and init script |
| **`backend.yaml`** | Multi-replica FastAPI deployment, probes, service, and HPA |
| **`frontend.yaml`** | High-performance Nginx SPA deployment and service |
| **`ingress.yaml`** | Ingress routing with 25MB body upload size and extended timeouts |
| **`kustomization.yaml`** | Declarative manifest bundling with unified labels |
| **`deploy.sh`** / **`deploy.ps1`** | Automated one-command build, deployment, and rollout verification |

---

## Quickstart Deployment

### 1. Deploy Using Kustomize (One Command)

```bash
# Apply all manifests via Kustomize
kubectl apply -k k8s/
```

Or run the automated deployment script:

```bash
# On Linux / macOS
chmod +x k8s/deploy.sh
./k8s/deploy.sh

# On Windows (PowerShell)
.\k8s\deploy.ps1
```

### 2. Verify Pod Health and Rollout

```bash
kubectl get pods -n agentiq -w
kubectl get services -n agentiq
kubectl get ingress -n agentiq
```

### 3. Access Locally via Port-Forwarding (If No Ingress Controller)

```bash
# Forward Frontend to localhost:3000
kubectl port-forward svc/agentiq-frontend 3000:80 -n agentiq

# Forward Backend to localhost:8000
kubectl port-forward svc/agentiq-backend 8000:8000 -n agentiq
```

---

## Production Customizations

1. **AI Provider Credentials**: Edit `k8s/secret.yaml` with your production `OPENAI_API_KEY` or `GEMINI_API_KEY`, and update `LLM_PROVIDER` in `k8s/configmap.yaml`.
2. **Custom Domain & TLS**: Update `k8s/ingress.yaml` with your custom hostname and cert-manager `tls:` block.
3. **Cloud Storage**: In AWS/GCP/Azure, replace `storageClassName` in `k8s/storage-pvc.yaml` and `k8s/postgres.yaml` with `gp3`, `standard-rwo`, or `managed-csi`.

