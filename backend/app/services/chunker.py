"""Text splitting and recursive chunking utility for document ingestion."""

from typing import List, Optional


class RecursiveCharacterChunker:
    """Recursively splits text into overlapping chunks using hierarchical separators."""

    def __init__(
        self,
        chunk_size: int = 500,
        chunk_overlap: int = 100,
        separators: Optional[List[str]] = None,
    ):
        if chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be strictly less than chunk_size")
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", ". ", " ", ""]

    def split_text(self, text: str) -> List[str]:
        """Splits a document text into structured chunks respecting boundaries."""
        text = text.strip()
        if not text:
            return []

        if len(text) <= self.chunk_size:
            return [text]

        splits = self._split_recursive(text, self.separators)
        return self._merge_splits(splits)

    def _split_recursive(self, text: str, separators: List[str]) -> List[str]:
        """Recursively splits text until segments are smaller than chunk_size."""
        final_chunks: List[str] = []
        separator = separators[-1]
        new_separators: List[str] = []

        for i, sep in enumerate(separators):
            if sep == "":
                separator = ""
                break
            if sep in text:
                separator = sep
                new_separators = separators[i + 1:]
                break

        splits = text.split(separator) if separator != "" else list(text)

        for s in splits:
            if not s:
                continue
            if len(s) <= self.chunk_size:
                final_chunks.append(s)
            elif new_separators:
                final_chunks.extend(self._split_recursive(s, new_separators))
            else:
                # Direct character slicing fallback
                for start in range(0, len(s), self.chunk_size - self.chunk_overlap):
                    final_chunks.append(s[start:start + self.chunk_size])

        return final_chunks

    def _merge_splits(self, splits: List[str]) -> List[str]:
        """Merges small splits into coherent chunks up to chunk_size with overlap."""
        chunks: List[str] = []
        current_chunk: List[str] = []
        current_len = 0

        for piece in splits:
            piece_len = len(piece)
            if current_len + piece_len + 1 > self.chunk_size and current_chunk:
                # Finalize current chunk
                combined = " ".join(current_chunk).strip()
                if combined:
                    chunks.append(combined)

                # Keep overlap items from the tail
                overlap_items: List[str] = []
                overlap_len = 0
                for item in reversed(current_chunk):
                    if overlap_len + len(item) + 1 <= self.chunk_overlap:
                        overlap_items.insert(0, item)
                        overlap_len += len(item) + 1
                    else:
                        break

                current_chunk = overlap_items
                current_len = overlap_len

            current_chunk.append(piece)
            current_len += piece_len + 1

        if current_chunk:
            final_text = " ".join(current_chunk).strip()
            if final_text:
                chunks.append(final_text)

        return chunks
