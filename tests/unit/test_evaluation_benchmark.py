"""Unit test ensuring the benchmark evaluation suite executes successfully and maintains quality thresholds."""

from app.evaluation.runner import run_evaluation


def test_benchmark_evaluation_suite():
    results = run_evaluation()

    assert results is not None
    assert "metrics" in results
    metrics = results["metrics"]

    # Verify quality thresholds
    assert metrics["retrieval_recall_at_1"] >= 0.80
    assert metrics["citation_faithfulness"] >= 0.80
    assert metrics["hallucination_refusal_rate"] == 1.0
    assert metrics["sql_guardrail_accuracy"] == 1.0
    assert metrics["mean_latency_ms"] < 100.0
