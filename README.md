# AgentIQ — Agentic Enterprise Knowledge Assistant

AgentIQ is a full-stack, enterprise-grade AI knowledge platform. It enables organizations to ingest business documents, retrieve grounded factual answers with verifiable source citations, and query relational business metrics through safe, bounded agentic workflows powered by LangGraph, PostgreSQL, and pgvector.

---

## 1. Architectural Highlights

- **Frontend:** React 18, TypeScript (strict type checking), Vite, Tailwind CSS, Lucide icons, responsive three-part workspace.
- **UI Design System:** Pure white (`#FFFFFF`) background, deep black (`#000000`) primary typography, dark gray secondary accents, restrained borders, and minimal green indicators reserved solely for active health states.
- **Backend:** Python 3.12, FastAPI, Pydantic v2 schemas, SQLAlchemy 2.x ORM, Alembic migrations, structured logging.
- **Vector & Relational Storage:** PostgreSQL 16 with `pgvector` for dense vector similarity search (1536d / 768d vectors) alongside relational business tables.
- **Agent Orchestration:** LangGraph `StateGraph` workflow bounded to $N \le 4$ steps, deterministic fallback paths, execution timeouts, and strict schema validation.
- **Safe SQL Analytics Tool:** 5-defense security model featuring AST parsing via `sqlglot` (permitting single-statement `SELECT` on whitelisted tables), automatic `LIMIT 50` clamping, query timeout bounds, and a dedicated `analytics_reader` role.
- **Grounded RAG Pipeline:** PDF text extraction with magic-byte validation (`%PDF-`), SHA-256 deduplication, recursive character chunking (500 chars, 100 overlap), cosine similarity cutoff, and citation mapping (`[Doc: <name>, Page: <p>]`).
- **Provider Abstraction:** Configurable AI provider layer supporting deterministic offline `mock` mode (for automated testing and evaluation), `openai` (`gpt-4o-mini`), and `gemini` (`gemini-1.5-flash`).
- **Containerization & CI/CD:** Production Dockerfiles (non-root backend, multi-stage Nginx frontend with reverse proxy), `docker-compose.yml`, and GitHub Actions CI workflow covering linting, pytest, vitest, and Docker build verification.

---

## 2. Workspace Layout

```
AgentIQ/
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI (lint, pytest, vitest, docker build)
├── backend/
│   ├── Dockerfile             # Python 3.12 slim, non-root user, healthcheck
│   ├── .dockerignore
│   ├── requirements.txt       # Pinned production dependencies
│   ├── alembic.ini            # Alembic database migration config
│   ├── alembic/               # Database version revisions
│   └── app/
│       ├── main.py            # FastAPI application entrypoint & lifespan
│       ├── config.py          # Pydantic BaseSettings environment validation
│       ├── core/              # Logging, exceptions, error handlers
│       ├── db/                # Engine, sessions, seeders
│       ├── models/            # SQLAlchemy models (Document, Chunk, Customer, Order)
│       ├── schemas/           # Pydantic validation schemas
│       ├── services/          # Ingestion, RAG, SQL guardrail, providers
│       ├── agent/             # LangGraph state graph, router, and tools
│       ├── api/               # REST API endpoints (v1)
│       └── evaluation/        # Evaluation benchmark suite & test dataset
├── frontend/
│   ├── Dockerfile             # Multi-stage build (Node 22 -> Nginx Alpine)
│   ├── nginx.conf             # Nginx reverse proxy configuration
│   ├── .dockerignore
│   ├── package.json
│   ├── vite.config.ts         # Vite bundler & Vitest test config
│   └── src/
│       ├── App.tsx            # Three-part enterprise layout & state
│       ├── components/
│       │   ├── chat/          # AgenticChat & Collapsible Information Inspector
│       │   ├── documents/     # DocumentVault with KPI metrics & drag-and-drop
│       │   └── analytics/     # SQLAnalyticsView (presets, custom editor, schema)
│       ├── api/               # Typed client fetchers
│       └── types/             # TypeScript shared interfaces
├── tests/
│   ├── conftest.py            # SQLite/PostgreSQL fixtures & client session
│   ├── unit/                  # Chunking, PDF extraction, guardrails, providers
│   ├── integration/           # Health, Documents, Chat, LangGraph workflows
│   └── security/              # SQL injection and AST parser boundary tests
├── docker-compose.yml         # Multi-service compose (pgvector, backend, frontend)
├── render.yaml                # Render Blueprint Infrastructure-as-Code
├── run_backend.py             # Zero-config root backend launcher
├── start.ps1                  # PowerShell 1-click startup script
├── start.bat                  # Windows batch 1-click startup script
└── pytest.ini                 # Pytest runner configuration
```

---

## 3. Quickstart & Running AgentIQ

### Option A: 1-Click Launch (Recommended for Windows)

In your PowerShell terminal:
```powershell
.\start.ps1
```
*(Or double-click `start.bat` in Windows File Explorer).*

This script automatically launches the FastAPI backend on port 8000, the Vite React frontend on port 5173, and opens your browser.

---

### Option B: Dual-Terminal Workflow (Developer Setup)

#### Terminal 1 — Backend (FastAPI):
```bash
# Activate your virtual environment
.\.venv\Scripts\Activate.ps1    # Windows
# source .venv/bin/activate     # macOS/Linux

# Launch backend runner
python run_backend.py
```
- API Server: `http://localhost:8000`
- Interactive Swagger API Docs: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/api/v1/health`

#### Terminal 2 — Frontend (React + Vite):
```bash
npm run dev
```
- Web Application: `http://localhost:5173`

---

### Option C: Containerized with Docker Compose

Ensure Docker and Docker Compose are installed:
```bash
# Build and launch all services in detached mode
docker compose up --build -d

# Check service logs
docker compose logs -f

# Verify running containers
docker compose ps

# Teardown services
docker compose down
```

- Web UI (Nginx SPA): `http://localhost:5173`
- Backend REST API: `http://localhost:8000`
- PostgreSQL + pgvector: `localhost:5432`

---

### Option D: 1-Click Cloud Deployment (Render)

AgentIQ includes a turnkey Infrastructure-as-Code blueprint (`render.yaml`). To deploy to Render:

1. Push your repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** → **Blueprint**.
3. Select your repository (`AgentIQ`) and click **Apply**.

Render will automatically build and provision:
- **Frontend SPA:** `https://agentiq-frontend.onrender.com`
- **Backend API & Swagger Docs:** `https://agentiq-backend-k8om.onrender.com/docs`
- **Health Endpoint:** `https://agentiq-backend-k8om.onrender.com/api/v1/health`

---

## 4. AI Provider Configuration

AgentIQ supports both offline deterministic development (zero cost) and live production LLM providers via environment variables in `.env`:

| Provider | `LLM_PROVIDER` | `EMBEDDING_PROVIDER` | Required Environment Variables |
|---|---|---|---|
| **Mock (Default)** | `mock` | `mock` | None (Deterministic hashing & grounded prompt citations) |
| **OpenAI** | `openai` | `openai` | `OPENAI_API_KEY=sk-...`<br>`OPENAI_CHAT_MODEL=gpt-4o-mini`<br>`OPENAI_EMBEDDING_MODEL=text-embedding-3-small` |
| **Google Gemini** | `gemini` | `gemini` | `GEMINI_API_KEY=AIza...`<br>`GEMINI_CHAT_MODEL=gemini-1.5-flash`<br>`GEMINI_EMBEDDING_MODEL=models/text-embedding-004` |

> [!NOTE]
> When `LLM_PROVIDER=openai` or `gemini` is selected without a valid API key, AgentIQ raises an explicit, user-friendly exception preventing silent fallback or simulated responses.

---

## 5. Automated Verification & Testing

Every layer of the application is covered by unit, integration, and security tests:

```bash
# 1. Run full backend test suite (47 passed)
pytest -v

# 2. Run benchmark evaluation runner
python backend/app/evaluation/runner.py

# 3. Run backend linter (Ruff)
ruff check backend tests

# 4. Run frontend unit tests (Vitest)
npm test --prefix frontend

# 5. Run frontend TypeScript check & production bundle
npm run build
```

### Benchmark Evaluation Suite Results

Run against the standardized golden dataset (`backend/app/evaluation/test_dataset.json`):

| Evaluation Metric | Score | Industry Baseline | Target Guarantee |
|---|:---:|:---:|---|
| **Retrieval Recall@1** | **100.0%** | > 80% | Verified document ranked #1 |
| **Retrieval Recall@3** | **100.0%** | > 90% | Verified document in top 3 chunks |
| **Citation Faithfulness** | **100.0%** | > 85% | Attributed citations link to true source pages |
| **Hallucination Refusal Rate** | **100.0%** | > 95% | Explicit refusal on unanswerable questions |
| **SQL Guardrail Accuracy** | **100.0%** | 100% | Rejection of DDL, DML, and unauthorized tables |
| **Mean Retrieval Latency** | **1.4 ms** | < 100 ms | In-memory / vector retrieval latency |

### Test Suite Coverage Breakdown

- **Unit Tests:** `test_chunking.py`, `test_pdf_extraction.py`, `test_sql_guardrails.py`, `test_providers.py`, `test_evaluation_benchmark.py`
- **Integration Tests:** `test_api_health.py`, `test_api_documents.py`, `test_api_chat.py`, `test_agent_graph.py`
- **Security & Injection:** `test_sql_injection.py` (prohibits chained queries, schema alterations, SQL drops, and table traversal)
- **Frontend Tests:** `App.test.tsx` (verifies three-part workspace, brand identity, navigation items, and system health status)

---

## 6. Security Boundaries & Guardrails

1. **Document Upload Protection:** Inspects `%PDF-` file magic bytes, enforces a 15 MB payload limit, and uses SHA-256 file hashing for deduplication.
2. **Safe SQL Analytics AST Parsing:** Powered by `sqlglot`, queries are strictly parsed into Abstract Syntax Trees. Chained statements (`SELECT ...; DROP ...`), DDL, DML, and blacklisted functions (`pg_sleep`) are rejected before reaching the database.
3. **Automatic Query Clamping:** All analytical `SELECT` statements are clamped to `LIMIT 50` rows with a 3,000ms execution timeout.
4. **Least-Privilege Database Role:** The database connection for business analytics runs under `analytics_reader`, restricted solely to `SELECT` privileges on approved tables (`customers`, `products`, `orders`, `order_items`).
5. **Grounded Synthesis:** The RAG pipeline requires cosine similarity $> 0.45$. When evidence is insufficient, AgentIQ returns an explicit lack-of-evidence notification instead of hallucinating.

---

## 7. GitHub Actions CI/CD

The workflow in `.github/workflows/ci.yml` triggers on pushes and pull requests to `main`, `master`, and `develop`:

1. **Backend Checks:** Spins up an ephemeral `pgvector/pgvector:pg16` service container, installs dependencies, executes `ruff check`, and runs all 47 pytest tests and the benchmark evaluation runner.
2. **Frontend Checks:** Sets up Node.js 22, installs dependencies via `npm ci`, runs Vitest unit tests, and verifies the TypeScript production bundle (`npm run build`).
3. **Docker Verification:** Uses `docker/setup-buildx-action` to build both `backend/Dockerfile` and `frontend/Dockerfile` images, guaranteeing container build readiness.
