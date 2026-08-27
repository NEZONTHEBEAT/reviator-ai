from sqlalchemy import Column, String

from app.core.database import Base


class CustomerDB(Base):

    __tablename__ = "customers"

    customer_id = Column(
        String,
        primary_key=True,
        index=True,
    )

    name = Column(
        String,
        nullable=True,
    )

    email = Column(
        String,
        nullable=True,
    )