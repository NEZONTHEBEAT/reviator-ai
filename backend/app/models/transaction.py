from enum import Enum

from pydantic import BaseModel, Field


class TransactionStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"


class RecoveryPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Transaction(BaseModel):
    transaction_id: str
    customer_id: str

    amount: float = Field(gt=0)
    currency: str = "INR"

    status: TransactionStatus

    failure_reason: str | None = None

    previous_successful_payments: int = Field(default=0, ge=0)
    previous_failed_payments: int = Field(default=0, ge=0)

    revenue_at_risk: float = Field(default=0, ge=0)

    recovery_priority: RecoveryPriority = RecoveryPriority.LOW