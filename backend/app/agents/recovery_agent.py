from app.models.transaction import Transaction

from app.services.customer_intelligence import (
    calculate_customer_intelligence,
)

from app.services.recovery_service import (
    calculate_recovery_probability,
    calculate_recovery_score,
    determine_priority,
    determine_recovery_channel,
    generate_recovery_reasons,
)

from app.services.recovery_decision import (
    make_recovery_decision,
)


def run_recovery_agent(
    transaction: Transaction,
) -> dict:

    if transaction.status.value != "failed":
        return {
            "agent_status": "no_action",
            "decision": "no_action_required",
            "reason": "Transaction was not marked as failed.",
        }

    # --------------------------------
    # 1. Customer Intelligence
    # --------------------------------

    customer_intelligence = (
        calculate_customer_intelligence(
            transaction
        )
    )

    # --------------------------------
    # 2. Recovery Intelligence
    # --------------------------------

    recovery_score = calculate_recovery_score(
        transaction
    )

    recovery_probability = (
        calculate_recovery_probability(
            recovery_score
        )
    )

    priority = determine_priority(
        recovery_score
    )

    # --------------------------------
    # 3. Recovery Channel
    # --------------------------------

    channel = determine_recovery_channel(
        transaction,
        recovery_score,
    )

    # --------------------------------
    # 4. Recovery Decision Engine
    # --------------------------------

    recovery_decision = make_recovery_decision(
        transaction=transaction,
        recovery_score=recovery_score,
        recovery_channel=channel,
    )

    decision = recovery_decision["decision"]

    action = recovery_decision["action"]

    urgency = recovery_decision["urgency"]

    # --------------------------------
    # 5. Explainable AI
    # --------------------------------

    reasons = generate_recovery_reasons(
        transaction,
        recovery_score,
    )

    # Customer intelligence explanation
    if customer_intelligence["reliability"] in {
        "very_high",
        "high",
    }:
        reasons.append(
            "Customer has demonstrated strong historical "
            "payment reliability."
        )

    elif customer_intelligence["reliability"] == "low":
        reasons.append(
            "Customer has a low historical payment "
            "success rate."
        )

    # Decision explanation
    if decision == "send_payment_link":
        reasons.append(
            "Payment link is recommended because the "
            "transaction is potentially recoverable."
        )

    elif decision == "retry_payment":
        reasons.append(
            "Payment retry is recommended for this "
            "recoverable payment failure."
        )

    elif decision == "update_payment_method":
        reasons.append(
            "Customer should update the payment method "
            "before another payment attempt."
        )

    elif decision == "no_action":
        reasons.append(
            "Recovery score is too low to justify "
            "an immediate recovery attempt."
        )

    # --------------------------------
    # 6. Final Agent Decision
    # --------------------------------

    return {
        "agent_status": "decision_ready",

        "decision": decision,

        "action": action,

        "recovery_score": recovery_score,

        "recovery_probability": recovery_probability,

        "priority": priority,

        "urgency": urgency,

        "channel": channel,

        "customer_intelligence": (
            customer_intelligence
        ),

        "reasons": reasons,
    }