"""Unit tests for PDF extraction and validation."""

import io
import pytest
from pypdf import PdfWriter
from app.services.pdf_extractor import PDFExtractor
from app.core.exceptions import InvalidFileError, DocumentProcessingError


def test_reject_non_pdf_file():
    """Verifies that files lacking '%PDF-' magic bytes are immediately rejected."""
    bad_bytes = b"Hello world! This is a plain text file pretending to be a PDF."
    with pytest.raises(InvalidFileError, match="Invalid PDF signature"):
        PDFExtractor.extract_pages(bad_bytes)


def test_reject_empty_bytes():
    """Verifies rejection of empty file buffer."""
    with pytest.raises(InvalidFileError):
        PDFExtractor.extract_pages(b"")


def test_extract_valid_pdf_structure():
    """Verifies extraction on a valid generated PDF buffer."""
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buffer = io.BytesIO()
    writer.write(buffer)
    pdf_bytes = buffer.getvalue()

    pages = PDFExtractor.extract_pages(pdf_bytes)
    assert len(pages) == 1
    page_num, text = pages[0]
    assert page_num == 1
    assert isinstance(text, str)


def test_malformed_pdf_handling():
    """Verifies that corrupt PDF bytes starting with %PDF- but invalid body are caught cleanly."""
    corrupt_bytes = b"%PDF-1.4\nCorrupted binary garbage that cannot be parsed %%EOF"
    with pytest.raises(DocumentProcessingError, match="Corrupted or malformed PDF file"):
        PDFExtractor.extract_pages(corrupt_bytes)
