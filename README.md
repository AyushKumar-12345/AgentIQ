# AgentIQ — Agentic Enterprise Knowledge Assistant

AgentIQ is a full-stack, enterprise-grade AI knowledge platform. It enables organizations to upload business documents, retrieve grounded factual answers with verifiable citations, and query relational business metrics through safe, bounded agentic workflows powered by LangGraph, PostgreSQL, and pgvector.

---

## 1. Architectural Highlights

- **Backend:** FastAPI with Pydantic v2 schemas, SQLAlchemy 2.x ORM, Alembic migrations, and structured logging.
- **Frontend:** React 18, TypeScript (strict mode), Vite, Tailwind CSS, Lucide icons.
- **Vector & Relational Storage:** PostgreSQL 16 + pgvector for dense vector similarity search (1536d / 768d vectors) alongside relational business data.
- **Agent Orchestration:** LangGraph StateGraph with bounded execution limits ($N \le 4$ steps), execution timeouts, and strict schema validation.
- **Safe SQL Analytics Tool:** 5-layer security model: AST validation via `sqlglot`, statement limits, table whitelist, execution timeouts, and a dedicated read-only database role (`analytics_reader`).
- **Grounded RAG:** Ingestion with SHA-256 deduplication, recursive character chunking, cosine similarity retrieval, strict grounding prompts, and automated citation mapping.

---

## 2. Directory Layout

```
AgentIQ/
├── .github/workflows/ci.yml       # GitHub Actions CI for linting, tests, and build
├── docker/init-db.sql             # Postgres init script (pgvector + analytics_reader role)
├── docker-compose.yml             # Postgres+pgvector, Backend, Frontend
├── .env.example                   # Configuration template
├── pytest.ini                     # Pytest runner configuration
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/                   # Database migrations
│   └── app/
│       ├── main.py                # FastAPI entrypoint
│       ├── config.py              # Pydantic BaseSettings
│       ├── core/                  # Logging, exceptions, security
│       ├── db/                    # SQLAlchemy engine & session
│       ├── models/                # ORM models (documents, chunks, business)
│       ├── schemas/               # Pydantic validation schemas
│       ├── services/              # Ingestion, RAG, SQL tool, providers
│       ├── agent/                 # LangGraph workflows and tools
│       ├── api/                   # REST API routes (v1)
│       └── evaluation/            # Automated evaluation suite
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── src/                       # React components, hooks, and types
└── tests/
    ├── conftest.py
    ├── unit/
    ├── integration/
    └── security/
```

---

## 3. Quickstart & Local Setup

### 3.1 Prerequisites
- Python 3.12+
- Node.js 20+ and npm 10+
- Docker & Docker Compose (optional for containerized setup)

### 3.2 Environment Setup
1. Copy the environment configuration template:
   ```bash
   cp .env.example .env
   ```
2. Configure your desired LLM and embedding providers in `.env` (defaults to `mock` for local, cost-free testing).

### 3.3 Running Locally (Bare Metal)

#### Backend:
```bash
# 1. Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1    # Windows PowerShell
# source .venv/bin/activate     # macOS/Linux

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Start development server
uvicorn app.main:app --app-dir backend --reload --port 8000
```
- Interactive API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/v1/health`

#### Frontend:
```bash
cd frontend
npm install
npm run dev
```
- Frontend UI: `http://localhost:5173`

### 3.4 Running with Docker Compose
```bash
docker compose up --build -d
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- PostgreSQL pgvector: `localhost:5432`

---

## 4. Testing & Verification Commands

```bash
# 1. Run all backend unit and integration tests
pytest -v

# 2. Run Ruff linter on backend
ruff check backend

# 3. Run frontend TypeScript type checking and production build
cd frontend && npm run build
```

---

## 5. Security & Least-Privilege Architecture

- **PDF Ingestion:** File magic byte inspection (`%PDF-`), 15MB size limit, SHA-256 hash deduplication.
- **SQL Analytics:** The agent interacts with business data solely through the `analytics_reader` role, restricted strictly to `SELECT` on authorized business tables (`customers`, `orders`, `order_items`, `products`). Any DDL, DML, or application metadata queries are blocked by both AST parsing and the database engine.

