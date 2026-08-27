from app.models.transaction import RecoveryPriority, Transaction


def calculate_recovery_score(transaction: Transaction) -> int:
    score = 0

    # Customer payment history
    if transaction.previous_successful_payments >= 5:
        score += 25
    elif transaction.previous_successful_payments >= 2:
        score += 15
    elif transaction.previous_successful_payments == 1:
        score += 8

    # Previous failures
    if transaction.previous_failed_payments == 0:
        score += 20
    elif transaction.previous_failed_payments <= 2:
        score += 12
    elif transaction.previous_failed_payments <= 5:
        score += 5

    # Failure reason
    recoverable_reasons = {
        "insufficient_balance": 20,
        "temporary_failure": 20,
        "network_error": 18,
        "bank_timeout": 15,
        "technical_error": 15,
    }

    score += recoverable_reasons.get(
        transaction.failure_reason,
        5,
    )

    # Transaction value
    if transaction.amount >= 10000:
        score += 15
    elif transaction.amount >= 5000:
        score += 12
    elif transaction.amount >= 1000:
        score += 8
    else:
        score += 5

    return min(score, 100)


def calculate_recovery_probability(score: int) -> float:
    """
    Convert recovery score into an estimated
    recovery probability.

    This is currently a baseline heuristic.
    Later it will be replaced/augmented by ML.
    """
    return round(score / 100, 2)


def determine_priority(score: int) -> RecoveryPriority:
    if score >= 80:
        return RecoveryPriority.CRITICAL

    if score >= 60:
        return RecoveryPriority.HIGH

    if score >= 40:
        return RecoveryPriority.MEDIUM

    return RecoveryPriority.LOW


def determine_recovery_channel(
    transaction: Transaction,
    score: int,
) -> str:

    if score >= 80:
        return "payment_link"

    if transaction.failure_reason == "insufficient_balance":
        return "payment_link"

    if transaction.failure_reason in {
        "network_error",
        "bank_timeout",
        "temporary_failure",
    }:
        return "automatic_retry"

    if score >= 40:
        return "email_reminder"

    return "manual_review"


def recommend_recovery_action(
    transaction: Transaction,
    score: int,
) -> str:

    if transaction.status.value != "failed":
        return "no_action_required"

    if score >= 80:
        return "retry_payment"

    if score >= 60:
        return "send_payment_link"

    if score >= 40:
        return "send_payment_reminder"

    return "manual_review"


def generate_recovery_reasons(
    transaction: Transaction,
    score: int,
) -> list[str]:

    reasons = []

    if transaction.previous_successful_payments >= 5:
        reasons.append(
            "Customer has a strong successful payment history."
        )
    elif transaction.previous_successful_payments >= 2:
        reasons.append(
            "Customer has previous successful payment activity."
        )

    if transaction.previous_failed_payments <= 2:
        reasons.append(
            "Customer has a relatively low number of previous failures."
        )

    if transaction.failure_reason == "insufficient_balance":
        reasons.append(
            "Insufficient balance is potentially recoverable "
            "after the customer adds funds."
        )

    if transaction.amount >= 5000:
        reasons.append(
            "The transaction has significant revenue-at-risk."
        )

    if score >= 80:
        reasons.append(
            "High recovery score indicates strong recovery potential."
        )
    elif score >= 60:
        reasons.append(
            "Recovery score indicates a strong opportunity for recovery."
        )
    elif score >= 40:
        reasons.append(
            "Recovery score indicates moderate recovery potential."
        )
    else:
        reasons.append(
            "Low recovery score suggests manual review."
        )

    return reasons