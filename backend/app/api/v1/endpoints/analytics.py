"""SQL Analytics API endpoints."""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_analytics_db
from app.services.sql_tool_service import SQLToolService
from app.schemas.analytics import SQLQueryRequest, SQLQueryResponse, PresetQueryInfo

router = APIRouter(prefix="/analytics", tags=["SQL Analytics"])


@router.post(
    "/query",
    response_model=SQLQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute Safe Analytical SQL Query",
    description="Executes a read-only SELECT query against approved business tables protected by AST parsing and row limits.",
)
def execute_sql_query(
    request: SQLQueryRequest,
    db: Session = Depends(get_analytics_db),
) -> SQLQueryResponse:
    return SQLToolService.execute_query(db=db, request=request)


@router.get(
    "/presets",
    response_model=List[PresetQueryInfo],
    summary="List Predefined Analytics Queries",
    description="Returns available parameterized queries that can be executed safely.",
)
def list_preset_queries() -> List[PresetQueryInfo]:
    presets = []
    for q_id, q_data in SQLToolService.PRESET_QUERIES.items():
        presets.append(
            PresetQueryInfo(
                id=q_id,
                name=q_data["name"],
                description=q_data["description"],
                allowed_params=q_data["allowed_params"],
            )
        )
    return presets


@router.get(
    "/schema",
    summary="Get Allowed Business Database Schema",
    description="Returns schema metadata of tables and columns approved for SQL analytics.",
)
def get_allowed_schema() -> Dict[str, Any]:
    return {
        "allowed_tables": [
            {
                "table_name": "customers",
                "description": "Enterprise customer accounts",
                "columns": ["id (INT)", "name (VARCHAR)", "email (VARCHAR)", "region (VARCHAR)", "created_at (TIMESTAMP)"],
            },
            {
                "table_name": "products",
                "description": "Product catalog and unit pricing",
                "columns": ["id (INT)", "sku (VARCHAR)", "name (VARCHAR)", "category (VARCHAR)", "unit_price (NUMERIC)", "is_active (BOOLEAN)"],
            },
            {
                "table_name": "orders",
                "description": "Customer purchase orders",
                "columns": ["id (INT)", "customer_id (INT)", "order_date (DATE)", "status (VARCHAR)", "total_amount (NUMERIC)"],
            },
            {
                "table_name": "order_items",
                "description": "Line items associated with orders",
                "columns": ["id (INT)", "order_id (INT)", "product_id (INT)", "quantity (INT)", "unit_price (NUMERIC)", "subtotal (NUMERIC)"],
            },
        ],
        "security_rules": [
            "Only SELECT queries are permitted",
            "Single statement only; multiple/chained statements are rejected",
            "Automatic limit of 50 rows enforced",
            "Executed with least-privilege analytics_reader role",
        ],
    }
