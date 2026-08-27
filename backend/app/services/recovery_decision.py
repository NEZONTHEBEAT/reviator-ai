from app.models.transaction import Transaction


def make_recovery_decision(
    transaction: Transaction,
    recovery_score: float,
    recovery_channel: str,
) -> dict:
    """
    Decide the best recovery action based on
    transaction failure reason, recovery score,
    and recovery channel.
    """

    failure_reason = transaction.failure_reason

    if recovery_score < 30:
        decision = "no_action"
        action = "do_not_retry"
        urgency = "low"

    elif failure_reason == "insufficient_balance":
        decision = "send_payment_link"
        action = "send_payment_link"
        urgency = "high"

    elif failure_reason in {
        "card_declined",
        "payment_failed",
        "bank_declined",
    }:
        decision = "retry_payment"
        action = "retry_payment"
        urgency = "medium"

    elif failure_reason in {
        "expired_card",
        "invalid_card",
    }:
        decision = "request_payment_method_update"
        action = "update_payment_method"
        urgency = "medium"

    elif failure_reason in {
        "network_error",
        "gateway_error",
        "timeout",
    }:
        decision = "retry_payment"
        action = "retry_payment"
        urgency = "medium"

    else:
        decision = "send_payment_link"
        action = "send_payment_link"
        urgency = "medium"

    return {
        "decision": decision,
        "action": action,
        "channel": recovery_channel,
        "urgency": urgency,
        "recovery_score": recovery_score,
    }