"""SQLAlchemy models for enterprise business data (Safe SQL Analytics Tool)."""

from datetime import datetime, date, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Numeric,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    CheckConstraint,
)
from sqlalchemy.orm import relationship
from app.db.session import Base


def get_utc_now():
    return datetime.now(timezone.utc)


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=False, unique=True, index=True)
    region = Column(String(50), nullable=False)  # 'North America', 'EMEA', 'APAC', 'LATAM'
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    orders = relationship("Order", back_populates="customer")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sku = Column(String(50), nullable=False, unique=True, index=True)
    name = Column(String(150), nullable=False)
    category = Column(String(100), nullable=False)  # 'Software', 'Hardware', 'Services', 'Subscriptions'
    unit_price = Column(Numeric(10, 2), nullable=False)
    is_active = Column(Boolean, default=True)

    order_items = relationship("OrderItem", back_populates="product")

    __table_args__ = (
        CheckConstraint("unit_price >= 0", name="chk_product_unit_price"),
    )


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    order_date = Column(Date, nullable=False, default=date.today, index=True)
    status = Column(String(50), nullable=False, default="COMPLETED")  # 'COMPLETED', 'PENDING', 'CANCELLED'
    total_amount = Column(Numeric(12, 2), nullable=False, default=0.00)

    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

    __table_args__ = (
        CheckConstraint("quantity > 0", name="chk_order_item_quantity"),
    )

