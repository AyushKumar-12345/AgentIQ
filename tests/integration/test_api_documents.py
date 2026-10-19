"""Integration tests for Document Management API endpoints."""

import io
from fastapi import status


def test_upload_valid_pdf_document(client, make_sample_pdf):
    """Verifies successful upload, chunking, embedding, and indexing of a PDF."""
    pdf_bytes = make_sample_pdf("AgentIQ quarterly financial analysis. Revenue increased 18 percent.")
    files = {"file": ("q3_financial.pdf", io.BytesIO(pdf_bytes), "application/pdf")}

    response = client.post("/api/v1/documents/upload", files=files)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["filename"] == "q3_financial.pdf"
    assert data["status"] == "INDEXED"
    assert len(data["file_hash"]) == 64
    assert "id" in data


def test_list_and_get_document(client, make_sample_pdf):
    """Verifies listing documents and retrieving single document details."""
    pdf_bytes = make_sample_pdf("Strategic technical roadmap. Milestone one complete.")
    files = {"file": ("roadmap.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    upload_res = client.post("/api/v1/documents/upload", files=files)
    doc_id = upload_res.json()["id"]

    # List
    list_res = client.get("/api/v1/documents")
    assert list_res.status_code == status.HTTP_200_OK
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(d["id"] == doc_id for d in list_data["items"])

    # Get by ID
    get_res = client.get(f"/api/v1/documents/{doc_id}")
    assert get_res.status_code == status.HTTP_200_OK
    doc_data = get_res.json()
    assert doc_data["id"] == doc_id
    assert doc_data["filename"] == "roadmap.pdf"
    assert doc_data["total_chunks"] >= 1
    assert doc_data["total_pages"] == 1


def test_duplicate_upload_rejection(client, make_sample_pdf):
    """Verifies that uploading the exact same document twice is caught as duplicate."""
    pdf_bytes = make_sample_pdf("Deterministic duplicate content for hashing test.")
    files1 = {"file": ("duplicate_original.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    res1 = client.post("/api/v1/documents/upload", files=files1)
    assert res1.status_code == status.HTTP_201_CREATED

    files2 = {"file": ("duplicate_copy.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    res2 = client.post("/api/v1/documents/upload", files=files2)
    assert res2.status_code == status.HTTP_400_BAD_REQUEST
    err_data = res2.json()
    assert err_data["error"] == "DuplicateDocumentError"
    assert "Duplicate upload detected" in err_data["message"]


def test_reject_invalid_file_signature(client):
    """Verifies that uploading a non-PDF file returns a 400 Bad Request error."""
    bad_bytes = b"Plain text file content without PDF header"
    files = {"file": ("malicious.pdf", io.BytesIO(bad_bytes), "application/pdf")}
    res = client.post("/api/v1/documents/upload", files=files)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    data = res.json()
    assert data["error"] == "InvalidFileError"
    assert "Invalid PDF signature" in data["message"]


def test_delete_document_lifecycle(client, make_sample_pdf):
    """Verifies deletion removes the document and its cascades."""
    pdf_bytes = make_sample_pdf("Document to be deleted.")
    files = {"file": ("to_delete.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    upload_res = client.post("/api/v1/documents/upload", files=files)
    doc_id = upload_res.json()["id"]

    # Delete
    del_res = client.delete(f"/api/v1/documents/{doc_id}")
    assert del_res.status_code == status.HTTP_200_OK

    # Verify 404 on subsequent get
    get_res = client.get(f"/api/v1/documents/{doc_id}")
    assert get_res.status_code == status.HTTP_404_NOT_FOUND


def test_reindex_document(client, make_sample_pdf):
    """Verifies re-indexing an existing document."""
    pdf_bytes = make_sample_pdf("Content for reindexing verification.")
    files = {"file": ("reindex_target.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    upload_res = client.post("/api/v1/documents/upload", files=files)
    doc_id = upload_res.json()["id"]

    reindex_res = client.post(f"/api/v1/documents/{doc_id}/reindex")
    assert reindex_res.status_code == status.HTTP_200_OK
    assert reindex_res.json()["status"] == "INDEXED"
