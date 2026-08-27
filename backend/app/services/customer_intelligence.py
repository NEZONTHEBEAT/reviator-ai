from app.models.transaction import Transaction


def calculate_customer_intelligence(transaction: Transaction) -> dict:
    """
    Analyse customer's historical payment behaviour.
    """

    successful_payments = transaction.previous_successful_payments
    failed_payments = transaction.previous_failed_payments

    total_transactions = successful_payments + failed_payments

    if total_transactions > 0:
        success_rate = successful_payments / total_transactions
    else:
        success_rate = 0.0

    success_rate_percentage = round(success_rate * 100, 2)

    if total_transactions > 0:
        average_transaction_value = transaction.amount
    else:
        average_transaction_value = 0.0

    estimated_historical_revenue = (
        successful_payments * average_transaction_value
    )

    estimated_failed_revenue = (
        failed_payments * average_transaction_value
    )

    if success_rate >= 0.80:
        reliability = "high"
    elif success_rate >= 0.50:
        reliability = "medium"
    else:
        reliability = "low"

    return {
        "customer_id": transaction.customer_id,
        "total_transactions": int(total_transactions),
        "successful_payments": int(successful_payments),
        "failed_payments": int(failed_payments),
        "success_rate": round(success_rate, 2),
        "success_rate_percentage": success_rate_percentage,
        "average_transaction_value": average_transaction_value,
        "estimated_historical_revenue": estimated_historical_revenue,
        "estimated_failed_revenue": estimated_failed_revenue,
        "reliability": reliability,
    }