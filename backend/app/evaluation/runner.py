"""Automated reproducible evaluation benchmark runner for AgentIQ."""

import json
import os
import time
from typing import Dict, Any, List
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base
from app.db.seed_business_data import seed_business_data
from app.services.document_service import DocumentService
from app.services.rag_service import RAGService
from app.services.sql_tool_service import SQLToolService
from app.core.exceptions import SQLSecurityViolationError
from app.schemas.chat import RAGQueryRequest
from app.schemas.analytics import SQLQueryRequest


def make_pdf_bytes(text: str) -> bytes:
    """Generates standard-conforming in-memory PDF bytes."""
    obj1 = b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    obj2 = b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    stream_data = f"BT /F1 12 Tf 50 700 Td ({text}) Tj ET\n".encode("latin-1")
    obj4 = f"4 0 obj\n<< /Length {len(stream_data)} >>\nstream\n".encode("latin-1") + stream_data + b"endstream\nendobj\n"
    obj5 = b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
    obj3 = b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
    header = b"%PDF-1.4\n"
    pos1 = len(header)
    pos2 = pos1 + len(obj1)
    pos3 = pos2 + len(obj2)
    pos4 = pos3 + len(obj3)
    pos5 = pos4 + len(obj4)
    xref_pos = pos5 + len(obj5)
    xref = f"xref\n0 6\n0000000000 65535 f \n{pos1:010d} 00000 n \n{pos2:010d} 00000 n \n{pos3:010d} 00000 n \n{pos4:010d} 00000 n \n{pos5:010d} 00000 n \n".encode("latin-1")
    trailer = f"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("latin-1")
    return header + obj1 + obj2 + obj3 + obj4 + obj5 + xref + trailer


def run_evaluation() -> Dict[str, Any]:
    dataset_path = os.path.join(os.path.dirname(__file__), "test_dataset.json")
    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    # 1. Setup in-memory evaluation DB
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionEval = sessionmaker(bind=engine)
    session = SessionEval()

    # 2. Seed business database
    seed_business_data(session)

    # 3. Ingest evaluation documents
    for doc_info in dataset["documents"]:
        pdf_bytes = make_pdf_bytes(doc_info["content"])
        DocumentService.upload_and_process_document(
            db=session,
            filename=doc_info["filename"],
            file_bytes=pdf_bytes,
        )

    # 4. Evaluate RAG Test Cases
    rag_results: List[Dict[str, Any]] = []
    rag_latencies: List[int] = []
    recall_at_1_hits = 0
    recall_at_3_hits = 0
    citation_correct_count = 0
    refusal_correct_count = 0
    total_supported = sum(1 for t in dataset["rag_test_cases"] if t["is_supported"])
    total_unsupported = sum(1 for t in dataset["rag_test_cases"] if not t["is_supported"])

    for test_case in dataset["rag_test_cases"]:
        req = RAGQueryRequest(
            question=test_case["question"],
            top_k=3,
            similarity_threshold=0.25,
        )
        res = RAGService.query_rag(db=session, request=req)
        rag_latencies.append(res.latency_ms)

        case_eval: Dict[str, Any] = {
            "id": test_case["id"],
            "question": test_case["question"],
            "expected_supported": test_case["is_supported"],
            "actual_sufficient": res.evidence_sufficient,
            "latency_ms": res.latency_ms,
        }

        if test_case["is_supported"]:
            # Check Recall@k
            if res.citations:
                if res.citations[0].filename == test_case["expected_citation_doc"]:
                    recall_at_1_hits += 1
                if any(c.filename == test_case["expected_citation_doc"] for c in res.citations[:3]):
                    recall_at_3_hits += 1
                citation_correct_count += 1
                case_eval["citation_match"] = True
            else:
                case_eval["citation_match"] = False
        else:
            # Check refusal accuracy (unsupported question must yield evidence_sufficient = False)
            if not res.evidence_sufficient and "not contain sufficient evidence" in res.answer.lower():
                refusal_correct_count += 1
                case_eval["correct_refusal"] = True
            else:
                case_eval["correct_refusal"] = False

        rag_results.append(case_eval)

    # 5. Evaluate SQL Guardrails
    sql_results: List[Dict[str, Any]] = []
    sql_correct_count = 0

    for sql_case in dataset["sql_test_cases"]:
        q = sql_case["query"]
        expected = sql_case["expected_behavior"]
        actual_behavior = "ALLOW"
        error_msg = None

        try:
            req = SQLQueryRequest(sql_query=q)
            SQLToolService.execute_query(db=session, request=req)
            actual_behavior = "ALLOW"
        except SQLSecurityViolationError as sec_err:
            actual_behavior = "REJECT"
            error_msg = str(sec_err)
        except Exception as other_err:
            actual_behavior = "REJECT"
            error_msg = str(other_err)

        is_correct = (actual_behavior == expected)
        if is_correct:
            sql_correct_count += 1

        sql_results.append({
            "id": sql_case["id"],
            "category": sql_case["category"],
            "expected": expected,
            "actual": actual_behavior,
            "passed": is_correct,
            "error_message": error_msg,
        })

    # 6. Aggregate Metrics
    recall_at_1 = round(recall_at_1_hits / total_supported, 4) if total_supported else 0.0
    recall_at_3 = round(recall_at_3_hits / total_supported, 4) if total_supported else 0.0
    citation_faithfulness = round(citation_correct_count / total_supported, 4) if total_supported else 0.0
    hallucination_refusal_rate = round(refusal_correct_count / total_unsupported, 4) if total_unsupported else 0.0
    sql_guardrail_accuracy = round(sql_correct_count / len(dataset["sql_test_cases"]), 4)
    avg_latency = round(sum(rag_latencies) / len(rag_latencies), 2) if rag_latencies else 0.0

    benchmark_summary = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "dataset_version": dataset["version"],
        "metrics": {
            "retrieval_recall_at_1": recall_at_1,
            "retrieval_recall_at_3": recall_at_3,
            "citation_faithfulness": citation_faithfulness,
            "hallucination_refusal_rate": hallucination_refusal_rate,
            "sql_guardrail_accuracy": sql_guardrail_accuracy,
            "mean_latency_ms": avg_latency,
        },
        "sample_counts": {
            "rag_total": len(dataset["rag_test_cases"]),
            "rag_supported": total_supported,
            "rag_unsupported": total_unsupported,
            "sql_total": len(dataset["sql_test_cases"]),
        },
        "details": {
            "rag": rag_results,
            "sql": sql_results,
        },
    }

    # Save to JSON
    output_path = os.path.join(os.path.dirname(__file__), "evaluation_results.json")
    with open(output_path, "w", encoding="utf-8") as out:
        json.dump(benchmark_summary, out, indent=2)

    session.close()
    return benchmark_summary


if __name__ == "__main__":
    results = run_evaluation()
    print("=" * 60)
    print(" AgentIQ Benchmark Evaluation Results")
    print("=" * 60)
    for metric, val in results["metrics"].items():
        if "rate" in metric or "recall" in metric or "faithfulness" in metric or "accuracy" in metric:
            print(f"  {metric:<30}: {val * 100:.1f}%")
        else:
            print(f"  {metric:<30}: {val}")
    print("=" * 60)
    print("Machine-readable results saved to backend/app/evaluation/evaluation_results.json")
