# AgentIQ — AI Engineer Interview Preparation & Technical Deep-Dive

This guide is designed for technical interviews (AI Engineer, Backend Engineer, Machine Learning Engineer). It explains the fundamental architectural decisions, algorithms, security models, and trade-offs implemented in AgentIQ.

---

## 1. Core Architectural Concepts

### 1.1 RAG vs. Fine-Tuning: When and Why?

| Dimension | Retrieval-Augmented Generation (RAG) | Model Fine-Tuning |
| :--- | :--- | :--- |
| **Primary Purpose** | Dynamic knowledge retrieval, citing verifiable sources, reducing hallucinations on private data. | Adapting style, tone, domain syntax, or teaching task-specific token patterns. |
| **Data Freshness** | Instantaneous. Updating or adding documents takes seconds without model retraining. | Static snapshot. Requires dataset preparation, retraining runs, and redeployment. |
| **Hallucination Control**| High. The model is forced to cite concrete chunk IDs and pages from retrieved evidence. | Low. Model parameters absorb knowledge statistically, leading to confident hallucinations. |
| **Compute Cost** | Low. Only vector storage and standard LLM inference tokens. | High. GPU compute clusters, training time, and specialized model hosting. |
| **Access Control** | Fine-grained. Document-level ACLs can be applied during vector retrieval. | Coarse. Once trained, internal weights cannot easily mask confidential data. |

> **Interview Summary:** *"In enterprise systems, RAG is chosen for factual accuracy, dynamic access control, and source citations. Fine-tuning is reserved for altering model behavior, dialect, or structured formatting, not for storing volatile business knowledge."*

---

### 1.2 Embeddings, Chunking, and Vector Search

#### A. Chunking Strategy: Recursive Character Splitting
- **Why chunking matters:** LLMs have finite context windows, and passing entire 100-page documents dilutes attention, increases latency, and incurs higher token costs.
- **Recursive Splitting:** Rather than splitting strictly at fixed character intervals (which cuts sentences in half), `RecursiveCharacterChunker` evaluates hierarchical separators `["\n\n", "\n", ". ", " ", ""]`. It prioritizes paragraph and sentence boundaries, preserving semantic integrity.
- **Chunk Overlap (e.g., 500 chars, 100 overlap):** Ensures that statements spanning across chunk boundaries retain cross-chunk context so semantic meaning is not lost.

#### B. Dense Vectors & Cosine Distance in pgvector
- **Embedding:** Dense mathematical representation where semantically similar texts map to proximal coordinates in $\mathbb{R}^D$ space ($D=1536$ for OpenAI, $768$ for Gemini).
- **Cosine Similarity:**
  $$\cos(\mathbf{u}, \mathbf{v}) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2}$$
  Because embeddings are normalized ($\|\mathbf{u}\|_2 = 1.0$), cosine similarity reduces directly to the dot product $\mathbf{u} \cdot \mathbf{v}$.
- **pgvector Indexing (HNSW):** Hierarchical Navigable Small World graphs enable sub-linear logarithmic approximate nearest neighbor (ANN) vector search, scaling to millions of document chunks.

---

### 1.3 Why LangGraph? Bounded State Machine vs. Unbounded ReAct

- **The Problem with Basic ReAct / Autonomous Agents:**
  Standard autonomous loops (e.g. LangChain AgentExecutor or raw loops) can get stuck in infinite recursion, repeat failed tool calls, exhaust token limits, or generate unintended operations.
- **LangGraph Architecture:**
  1. **Explicit State Schema:** Uses a typed state dictionary (`AgentState`) containing message logs, tool execution history, steps taken, and citations.
  2. **Deterministic Bounding:** A strict step counter increments on every transition. If `current_step >= max_steps` ($N=4$), the conditional edge unconditionally transitions to the `synthesizer` node, preventing infinite loops.
  3. **Conditional Routing:** Evaluates query intent to route either to `doc_search`, `sql_analytics`, or both in sequence before synthesis.

---

### 1.4 PostgreSQL + pgvector vs. Standalone Vector Databases

Why not Pinecone, Milvus, or Qdrant?
1. **Single ACID Database:** Document metadata, chat conversations, vector embeddings, and relational enterprise data (`customers`, `orders`) reside in a single PostgreSQL instance.
2. **Transactional Consistency:** Deleting a document executes `ON DELETE CASCADE`, atomically removing all associated vector chunks. In dual-database architectures (e.g. Postgres + Pinecone), network failures cause orphan vectors and desynchronization.
3. **Operational Simplicity:** Reuses existing PostgreSQL backup, replication, disaster recovery, and security monitoring tooling.

---

### 1.5 The 5-Layer SQL Analytics Defense-in-Depth Model

Never trust an LLM prompt to restrict SQL execution. AgentIQ implements 5 defense layers:
1. **Pydantic Validation:** Type enforcement and input sanitization on incoming JSON requests.
2. **AST Parsing via `sqlglot`:**
   - Multi-statement check: strictly rejects semicolon-chained queries.
   - Root node verification: must be `exp.Select` (strictly rejects `DROP`, `ALTER`, `TRUNCATE`, `INSERT`, `UPDATE`, `DELETE`).
   - Table whitelist check: walks AST `exp.Table` nodes and allows only `customers`, `products`, `orders`, `order_items`. Any reference to `documents`, `chat_messages`, or `pg_*` catalogs is blocked.
   - Function blacklist: blocks dangerous functions (`pg_sleep`, `dblink`).
3. **Automated `LIMIT` Enforcement:** Appends or clamps `LIMIT 50` to prevent memory exhaustion or denial of service.
4. **Database Role Permissions (`analytics_reader`):** Physical database user configured with `GRANT SELECT` only on approved business tables. DDL and write operations are physically rejected by the PostgreSQL engine even if application code had bugs.
5. **Runtime Query Timeouts:** `SET statement_timeout = '3000ms'` kills slow or stalling queries.

---

## 2. Realistic Interview Questions & Model Answers

### Q1: How do you prevent hallucinations in your RAG pipeline?
> **Answer:** *"No RAG pipeline completely eliminates hallucinations, but AgentIQ minimizes them through three coordinated mechanisms: First, vector retrieval applies a strict cosine similarity threshold (e.g. 0.45-0.65). If no chunks meet this cutoff, the system short-circuits with an explicit 'insufficient evidence' notification rather than guessing. Second, our system prompt strictly restricts the LLM to the delimited `<context>` block and requires citations for every factual claim. Third, our post-generation parser validates that every cited document ID and page number exists in the retrieved chunks."*

### Q2: What happens if an adversary attempts SQL injection through the agent?
> **Answer:** *"AgentIQ uses defense-in-depth. We do not pass natural language directly into raw SQL execution. For preset queries, queries are parameterized. For custom analytical SQL, we parse the query into an Abstract Syntax Tree (AST) using `sqlglot`. We reject multiple statements, enforce that the root statement is a SELECT, verify that all table names are in our whitelist of approved business tables, and clamp the row limit to 50. Furthermore, execution occurs under a dedicated PostgreSQL role (`analytics_reader`) that lacks write or DDL privileges."*

### Q3: How do you measure the quality and retrieval performance of the RAG system?
> **Answer:** *"We built an automated evaluation framework (`runner.py`) running against a curated benchmark dataset. We measure:
> 1. **Recall@k (k=1, 3):** Whether the ground-truth chunk was successfully retrieved in the top-k results.
> 2. **Citation Faithfulness:** The percentage of citations accurately pointing to the source document and page without fabrication.
> 3. **Hallucination Refusal Rate:** True Positive rate on negative test cases where the model must acknowledge lack of evidence.
> 4. **SQL Guardrail Accuracy:** Rejection rate of adversarial queries."*

### Q4: How does LangGraph improve over traditional agent frameworks?
> **Answer:** *"Traditional agent loops are often black boxes with unpredictable looping behavior. LangGraph models the agent as a directed StateGraph with explicit state definitions, deterministic transition conditions, and hard execution bounds. We enforce a maximum step limit ($N=4$), guaranteeing that the agent cannot recurse infinitely or exhaust API budgets."*

