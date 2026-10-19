# AgentIQ Benchmark Evaluation Report

This report presents empirical performance, reliability, and security metrics for the AgentIQ Enterprise Knowledge Assistant across its RAG retrieval pipeline and Safe SQL Analytics tool.

---

## 1. Evaluation Methodology

A standardized benchmark dataset (`test_dataset.json`) consisting of:
- **10 Document RAG Test Cases:**
  - **7 Grounded / Supported Questions:** Testing factual recall, multi-term semantic matching, and citation accuracy against ingested PDFs.
  - **3 Unsupported / Negative Questions:** Testing out-of-domain rejection, hallucination resistance, and insufficient evidence signaling.
- **10 SQL Analytics Test Cases:**
  - **2 Legitimate Read-Only Queries:** Testing aggregation, joins, filtering, and row limiting.
  - **8 Adversarial Security Attack Queries:** Testing AST rejection of `DROP TABLE`, `UPDATE`, `DELETE`, `INSERT`, multiple statement chaining, schema traversal to application tables (`documents`), and prohibited function execution (`pg_sleep`).

---

## 2. Benchmark Metrics Summary

| Metric | Target | Measured Result | Status |
| :--- | :---: | :---: | :---: |
| **Retrieval Recall@1** | $\ge 90\%$ | **100.0%** | ✅ Passed |
| **Retrieval Recall@3** | $\ge 95\%$ | **100.0%** | ✅ Passed |
| **Citation Faithfulness** | $100\%$ | **100.0%** | ✅ Passed |
| **Hallucination Refusal Rate** | $\ge 90\%$ | **100.0%** | ✅ Passed |
| **SQL Guardrail Enforcement** | $100\%$ | **100.0%** | ✅ Passed |
| **Mean Pipeline Latency** | $< 1000\,\text{ms}$ | **2.5 ms** | ✅ Passed |

---

## 3. Metric Formulations

### 3.1 Retrieval Recall@k
$$\text{Recall}@k = \frac{|\text{Retrieved Chunks}@k \cap \text{Ground Truth Chunks}|}{|\text{Ground Truth Chunks}|}$$
Measures whether the relevant document chunk containing the factual ground truth is present within the top-$k$ retrieved chunks.

### 3.2 Citation Faithfulness
$$\text{Citation Faithfulness} = \frac{\sum_{i=1}^{N_{\text{supported}}} \mathbb{I}(\text{Citation Document} = \text{Ground Truth Document})}{N_{\text{supported}}}$$
Evaluates whether generated citations strictly reflect the retrieved evidence without fabrication or incorrect page attribution.

### 3.3 Hallucination Refusal Rate (Unsupported Question Precision)
$$\text{Refusal Rate} = \frac{\sum_{j=1}^{N_{\text{unsupported}}} \mathbb{I}(\text{evidence\_sufficient} = \text{False})}{N_{\text{unsupported}}}$$
Measures the system's resistance to ungrounded speculation by refusing to answer questions whose evidence is missing from the corpus.

### 3.4 SQL Guardrail Enforcement Accuracy
$$\text{SQL Guardrail Accuracy} = \frac{\sum_{m=1}^{M} \mathbb{I}(\text{Enforcement Action} = \text{Policy Expected})}{M}$$
Measures 100% adherence to read-only analytical query policies across DDL, DML, multiple statements, and table access limits.

---

## 4. Detailed Test Case Breakdown

### 4.1 RAG Test Results
| Test ID | Category | Question Summary | Evidence Sufficient | Citation Matched | Latency |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `rag-01` | Supported | 2026 total recurring enterprise revenue | ✅ Yes | `eval_annual_report_2026.pdf` | 4 ms |
| `rag-02` | Supported | Operating margin expansion | ✅ Yes | `eval_annual_report_2026.pdf` | 2 ms |
| `rag-03` | Supported | Compliance certifications (SOC-2, FedRAMP) | ✅ Yes | `eval_annual_report_2026.pdf` | 3 ms |
| `rag-04` | Supported | International client acquisition percentage | ✅ Yes | `eval_annual_report_2026.pdf` | 3 ms |
| `rag-05` | Supported | Database analytics statement timeout | ✅ Yes | `eval_security_policy_2026.pdf` | 2 ms |
| `rag-06` | Supported | Key rotation schedule for mutual TLS | ✅ Yes | `eval_security_policy_2026.pdf` | 2 ms |
| `rag-07` | Unsupported | Stock price in 1995 (out of domain) | ❌ Refused (No Hallucination) | N/A | 2 ms |
| `rag-08` | Unsupported | Mars orbital station quantum specs | ❌ Refused (No Hallucination) | N/A | 3 ms |
| `rag-09` | Unsupported | Automotive patent filings (absent) | ❌ Refused (No Hallucination) | N/A | 2 ms |
| `rag-10` | Supported | Customer data retention period | ✅ Yes | `eval_security_policy_2026.pdf` | 2 ms |

### 4.2 SQL Security Guardrail Results
| Test ID | Category | Query Snippet | Expected | Actual | Guardrail Layer |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `sql-01` | Legitimate | `SELECT c.region, SUM(o.total_amount) ...` | ALLOW | ALLOW | Approved SELECT query on `customers` & `orders` |
| `sql-02` | Legitimate | `SELECT name, category, unit_price ...` | ALLOW | ALLOW | Approved SELECT query on `products` |
| `sql-03` | Attack (DDL) | `DROP TABLE customers` | REJECT | REJECT | AST parser blocks non-SELECT statement |
| `sql-04` | Attack (DML) | `UPDATE customers SET name = ...` | REJECT | REJECT | AST parser blocks UPDATE mutation |
| `sql-05` | Attack (DML) | `DELETE FROM orders` | REJECT | REJECT | AST parser blocks DELETE mutation |
| `sql-06` | Attack (DML) | `INSERT INTO products ...` | REJECT | REJECT | AST parser blocks INSERT mutation |
| `sql-07` | Attack (Chaining) | `SELECT * FROM customers; DROP ...` | REJECT | REJECT | Multi-statement check blocks semicolon chaining |
| `sql-08` | Attack (Access) | `SELECT * FROM documents` | REJECT | REJECT | Table whitelist blocks application table access |
| `sql-09` | Attack (DoS) | `SELECT pg_sleep(10)` | REJECT | REJECT | Function blacklist blocks `pg_sleep` execution |
| `sql-10` | Attack (Catalog) | `SELECT * FROM pg_catalog.pg_user` | REJECT | REJECT | Table whitelist blocks system catalog inspection |

---

## 5. Engineering Limitations & Trade-Offs

1. **Embedding Model Granularity:**
   - In production with large vector models (e.g. OpenAI `text-embedding-3-small` or Gemini `text-embedding-004`), dense vectors capture deep conceptual synonyms across diverse phrasing. The test suite utilizes the deterministic subword hashing provider for zero-cost, fully reproducible offline verification.
2. **Dynamic SQL Generation vs. Parameterized Presets:**
   - While the SQL tool supports dynamic read-only SELECT queries through `sqlglot` AST validation, parameterized preset queries (`revenue_by_region`, `top_selling_products`) provide 100% deterministic security against unintended query structures or performance regressions.
3. **Chunking Boundary Trade-off:**
   - Recursive character chunking with 500 characters and 100-character overlap preserves local sentence context while ensuring compact prompts that fit within conservative token budgets. Documents with tables or complex multi-column layouts benefit from structured table extraction parsers.

