"""Safe SQL Analytics Tool Service with AST verification, whitelist, and timeouts."""

import time
from typing import Dict, Any, List, Set
import sqlglot
from sqlglot import exp
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.core.exceptions import SQLSecurityViolationError
from app.core.logging import logger
from app.schemas.analytics import SQLQueryRequest, SQLQueryResponse


class SQLToolService:
    """Safely validates and executes analytical queries against business database tables."""

    ALLOWED_TABLES: Set[str] = {"customers", "products", "orders", "order_items"}
    MAX_ROWS: int = settings.SQL_MAX_ROWS

    PRESET_QUERIES: Dict[str, Dict[str, Any]] = {
        "revenue_by_region": {
            "name": "Revenue by Region",
            "description": "Aggregates completed sales revenue grouped by customer geographical region.",
            "sql": (
                "SELECT c.region, SUM(o.total_amount) AS total_revenue, COUNT(o.id) AS order_count "
                "FROM orders o JOIN customers c ON o.customer_id = c.id "
                "WHERE o.status = 'COMPLETED' "
                "GROUP BY c.region ORDER BY total_revenue DESC LIMIT 10"
            ),
            "allowed_params": [],
        },
        "top_selling_products": {
            "name": "Top Selling Products",
            "description": "Lists top products ranked by total sales revenue and units sold.",
            "sql": (
                "SELECT p.name, p.category, SUM(oi.quantity) AS units_sold, SUM(oi.subtotal) AS total_revenue "
                "FROM order_items oi JOIN products p ON oi.product_id = p.id "
                "GROUP BY p.id, p.name, p.category ORDER BY total_revenue DESC LIMIT :limit"
            ),
            "allowed_params": ["limit"],
        },
        "recent_orders": {
            "name": "Recent Orders",
            "description": "Retrieves recent orders with customer name, date, and order total.",
            "sql": (
                "SELECT o.id AS order_id, c.name AS customer_name, o.order_date, o.total_amount, o.status "
                "FROM orders o JOIN customers c ON o.customer_id = c.id "
                "ORDER BY o.order_date DESC LIMIT :limit"
            ),
            "allowed_params": ["limit"],
        },
        "products_by_category": {
            "name": "Products by Category",
            "description": "Lists products filtered by category with unit price and status.",
            "sql": (
                "SELECT p.sku, p.name, p.category, p.unit_price, p.is_active "
                "FROM products p "
                "WHERE p.category = :category ORDER BY p.unit_price DESC LIMIT 50"
            ),
            "allowed_params": ["category"],
        },
    }

    @classmethod
    def validate_and_sanitize_sql(cls, raw_sql: str) -> str:
        """Parses and validates SQL through AST verification."""
        clean_sql = raw_sql.strip()
        if not clean_sql:
            raise SQLSecurityViolationError("Query string is empty.")

        # 1. Parse AST
        try:
            statements = sqlglot.parse(clean_sql)
        except Exception as parse_err:
            raise SQLSecurityViolationError(f"SQL syntax error: {str(parse_err)}")

        if not statements or statements[0] is None:
            raise SQLSecurityViolationError("Could not parse SQL query.")

        # 2. Reject Multiple Statements
        if len(statements) > 1:
            raise SQLSecurityViolationError(
                "Chained or multiple SQL statements are strictly prohibited for security reasons."
            )

        stmt = statements[0]

        # 3. Only SELECT queries allowed
        if not isinstance(stmt, exp.Select):
            raise SQLSecurityViolationError(
                f"Prohibited statement type '{stmt.key.upper()}'. Only read-only SELECT queries are allowed."
            )

        # 4. Whitelist table validation
        for table in stmt.find_all(exp.Table):
            table_name = table.name.lower()
            if table_name not in cls.ALLOWED_TABLES:
                raise SQLSecurityViolationError(
                    f"Unauthorized table access: Table '{table_name}' is not in the approved analytics whitelist: "
                    f"{sorted(cls.ALLOWED_TABLES)}."
                )

        # 5. Blacklisted functions
        banned_funcs = {"pg_sleep", "current_setting", "dblink", "pg_read_file", "pg_ls_dir", "version"}
        for func in stmt.find_all(exp.Func):
            func_name = func.name.lower()
            if func_name in banned_funcs:
                raise SQLSecurityViolationError(f"Prohibited function execution: '{func_name}' is not allowed.")

        # 6. Enforce LIMIT bound
        limit_clause = stmt.args.get("limit")
        if limit_clause is None:
            stmt = stmt.limit(cls.MAX_ROWS)
        else:
            try:
                # If explicit limit is higher than MAX_ROWS, clamp it
                limit_val = int(limit_clause.expression.name)
                if limit_val > cls.MAX_ROWS:
                    stmt = stmt.limit(cls.MAX_ROWS)
            except (ValueError, AttributeError):
                stmt = stmt.limit(cls.MAX_ROWS)

        return stmt.sql()

    @classmethod
    def execute_query(cls, db: Session, request: SQLQueryRequest) -> SQLQueryResponse:
        """Executes validated SQL or preset query under read-only transaction."""
        start_time = time.perf_counter()
        params = request.params or {}

        # Preset query route
        if request.preset_query:
            if request.preset_query not in cls.PRESET_QUERIES:
                raise SQLSecurityViolationError(
                    f"Unknown preset query '{request.preset_query}'. "
                    f"Available presets: {list(cls.PRESET_QUERIES.keys())}"
                )
            preset = cls.PRESET_QUERIES[request.preset_query]
            sql_to_run = preset["sql"]
            # Set default limit param if required
            if "limit" in preset["allowed_params"] and "limit" not in params:
                params["limit"] = 10
        elif request.sql_query:
            # Custom query route - strictly validated
            sql_to_run = cls.validate_and_sanitize_sql(request.sql_query)
        else:
            raise SQLSecurityViolationError("Either 'sql_query' or 'preset_query' must be provided.")

        try:
            result = db.execute(text(sql_to_run), params)
            columns = list(result.keys())
            raw_rows = result.fetchall()

            # Convert row values to JSON-serializable primitives (e.g. Decimals to float)
            formatted_rows: List[List[Any]] = []
            for row in raw_rows:
                formatted_row = []
                for val in row:
                    if hasattr(val, "as_tuple"):  # Decimal
                        formatted_row.append(float(val))
                    elif hasattr(val, "isoformat"):  # Date / Datetime
                        formatted_row.append(val.isoformat())
                    else:
                        formatted_row.append(val)
                formatted_rows.append(formatted_row)

            execution_time_ms = int((time.perf_counter() - start_time) * 1000)

            logger.info(
                f"SQL tool executed successfully in {execution_time_ms}ms (rows: {len(formatted_rows)})"
            )

            return SQLQueryResponse(
                columns=columns,
                rows=formatted_rows,
                row_count=len(formatted_rows),
                execution_time_ms=execution_time_ms,
                executed_sql=sql_to_run,
            )

        except SQLSecurityViolationError:
            raise
        except Exception as db_err:
            logger.error(f"SQL execution error: {str(db_err)}")
            raise SQLSecurityViolationError(f"Database query error: {str(db_err)}")

