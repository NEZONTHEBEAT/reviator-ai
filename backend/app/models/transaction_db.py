from sqlalchemy import Column, Float, String

from app.core.database import Base


class TransactionDB(Base):

    __tablename__ = "transactions"

    transaction_id = Column(
        String,
        primary_key=True,
        index=True,
    )

    customer_id = Column(
        String,
        nullable=False,
        index=True,
    )

    amount = Column(
        Float,
        nullable=False,
    )

    currency = Column(
        String,
        default="INR",
    )

    status = Column(
        String,
        nullable=False,
    )

    failure_reason = Column(
        String,
        nullable=True,
    )

    previous_successful_payments = Column(
        Float,
        nullable=True,
    )

    previous_failed_payments = Column(
        Float,
        nullable=True,
    )

    revenue_at_risk = Column(
        Float,
        nullable=True,
    )

    recovery_score = Column(
        Float,
        nullable=True,
    )

    recovery_probability = Column(
        Float,
        nullable=True,
    )

    recovery_priority = Column(
        String,
        nullable=True,
    )

    recommended_action = Column(
        String,
        nullable=True,
    )

    recovery_channel = Column(
        String,
        nullable=True,
    )