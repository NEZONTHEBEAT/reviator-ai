from sqlalchemy import Column, Float, String

from app.core.database import Base


class RecoveryActionDB(Base):

    __tablename__ = "recovery_actions"

    action_id = Column(
        String,
        primary_key=True,
        index=True,
    )

    transaction_id = Column(
        String,
        nullable=False,
        index=True,
    )

    customer_id = Column(
        String,
        nullable=False,
        index=True,
    )

    action = Column(
        String,
        nullable=False,
    )

    channel = Column(
        String,
        nullable=False,
    )

    amount = Column(
        Float,
        nullable=False,
    )

    status = Column(
        String,
        nullable=False,
        default="created",
    )