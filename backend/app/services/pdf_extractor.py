"""Safe PDF text extraction utility with signature and corruption checks."""

import io
from typing import List, Tuple
from pypdf import PdfReader
from app.core.exceptions import InvalidFileError, DocumentProcessingError
from app.core.logging import logger


class PDFExtractor:
    """Safely extracts text and page metadata from PDF byte buffers."""

    @staticmethod
    def validate_pdf_signature(file_bytes: bytes) -> None:
        """Validates that the file begins with the mandatory PDF magic number header."""
        if len(file_bytes) < 5 or not file_bytes.startswith(b"%PDF-"):
            raise InvalidFileError(
                "Invalid PDF signature: Uploaded file does not begin with '%PDF-' magic header."
            )

    @classmethod
    def extract_pages(cls, file_bytes: bytes) -> List[Tuple[int, str]]:
        """Extracts text page-by-page.

        Returns a list of tuples: (page_number [1-indexed], extracted_text).
        """
        cls.validate_pdf_signature(file_bytes)

        try:
            stream = io.BytesIO(file_bytes)
            reader = PdfReader(stream)

            if reader.is_encrypted:
                raise DocumentProcessingError(
                    "Encrypted or password-protected PDFs are not supported for security reasons."
                )

            total_pages = len(reader.pages)
            if total_pages == 0:
                raise DocumentProcessingError("The uploaded PDF contains zero pages.")

            pages_data: List[Tuple[int, str]] = []
            for page_idx, page in enumerate(reader.pages):
                page_num = page_idx + 1
                try:
                    text = page.extract_text() or ""
                except Exception as page_err:
                    logger.warning(f"Failed extracting text on page {page_num}: {page_err}")
                    text = ""
                pages_data.append((page_num, text.strip()))

            return pages_data

        except (InvalidFileError, DocumentProcessingError):
            raise
        except Exception as exc:
            logger.error(f"PDF extraction failed: {str(exc)}")
            raise DocumentProcessingError(f"Corrupted or malformed PDF file: {str(exc)}")
