"""Synthetic business database seeder for Safe SQL Analytics."""

from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine, Base
from app.models.business import Customer, Product, Order, OrderItem
from app.core.logging import logger


def seed_business_data(db: Session) -> None:
    """Seeds realistic enterprise business records if tables are empty."""
    # Check if already seeded
    if db.query(Customer).first() is not None:
        logger.info("Business database already contains records. Skipping seed.")
        return

    logger.info("Seeding enterprise business database...")

    # 1. Customers
    customers = [
        Customer(name="Acme Global Corp", email="procurement@acmeglobal.com", region="North America"),
        Customer(name="Nexus Logistics GmbH", email="it@nexuslogistics.de", region="EMEA"),
        Customer(name="Pacific Dynamic Ltd", email="ops@pacificdynamic.jp", region="APAC"),
        Customer(name="Sao Paulo Retail SA", email="compras@spretail.br", region="LATAM"),
        Customer(name="Apex Financial Partners", email="fintech@apexpartners.com", region="North America"),
    ]
    db.add_all(customers)
    db.flush()

    # 2. Products
    products = [
        Product(sku="SW-ENT-001", name="Enterprise Intelligence Suite", category="Software", unit_price=Decimal("12000.00")),
        Product(sku="SW-SEC-002", name="ZeroTrust Security Gateway", category="Software", unit_price=Decimal("8500.00")),
        Product(sku="HW-SRV-101", name="Edge AI Inference Server 2U", category="Hardware", unit_price=Decimal("15000.00")),
        Product(sku="HW-NET-102", name="100GbE High-Throughput Switch", category="Hardware", unit_price=Decimal("4500.00")),
        Product(sku="SUB-CLD-201", name="Cloud Infrastructure Tier A", category="Subscriptions", unit_price=Decimal("2500.00")),
        Product(sku="SUB-CLD-202", name="Cloud Infrastructure Tier B", category="Subscriptions", unit_price=Decimal("5000.00")),
        Product(sku="SRV-CON-301", name="Enterprise AI Architecture Consulting", category="Services", unit_price=Decimal("20000.00")),
        Product(sku="SRV-MNT-302", name="24/7 Dedicated Platinum Support", category="Services", unit_price=Decimal("6000.00")),
    ]
    db.add_all(products)
    db.flush()

    # 3. Orders & Order Items
    order1 = Order(
        customer_id=customers[0].id,
        order_date=date(2026, 3, 15),
        status="COMPLETED",
        total_amount=Decimal("27000.00"),
    )
    db.add(order1)
    db.flush()
    db.add_all([
        OrderItem(order_id=order1.id, product_id=products[0].id, quantity=1, unit_price=Decimal("12000.00"), subtotal=Decimal("12000.00")),
        OrderItem(order_id=order1.id, product_id=products[2].id, quantity=1, unit_price=Decimal("15000.00"), subtotal=Decimal("15000.00")),
    ])

    order2 = Order(
        customer_id=customers[1].id,
        order_date=date(2026, 4, 10),
        status="COMPLETED",
        total_amount=Decimal("14500.00"),
    )
    db.add(order2)
    db.flush()
    db.add_all([
        OrderItem(order_id=order2.id, product_id=products[1].id, quantity=1, unit_price=Decimal("8500.00"), subtotal=Decimal("8500.00")),
        OrderItem(order_id=order2.id, product_id=products[7].id, quantity=1, unit_price=Decimal("6000.00"), subtotal=Decimal("6000.00")),
    ])

    order3 = Order(
        customer_id=customers[2].id,
        order_date=date(2026, 5, 20),
        status="COMPLETED",
        total_amount=Decimal("35000.00"),
    )
    db.add(order3)
    db.flush()
    db.add_all([
        OrderItem(order_id=order3.id, product_id=products[2].id, quantity=1, unit_price=Decimal("15000.00"), subtotal=Decimal("15000.00")),
        OrderItem(order_id=order3.id, product_id=products[6].id, quantity=1, unit_price=Decimal("20000.00"), subtotal=Decimal("20000.00")),
    ])

    order4 = Order(
        customer_id=customers[3].id,
        order_date=date(2026, 6, 5),
        status="COMPLETED",
        total_amount=Decimal("10000.00"),
    )
    db.add(order4)
    db.flush()
    db.add_all([
        OrderItem(order_id=order4.id, product_id=products[4].id, quantity=4, unit_price=Decimal("2500.00"), subtotal=Decimal("10000.00")),
    ])

    order5 = Order(
        customer_id=customers[4].id,
        order_date=date(2026, 7, 18),
        status="COMPLETED",
        total_amount=Decimal("36000.00"),
    )
    db.add(order5)
    db.flush()
    db.add_all([
        OrderItem(order_id=order5.id, product_id=products[0].id, quantity=3, unit_price=Decimal("12000.00"), subtotal=Decimal("36000.00")),
    ])

    db.commit()
    logger.info("Enterprise business database successfully seeded.")


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed_business_data(session)

