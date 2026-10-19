"""Custom SQLAlchemy column types supporting pgvector and SQLite fallback."""

from typing import List, Optional
import json
from sqlalchemy import TypeDecorator, Text
from pgvector.sqlalchemy import Vector


class CompatibleVector(TypeDecorator):
    """Type decorator that utilizes native pgvector Vector on PostgreSQL

    and falls back to JSON-serialized string on SQLite/other dialects for unit testing.
    """

    impl = Text
    cache_ok = True

    def __init__(self, dim: int = 1536, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.dim = dim

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(Vector(self.dim))
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value: Optional[List[float]], dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        # For SQLite / non-PostgreSQL dialects, serialize to JSON
        return json.dumps(value)

    def process_result_value(self, value, dialect) -> Optional[List[float]]:
        if value is None:
            return None
        if dialect.name == "postgresql":
            # pgvector returns numpy array or list
            if hasattr(value, "tolist"):
                return value.tolist()
            return list(value)
        if isinstance(value, str):
            return json.loads(value)
        return value
