import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useBranding } from "@/hooks/use-branding";
import { useOrganization } from "@/context/OrganizationContext";
import { PurchasePDFHeader } from "@/components/purchase-pdf-header";
import { useToast } from "@/hooks/use-toast";
import { robustIframePrint } from "@/lib/robust-print";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  CreditCard,
  X,
  Loader2,
  ChevronDown,
  FileText,
  Printer,
  Download,
  Check,
  AlertTriangle,
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
} from "lucide-react";

interface PaymentRecord {
  id: string;
  paymentNumber?: string;
  date?: string;
  paymentDate?: string;
  paymentMode?: string;
  amount?: number;
  paymentAmount?: number;
  vendorName?: string;
  vendorId?: string;
  vendorGstin?: string;
  vendorAddress?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  billNumber?: string;
  bills?: Array<{ billNumber?: string; billAmount?: number; paymentAmount?: number }>;
  billPayments?: Record<string, { billId?: string; billNumber?: string; billAmount?: number; paymentAmount?: number }> | Array<{ billId?: string; billNumber?: string; billAmount?: number; paymentAmount?: number }>;
  status?: string;
  vendorStatus?: string;
  disputeReason?: string;
  reference?: string;
  notes?: string;
  paidThrough?: string;
  receiptUrl?: string;
  activityLogs?: Array<{
    id: string;
    timestamp: string;
    action: string;
    description: string;
    user: string;
  }>;
  createdAt?: string;
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero Only";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function convertLessThanOneThousand(n: number): string {
    let result = "";
    if (n >= 100) { result += ones[Math.floor(n / 100)] + " Hundred "; n %= 100; }
    if (n >= 20) { result += tens[Math.floor(n / 10)] + " "; n %= 10; }
    if (n > 0) { result += ones[n] + " "; }
    return result.trim();
  }
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const remainder = Math.floor(num);
  let result = "Indian Rupee ";
  if (crore > 0) result += convertLessThanOneThousand(crore) + " Crore ";
  if (lakh > 0) result += convertLessThanOneThousand(lakh) + " Lakh ";
  if (thousand > 0) result += convertLessThanOneThousand(thousand) + " Thousand ";
  if (remainder > 0) result += convertLessThanOneThousand(remainder);
  result += " Only";
  return result.trim();
}

function formatDate(dateString?: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount);
}

function getPaymentModeLabel(value?: string): string {
  const options: Record<string, string> = {
    cash: "Cash", bank_transfer: "Bank Transfer", cheque: "Cheque",
    credit_card: "Credit Card", upi: "UPI", neft: "NEFT", rtgs: "RTGS", imps: "IMPS",
  };
  return options[value || ""] || value || "-";
}

function getEffectiveAmount(p: PaymentRecord): number {
  return p.amount || p.paymentAmount || 0;
}

function getEffectiveDate(p: PaymentRecord): string {
  return p.date || p.paymentDate || "";
}

function getEffectiveStatus(p: PaymentRecord): string {
  return p.vendorStatus || p.status || "Pending Verification";
}

function getBillNumber(p: PaymentRecord): string {
  if (p.billNumber) return p.billNumber;
  if (p.bills && p.bills.length > 0) return p.bills.map(b => b.billNumber).filter(Boolean).join(", ") || "-";
  if (p.billPayments) {
    const arr = Array.isArray(p.billPayments) ? p.billPayments : Object.values(p.billPayments);
    return arr.map(b => b.billNumber).filter(Boolean).join(", ") || "-";
  }
  return "-";
}

function getBillPaymentsArray(p: PaymentRecord): Array<{ billNumber?: string; billAmount?: number; paymentAmount?: number }> {
  if (p.bills && p.bills.length > 0) return p.bills;
  if (p.billPayments) {
    return Array.isArray(p.billPayments) ? p.billPayments : Object.values(p.billPayments);
  }
  return [];
}

function VendorStatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase() || "";
  if (normalized.includes("confirm")) {
    return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50" data-testid="badge-status-confirmed">Confirmed</Badge>;
  }
  if (normalized.includes("dispute") && normalized.includes("resolve")) {
    return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50" data-testid="badge-status-resolved">Dispute Resolved</Badge>;
  }
  if (normalized.includes("dispute")) {
    return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50" data-testid="badge-status-disputed">Disputed</Badge>;
  }
  if (normalized.includes("cancel")) {
    return <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50" data-testid="badge-status-cancelled">Cancelled</Badge>;
  }
  return <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50" data-testid="badge-status-pending">Pending</Badge>;
}

function PaymentReceiptPDFView({ payment, branding, organization }: { payment: PaymentRecord; branding?: any; organization?: any }) {
  const amount = getEffectiveAmount(payment);
  const billPayments = getBillPaymentsArray(payment);
  const status = getEffectiveStatus(payment);

  return (
    <div className="mx-auto shadow-lg bg-white my-8 w-full max-w-[210mm]">
      <div
        id="payment-receipt-content"
        className="bg-white border border-slate-200"
        style={{
          backgroundColor: "white",
          width: "100%",
          maxWidth: "210mm",
          minHeight: "316mm",
          margin: "0 auto",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: "#0f172a",
          boxSizing: "border-box",
          lineHeight: "1.5",
        }}
      >
        <div style={{ padding: "40px", position: "relative" }}>
          <PurchasePDFHeader
            logo={branding?.logo}
            documentTitle="PAYMENT RECEIPT"
            documentNumber={payment.paymentNumber || payment.id || ""}
            date={getEffectiveDate(payment)}
            organization={organization}
          />

          <div style={{ display: "flex", gap: "40px", marginBottom: "40px", flexWrap: "wrap" }}>
            <div style={{ borderLeft: "3px solid #f1f5f9", paddingLeft: "20px", flex: "1", minWidth: "250px" }}>
              <h4 style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px", margin: "0 0 12px 0" }}>
                VENDOR
              </h4>
              <p style={{ fontSize: "18px", fontWeight: "900", color: "#0f172a", marginBottom: "6px", margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
                {payment.vendorName || "Vendor"}
              </p>
              {payment.vendorAddress && (
                <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.6" }}>
                  {payment.vendorAddress.street && <p style={{ margin: 0 }}>{payment.vendorAddress.street}</p>}
                  {payment.vendorAddress.city && <p style={{ margin: 0 }}>{payment.vendorAddress.city}</p>}
                  <p style={{ margin: 0 }}>{payment.vendorAddress.pincode || ""}{payment.vendorAddress.pincode && payment.vendorAddress.state ? ", " : ""}{payment.vendorAddress.state || ""}</p>
                  {payment.vendorAddress.country && <p style={{ margin: 0 }}>{payment.vendorAddress.country}</p>}
                </div>
              )}
              {payment.vendorGstin && (
                <p style={{ margin: "4px 0 0 0", fontWeight: "600", color: "#991b1b", fontSize: "13px" }}>GSTIN: {payment.vendorGstin}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-[2px] mb-10 bg-slate-100 overflow-hidden border border-slate-100" style={{ marginBottom: "40px", backgroundColor: "#f1f5f9", border: "1px solid #f1f5f9", borderRadius: "8px" }}>
            <div style={{ backgroundColor: "#ffffff", padding: "16px" }}>
              <p style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>Payment Date</p>
              <p style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", margin: "0" }}>{formatDate(getEffectiveDate(payment))}</p>
            </div>
            <div style={{ backgroundColor: "#ffffff", padding: "16px" }}>
              <p style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>Payment Mode</p>
              <p style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", margin: "0" }}>{getPaymentModeLabel(payment.paymentMode)}</p>
            </div>
            <div style={{ backgroundColor: "#ffffff", padding: "16px" }}>
              <p style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>Reference</p>
              <p style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", margin: "0" }}>{payment.reference || "-"}</p>
            </div>
          </div>

          <div style={{ marginBottom: "40px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ width: "300px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "12px" }}>
                  <span style={{ color: "#64748b", fontWeight: "600" }}>Amount Paid</span>
                  <span style={{ fontWeight: "800", fontSize: "16px" }}>{formatCurrency(amount)}</span>
                </div>
                <div style={{ borderTop: "2px solid #0f172a", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "14px", fontWeight: "900" }}>Total</span>
                  <span style={{ fontSize: "14px", fontWeight: "900" }}>{formatCurrency(amount)}</span>
                </div>
              </div>
            </div>
            <p style={{ fontSize: "11px", color: "#64748b", marginTop: "12px", fontStyle: "italic" }}>
              {numberToWords(amount)}
            </p>
          </div>

          {billPayments.length > 0 && (
            <div style={{ marginBottom: "40px" }}>
              <h4 style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>
                BILL REFERENCE
              </h4>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#b91c1c", color: "white" }}>
                    <th style={{ padding: "8px", textAlign: "left", fontSize: "11px", fontWeight: "bold" }}>Bill #</th>
                    <th style={{ padding: "8px", textAlign: "right", fontSize: "11px", fontWeight: "bold" }}>Bill Amount</th>
                    <th style={{ padding: "8px", textAlign: "right", fontSize: "11px", fontWeight: "bold" }}>Payment Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {billPayments.map((bp, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "12px 8px", fontSize: "13px" }}>{bp.billNumber || "-"}</td>
                      <td style={{ padding: "12px 8px", fontSize: "13px", textAlign: "right" }}>{formatCurrency(bp.billAmount || 0)}</td>
                      <td style={{ padding: "12px 8px", fontSize: "13px", textAlign: "right" }}>{formatCurrency(bp.paymentAmount || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: "40px", padding: "16px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Vendor Status</span>
              <span style={{
                fontSize: "13px",
                fontWeight: "800",
                color: status.toLowerCase().includes("confirm") ? "#16a34a" :
                  status.toLowerCase().includes("dispute") ? "#dc2626" : "#ca8a04",
              }}>
                {status}
              </span>
            </div>
          </div>

          {branding?.signature?.url && (
            <div style={{ marginTop: "50px", textAlign: "center" }}>
              <img src={branding.signature.url} alt="Signature" style={{ maxWidth: "150px", maxHeight: "80px", objectFit: "contain" }} />
              <p style={{ fontSize: "12px", marginTop: "10px", color: "#64748b" }}>Authorized Signature</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentDetailPanel({
  payment,
  onClose,
  onConfirm,
  onDispute,
  onGenerateReceipt,
  isProcessing,
  branding,
  organization,
}: {
  payment: PaymentRecord;
  onClose: () => void;
  onConfirm: (payment: PaymentRecord) => void;
  onDispute: (payment: PaymentRecord) => void;
  onGenerateReceipt: (payment: PaymentRecord) => void;
  isProcessing: boolean;
  branding?: any;
  organization?: any;
}) {
  const [showPdfView, setShowPdfView] = useState(true);
  const { toast } = useToast();
  const status = getEffectiveStatus(payment);
  const isPending = status.toLowerCase().includes("pending");
  const isConfirmed = status.toLowerCase().includes("confirm") || status.toLowerCase().includes("paid");
  const isDisputed = status.toLowerCase().includes("dispute") && !status.toLowerCase().includes("resolve");
  const billPayments = getBillPaymentsArray(payment);

  const [receiptStatus, setReceiptStatus] = useState(getEffectiveStatus(payment));
  const [isSendingReceipt, setIsSendingReceipt] = useState(false);

  // Synchronize state with payment prop changes
  useEffect(() => {
    setReceiptStatus(getEffectiveStatus(payment));
  }, [payment]);

  const handleStatusChange = (newStatus: string) => {
    setReceiptStatus(newStatus);
  };

  const handleSendReceipt = async () => {
    setIsSendingReceipt(true);
    try {
      const res = await fetch(`/api/vendor/payments/${payment.id}/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${useAuthStore.getState().token}` },
        body: JSON.stringify({ status: receiptStatus }),
      });
      if (res.ok) {
        toast({ title: "Receipt sent successfully" });
        onGenerateReceipt(payment); // Refresh data
      } else {
        toast({ title: "Failed to send receipt", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error sending receipt", variant: "destructive" });
    } finally {
      setIsSendingReceipt(false);
    }
  };

  const handlePrint = async () => {
    toast({ title: "Preparing print...", description: "Opening print dialog." });
    try {
      await robustIframePrint("payment-receipt-content", `Payment Receipt - ${payment.paymentNumber || payment.id}`);
    } catch (error) {
      console.error("Print failed:", error);
      toast({ title: "Print failed", variant: "destructive" });
    }
  };

  const handleDownloadPDF = async () => {
    toast({ title: "Preparing download...", description: "Please wait while we generate your PDF." });
    if (!showPdfView) {
      setShowPdfView(true);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const element = document.getElementById("payment-receipt-content");
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Payment-${payment.paymentNumber || payment.id}.pdf`);
      toast({ title: "PDF downloaded successfully" });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({ title: "Failed to download PDF", variant: "destructive" });
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900" data-testid="text-payment-number">
            {payment.paymentNumber || payment.id}
          </h2>
          <VendorStatusBadge status={status} />
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-detail">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 overflow-x-auto bg-white flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-semibold text-slate-600" data-testid="button-pdf-print">
              <FileText className="h-3.5 w-3.5" />
              PDF/Print
              <ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleDownloadPDF} data-testid="menu-download-pdf">
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePrint} data-testid="menu-print">
              <Printer className="mr-2 h-4 w-4" /> Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isPending && (
          <>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs font-semibold text-green-600"
              onClick={() => onConfirm(payment)}
              disabled={isProcessing}
              data-testid="button-confirm-payment"
            >
              <Check className="h-3.5 w-3.5" />
              Confirm
            </Button>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs font-semibold text-red-600"
              onClick={() => onDispute(payment)}
              disabled={isProcessing}
              data-testid="button-dispute-payment"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Dispute
            </Button>
          </>
        )}

        {isConfirmed && (
          <>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs font-semibold text-slate-600"
              onClick={() => onGenerateReceipt(payment)}
              disabled={isProcessing}
              data-testid="button-generate-receipt"
            >
              <Receipt className="h-3.5 w-3.5" />
              Generate Receipt
            </Button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isDisputed && payment.disputeReason && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-md" data-testid="banner-dispute-reason">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">Dispute Reason</p>
                <p className="text-sm text-red-600">{payment.disputeReason}</p>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 py-3 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">Vendor Status:</span>
              <Select value={receiptStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 w-[150px]">
                  <SelectValue placeholder="Update Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending Verification">Pending Verification</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Disputed">Disputed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              size="sm" 
              className="h-8 gap-1.5 bg-sidebar text-white hover:bg-sidebar/90" 
              onClick={handleSendReceipt}
              disabled={isSendingReceipt}
            >
              {isSendingReceipt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send Receipt
            </Button>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="pdf-view-toggle"
              checked={showPdfView}
              onCheckedChange={setShowPdfView}
              data-testid="switch-pdf-view"
            />
            <Label htmlFor="pdf-view-toggle" className="text-sm text-slate-600">PDF View</Label>
          </div>
        </div>

        {showPdfView ? (
          <div className="p-4 bg-slate-100 overflow-auto">
            <PaymentReceiptPDFView payment={payment} branding={branding} organization={organization} />
          </div>
        ) : (
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full justify-start px-4 pt-2">
              <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
              <TabsTrigger value="activity" data-testid="tab-activity">Activity Log</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="p-4 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Payment Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs font-medium mb-1">Payment Number</p>
                    <p className="font-semibold text-slate-900" data-testid="text-detail-payment-number">{payment.paymentNumber || payment.id}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-medium mb-1">Date</p>
                    <p className="font-semibold text-slate-900">{formatDate(getEffectiveDate(payment))}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-medium mb-1">Payment Mode</p>
                    <p className="font-semibold text-slate-900">{getPaymentModeLabel(payment.paymentMode)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-medium mb-1">Reference</p>
                    <p className="font-semibold text-slate-900">{payment.reference || "-"}</p>
                  </div>
                  {payment.paidThrough && (
                    <div>
                      <p className="text-slate-500 text-xs font-medium mb-1">Paid Through</p>
                      <p className="font-semibold text-slate-900">{payment.paidThrough}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-slate-500 text-xs font-medium mb-1">Vendor Status</p>
                    <VendorStatusBadge status={status} />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Amount</h3>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                  <span className="text-sm text-slate-600 font-medium">Amount Paid</span>
                  <span className="text-lg font-bold text-slate-900" data-testid="text-detail-amount">{formatCurrency(getEffectiveAmount(payment))}</span>
                </div>
              </div>

              {billPayments.length > 0 && (
                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Bill References</h3>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="text-xs font-semibold text-slate-500">Bill #</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 text-right">Bill Amount</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 text-right">Payment Applied</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billPayments.map((bp, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-sm">{bp.billNumber || "-"}</TableCell>
                          <TableCell className="text-sm text-right">{formatCurrency(bp.billAmount || 0)}</TableCell>
                          <TableCell className="text-sm text-right">{formatCurrency(bp.paymentAmount || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {payment.notes && (
                <div className="border-t border-slate-200 pt-4 space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Notes</h3>
                  <p className="text-sm text-slate-600">{payment.notes}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="p-4">
              {payment.activityLogs && payment.activityLogs.length > 0 ? (
                <div className="space-y-3">
                  {payment.activityLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 border border-slate-100 rounded-md">
                      <Clock className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{log.action}</p>
                        <p className="text-xs text-slate-500">{log.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">{formatDate(log.timestamp)}</span>
                          <span className="text-xs text-slate-400">by {log.user}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No activity logs available</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

export default function VendorPaymentHistoryPage() {
  const { user, token } = useAuthStore();
  const { toast } = useToast();
  const { data: branding } = useBranding();
  const { currentOrganization } = useOrganization();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputingPayment, setDisputingPayment] = useState<PaymentRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const checkCompact = () => setIsCompact(window.innerWidth < 1280);
    checkCompact();
    window.addEventListener("resize", checkCompact);
    return () => window.removeEventListener("resize", checkCompact);
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await fetch("/api/vendor/payments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setPayments(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load payments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [token]);

  const handleConfirm = async (payment: PaymentRecord) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/vendor/payments/${payment.id}/confirm`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: "Payment confirmed" });
        fetchPayments();
        if (selectedPayment?.id === payment.id) {
          const updated = await res.json();
          if (updated.data) setSelectedPayment(updated.data);
        }
      } else {
        toast({ title: "Failed to confirm payment", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error confirming payment", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const openDisputeDialog = (payment: PaymentRecord) => {
    setDisputingPayment(payment);
    setDisputeReason("");
    setShowDisputeDialog(true);
  };

  const handleDispute = async () => {
    if (!disputeReason.trim() || !disputingPayment) {
      toast({ title: "Please provide a dispute reason", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/vendor/payments/${disputingPayment.id}/dispute`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: disputeReason }),
      });
      if (res.ok) {
        toast({ title: "Payment disputed" });
        setShowDisputeDialog(false);
        setDisputeReason("");
        setDisputingPayment(null);
        fetchPayments();
      } else {
        toast({ title: "Failed to dispute payment", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error disputing payment", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateReceipt = async (payment: PaymentRecord) => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/vendor/receipts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentId: payment.id }),
      });
      if (res.ok) {
        toast({ title: "Receipt generated successfully" });
        fetchPayments();
      } else {
        toast({ title: "Failed to generate receipt", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error generating receipt", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const statusFilterLabels: Record<string, string> = {
    all: "All Payments",
    pending: "Pending",
    confirmed: "Confirmed",
    disputed: "Disputed",
  };

  const filteredPayments = useMemo(() => {
    let result = payments;

    if (statusFilter !== "all") {
      result = result.filter((p) => {
        const s = getEffectiveStatus(p).toLowerCase();
        if (statusFilter === "pending") return s.includes("pending");
        if (statusFilter === "confirmed") return s.includes("confirm");
        if (statusFilter === "disputed") return s.includes("dispute");
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          (p.paymentNumber || "").toLowerCase().includes(q) ||
          (p.vendorName || "").toLowerCase().includes(q) ||
          getBillNumber(p).toLowerCase().includes(q) ||
          (p.reference || "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [payments, statusFilter, searchQuery]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <ResizablePanelGroup
        key={`${selectedPayment ? "split" : "single"}-${isCompact ? "compact" : "full"}`}
        direction="horizontal"
        className="h-full w-full"
      >
        {(!isCompact || !selectedPayment) && (
          <ResizablePanel
            defaultSize={isCompact ? 100 : selectedPayment ? 33 : 100}
            minSize={isCompact ? 100 : selectedPayment ? 33 : 100}
            maxSize={isCompact ? 100 : selectedPayment ? 33 : 100}
            className="flex flex-col overflow-hidden bg-white border-r min-w-[25%]"
          >
            <div className="flex flex-col h-full w-full animate-in fade-in duration-500">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-10 min-h-[73px] h-auto">
                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="gap-1.5 text-xl font-semibold text-slate-900 p-0 h-auto transition-colors text-left whitespace-normal"
                        data-testid="button-status-filter"
                      >
                        <span className={cn("line-clamp-2", selectedPayment ? "text-lg lg:text-xl" : "text-xl")}>
                          {statusFilterLabels[statusFilter] || "All Payments"}
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 p-1">
                      {Object.entries(statusFilterLabels).map(([key, label]) => (
                        <DropdownMenuItem
                          key={key}
                          onClick={() => setStatusFilter(key)}
                          className={cn("px-3 py-2 cursor-pointer transition-colors", statusFilter === key && "bg-blue-50 text-blue-600 font-medium")}
                          data-testid={`menu-filter-${key}`}
                        >
                          {label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span className="text-sm text-slate-400">({filteredPayments.length})</span>
                </div>

                <div className="flex items-center gap-2">
                  {selectedPayment ? (
                    isSearchVisible ? (
                      <div className="relative w-full max-w-[200px] animate-in slide-in-from-right-5 fade-in-0 duration-200">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          autoFocus
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onBlur={() => !searchQuery && setIsSearchVisible(false)}
                          className="pl-9 h-9"
                          data-testid="input-search-compact"
                        />
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setIsSearchVisible(true)}
                        data-testid="button-search-compact"
                      >
                        <Search className="h-4 w-4 text-slate-400" />
                      </Button>
                    )
                  ) : (
                    <div className="relative w-[240px] hidden sm:block">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search payments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9"
                        data-testid="input-search-payments"
                      />
                    </div>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : filteredPayments.length === 0 ? (
                <Card className="border-dashed m-6">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <CreditCard className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" data-testid="text-payments-empty">No payments found</h3>
                    <p className="text-muted-foreground mb-4 max-w-sm">
                      {statusFilter !== "all"
                        ? `No ${statusFilterLabels[statusFilter].toLowerCase()} payments found.`
                        : "No payment history available yet."}
                    </p>
                  </CardContent>
                </Card>
              ) : selectedPayment ? (
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <div className="flex flex-col h-full bg-white">
                    {filteredPayments.map((payment) => (
                      <div
                        key={payment.id}
                        onClick={() => setSelectedPayment(payment)}
                        className={cn(
                          "group flex items-start gap-3 p-4 border-b border-sidebar/10 cursor-pointer transition-colors hover-elevate relative",
                          selectedPayment.id === payment.id ? "bg-sidebar/5" : ""
                        )}
                        data-testid={`row-payment-${payment.id}`}
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-[14px] text-slate-900 truncate">
                              {payment.paymentNumber || payment.id}
                            </h3>
                            <span className="font-semibold text-[14px] text-slate-900 whitespace-nowrap">
                              {formatCurrency(getEffectiveAmount(payment))}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[13px] text-slate-500">
                            <span>{formatDate(getEffectiveDate(payment))}</span>
                            <span className="text-slate-300">|</span>
                            <span>{getPaymentModeLabel(payment.paymentMode)}</span>
                            <span className="text-slate-300">|</span>
                            <span>{getBillNumber(payment)}</span>
                          </div>
                          <div className="pt-1">
                            <VendorStatusBadge status={getEffectiveStatus(payment)} />
                          </div>
                        </div>
                        {selectedPayment.id === payment.id && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-sidebar" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 relative">
                  <div className="flex-1 overflow-auto scrollbar-hide relative">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                          <TableHead className="font-display font-semibold text-slate-500 whitespace-nowrap">Date</TableHead>
                          <TableHead className="font-display font-semibold text-slate-500 whitespace-nowrap">Payment #</TableHead>
                          <TableHead className="font-display font-semibold text-slate-500 whitespace-nowrap">Payment Mode</TableHead>
                          <TableHead className="font-display font-semibold text-slate-500 whitespace-nowrap">Bill #</TableHead>
                          <TableHead className="font-display font-semibold text-right text-slate-500 whitespace-nowrap">Amount</TableHead>
                          <TableHead className="font-display font-semibold text-slate-500 whitespace-nowrap">Vendor Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => (
                          <TableRow
                            key={payment.id}
                            onClick={() => setSelectedPayment(payment)}
                            className="cursor-pointer hover-elevate"
                            data-testid={`row-payment-${payment.id}`}
                          >
                            <TableCell className="text-sm">{formatDate(getEffectiveDate(payment))}</TableCell>
                            <TableCell className="text-sm font-medium">{payment.paymentNumber || payment.id}</TableCell>
                            <TableCell className="text-sm">{getPaymentModeLabel(payment.paymentMode)}</TableCell>
                            <TableCell className="text-sm">{getBillNumber(payment)}</TableCell>
                            <TableCell className="text-sm text-right font-medium">{formatCurrency(getEffectiveAmount(payment))}</TableCell>
                            <TableCell><VendorStatusBadge status={getEffectiveStatus(payment)} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>
        )}

        {selectedPayment && !isCompact && <ResizableHandle withHandle />}

        {selectedPayment && (
          <ResizablePanel
            defaultSize={isCompact ? 100 : 67}
            minSize={isCompact ? 100 : 50}
            className="flex flex-col overflow-hidden"
          >
            <PaymentDetailPanel
              payment={selectedPayment}
              onClose={() => setSelectedPayment(null)}
              onConfirm={handleConfirm}
              onDispute={openDisputeDialog}
              onGenerateReceipt={handleGenerateReceipt}
              isProcessing={isProcessing}
              branding={branding}
              organization={currentOrganization}
            />
          </ResizablePanel>
        )}
      </ResizablePanelGroup>

      <Dialog open={showDisputeDialog} onOpenChange={(v) => { if (!v) { setShowDisputeDialog(false); setDisputeReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute Payment</DialogTitle>
            <DialogDescription>
              Please provide a reason for disputing payment {disputingPayment?.paymentNumber || disputingPayment?.id}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter dispute reason (e.g., wrong amount, not received)..."
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            rows={3}
            data-testid="input-dispute-reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDisputeDialog(false); setDisputeReason(""); }} data-testid="button-cancel-dispute">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDispute}
              disabled={isProcessing || !disputeReason.trim()}
              data-testid="button-confirm-dispute"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
