import type { HistoryEntry, RecoveryAction } from "../types/api.js";

export interface RecoveryReportData {
  transaction_id: string;
  customer_id?: string;
  amount?: number;
  currency?: string;
  failure_reason?: string | null;
  recovery_score?: number | null;
  recovery_probability?: number | null;
  recovery_priority?: string | null;
  recommended_action?: string | null;
  recovery_channel?: string | null;
  reasons?: string[];
  actions?: RecoveryAction[];
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number | undefined | null): string {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Exports the local transaction history as CSV. */
export function exportHistoryCsv(history: HistoryEntry[]): void {
  const lines: string[] = [];
  lines.push("Reviator AI — Transaction Export");
  lines.push(`Generated,${new Date().toISOString()}`);
  lines.push("");
  lines.push(
    "Transaction ID,Customer ID,Amount,Currency,Status,Priority,Recovery Score,Recommended Action,Action Status,Updated"
  );
  for (const e of history) {
    lines.push(
      [
        e.transaction_id,
        e.customer_id,
        e.amount,
        e.currency,
        e.status,
        e.recovery_priority ?? "",
        e.recovery_score ?? "",
        e.recommended_action ?? "",
        e.action_status ?? "",
        e.updatedAt,
      ]
        .map(csvCell)
        .join(",")
    );
  }
  downloadBlob(`reviator-ai-history-${Date.now()}.csv`, new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }));
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null; // PDF still renders fine without the logo
  }
}

const LABEL = (s?: string | null) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

/**
 * Generates a branded, invoice-style PDF for a single transaction — logo
 * header, the detect/decide outcome, and the recovery-action audit trail.
 */
export async function exportRecoveryReportPdf(data: RecoveryReportData): Promise<void> {
  const { jsPDF } = jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = 56;

  const logoDataUrl = await loadImageAsDataUrl("./assets/logo2.png");
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", margin, y - 24, 120, 40);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Reviator AI", margin, y);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text("Detect. Decide. Recover.", pageWidth - margin, y - 24, { align: "right" });
  doc.text(`Transaction: ${data.transaction_id}`, pageWidth - margin, y - 10, { align: "right" });
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, y + 4, { align: "right" });

  y += 40;
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 32;

  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Recovery Report", margin, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(`Customer: ${data.customer_id ?? "—"}`, margin, y);
  y += 34;

  doc.setFillColor(245, 247, 246);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 78, 6, 6, "F");
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const amountLabel =
    data.amount != null ? `${data.currency ?? "INR"} ${data.amount.toLocaleString("en-IN")}` : "—";
  doc.text(`Amount at risk: ${amountLabel}`, margin + 16, y + 24);
  doc.text(`Priority: ${LABEL(data.recovery_priority)}`, margin + 16, y + 44);
  doc.text(`Failure reason: ${LABEL(data.failure_reason)}`, margin + 16, y + 64);
  if (data.recovery_score != null) {
    doc.text(`Recovery score: ${data.recovery_score}/100`, margin + 280, y + 24);
  }
  if (data.recovery_probability != null) {
    doc.text(`Probability: ${Math.round(data.recovery_probability * 100)}%`, margin + 280, y + 44);
  }
  doc.text(`Recommended: ${LABEL(data.recommended_action)}`, margin + 280, y + 64);
  y += 108;

  if (data.reasons && data.reasons.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text("Why this recommendation", margin, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(60);
    for (const reason of data.reasons) {
      const wrapped = doc.splitTextToSize(`•  ${reason}`, pageWidth - margin * 2 - 4);
      doc.text(wrapped, margin + 4, y);
      y += wrapped.length * 14 + 4;
    }
    y += 10;
  }

  if (data.actions && data.actions.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text("Recovery action audit trail", margin, y);
    y += 20;

    doc.setFontSize(9.5);
    doc.setTextColor(120);
    doc.text("Action", margin, y);
    doc.text("Channel", margin + 160, y);
    doc.text("Amount", margin + 300, y);
    doc.text("Status", margin + 400, y);
    y += 8;
    doc.setDrawColor(230);
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40);
    for (const action of data.actions) {
      doc.text(LABEL(action.action), margin, y);
      doc.text(LABEL(action.channel), margin + 160, y);
      doc.text(action.amount.toLocaleString("en-IN"), margin + 300, y);
      doc.text(LABEL(action.status), margin + 400, y);
      y += 20;
    }
    y += 10;
  }

  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(140);
  doc.text(
    "Generated automatically by Reviator AI. This report reflects an automated analysis and forms part of the audit trail.",
    margin,
    y,
    { maxWidth: pageWidth - margin * 2 }
  );

  doc.save(`reviator-ai-report-${data.transaction_id}.pdf`);
}
