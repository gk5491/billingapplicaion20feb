import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useBranding } from "@/hooks/use-branding";
import { PurchasePDFHeader } from "@/components/purchase-pdf-header";
import { useOrganization } from "@/context/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { robustIframePrint } from "@/lib/robust-print";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  FileCheck,
  X,
  ChevronDown,
  FileText,
  Printer,
  Download,
  Loader2,
  Receipt,
} from "lucide-react";

interface ReceiptRecord {
  id: string;
  vendorId?: string;
  vendorName?: string;
  paymentId?: string;
  paymentNumber?: string;
  amount?: number;
  paymentStatus?: string;
  status?: string;
  notes?: string;
  sentToAdmin?: boolean;
  sentAt?: string;
  createdAt?: string;
  updatedAt?: string;
  receiptNumber?: string;
  date?: string;
  // Payment details for PDF
  paymentMode?: string;
  reference?: string;
  vendorGstin?: string;
  vendorAddress?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  billPayments?: Record<string, { billId?: string; billNumber?: string; billAmount?: number; paymentAmount?: number }> | Array<{ billId?: string; billNumber?: string; billAmount?: number; paymentAmount?: number }>;
}

interface PaymentMade {
  id: string;
  paymentNumber: string;
  vendorId: string;
  vendorName: string;
  vendorGstin?: string;
  vendorAddress?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  paymentAmount: number;
  paymentDate: string;
  paymentMode: string;
  reference?: string;
  billPayments?: Record<string, any> | any[];
  paymentReceiptStatus?: string;
  receiptSentAt?: string;
  vendorStatus?: string;
  status: string;
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

function getBillPaymentsArray(payment: PaymentMade): Array<{ billNumber?: string; billAmount?: number; paymentAmount?: number }> {
  if (!payment.billPayments) return [];
  if (Array.isArray(payment.billPayments)) return payment.billPayments;
  return Object.values(payment.billPayments);
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase() || "";
  if (normalized.includes("paid")) {
    return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Paid</Badge>;
  }
  if (normalized.includes("verif")) {
    return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Verified</Badge>;
  }
  if (normalized.includes("sent")) {
    return <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">Sent to Admin</Badge>;
  }
  return <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Pending</Badge>;
}

// PDF View of Payment Receipt — matches vendor side exactly
function PaymentReceiptPDFView({ payment, branding, organization }: { payment: PaymentMade; branding?: any; organization?: any }) {
  const amount = payment.paymentAmount || 0;
  const billPayments = getBillPaymentsArray(payment);
  const status = payment.paymentReceiptStatus || payment.vendorStatus || payment.status || "Paid";

  return (
    <div className="mx-auto shadow-lg bg-white my-8 w-full max-w-[210mm]">
      <div
        id="admin-receipt-pdf-content"
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
            date={payment.paymentDate}
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
              <p style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", margin: "0" }}>{formatDate(payment.paymentDate)}</p>
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
                color: status.toLowerCase().includes("paid") ? "#16a34a" :
                  status.toLowerCase().includes("dispute") ? "#dc2626" : "#ca8a04",
              }}>
                {status.toUpperCase()}
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

function ReceiptDetailPanel({
  receipt,
  payment,
  onClose,
  branding,
  organization,
}: {
  receipt: ReceiptRecord;
  payment: PaymentMade | null;
  onClose: () => void;
  branding?: any;
  organization?: any;
}) {
  const [showPdfView, setShowPdfView] = useState(true);
  const { toast } = useToast();
  const status = receipt.paymentStatus || receipt.status || "Paid";

  const handlePrint = async () => {
    toast({ title: "Preparing print...", description: "Opening print dialog." });
    try {
      await robustIframePrint("admin-receipt-pdf-content", `Payment Receipt - ${receipt.paymentNumber || receipt.id}`);
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
      const element = document.getElementById("admin-receipt-pdf-content");
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt-${receipt.paymentNumber || receipt.id}.pdf`);
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
          <h2 className="text-lg font-bold text-slate-900">
            {receipt.paymentNumber || receipt.receiptNumber || `REC-${receipt.id}`}
          </h2>
          <StatusBadge status={status} />
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 overflow-x-auto bg-white flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-semibold text-slate-600">
              <FileText className="h-3.5 w-3.5" />
              PDF/Print
              <ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id="admin-pdf-view-toggle"
            checked={showPdfView}
            onCheckedChange={setShowPdfView}
          />
          <Label htmlFor="admin-pdf-view-toggle" className="text-sm text-slate-600">PDF View</Label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {showPdfView && payment ? (
          <div className="p-4 bg-slate-100 overflow-auto">
            <PaymentReceiptPDFView payment={payment} branding={branding} organization={organization} />
          </div>
        ) : (
          <div className="p-4 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Receipt Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 text-xs font-medium mb-1">Payment Number</p>
                  <p className="font-semibold text-slate-900">{receipt.paymentNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-medium mb-1">Vendor</p>
                  <p className="font-semibold text-slate-900">{receipt.vendorName || "-"}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-medium mb-1">Amount</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(receipt.amount || 0)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-medium mb-1">Status</p>
                  <StatusBadge status={status} />
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-medium mb-1">Sent At</p>
                  <p className="font-semibold text-slate-900">{formatDate(receipt.sentAt)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-medium mb-1">Created</p>
                  <p className="font-semibold text-slate-900">{formatDate(receipt.createdAt)}</p>
                </div>
              </div>
            </div>

            {receipt.notes && (
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Notes</h3>
                <p className="text-sm text-slate-600">{receipt.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PurchaseReceiptsPage() {
  const { toast } = useToast();
  const { data: branding } = useBranding();
  const { currentOrganization } = useOrganization();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptRecord | null>(null);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const checkCompact = () => setIsCompact(window.innerWidth < 1280);
    checkCompact();
    window.addEventListener("resize", checkCompact);
    return () => window.removeEventListener("resize", checkCompact);
  }, []);

  // Fetch admin receipts (vendor-sent receipts with sentToAdmin=true)
  const { data: receiptsData, isLoading: receiptsLoading } = useQuery<{ success: boolean; data: ReceiptRecord[] }>({
    queryKey: ['/api/receipts'],
  });

  // Fetch all payments data to get full payment details for PDF
  const { data: paymentsData } = useQuery<{ success: boolean; data: PaymentMade[] }>({
    queryKey: ['/api/payments-made'],
  });

  const receipts = receiptsData?.data || [];
  const payments = paymentsData?.data || [];

  // Find full payment record for a receipt
  const getPaymentForReceipt = (receipt: ReceiptRecord): PaymentMade | null => {
    if (!receipt.paymentId) return null;
    return payments.find(p => p.id === receipt.paymentId) || null;
  };

  const filteredReceipts = useMemo(() => {
    let result = receipts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        (r.paymentNumber || "").toLowerCase().includes(q) ||
        (r.vendorName || "").toLowerCase().includes(q) ||
        (r.receiptNumber || "").toLowerCase().includes(q) ||
        String(r.amount || "").includes(q)
      );
    }
    return result;
  }, [receipts, searchQuery]);

  const selectedPayment = selectedReceipt ? getPaymentForReceipt(selectedReceipt) : null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <ResizablePanelGroup
        key={`${selectedReceipt ? "split" : "single"}-${isCompact ? "compact" : "full"}`}
        direction="horizontal"
        className="h-full w-full"
      >
        {(!isCompact || !selectedReceipt) && (
          <ResizablePanel
            defaultSize={isCompact ? 100 : selectedReceipt ? 33 : 100}
            minSize={isCompact ? 100 : selectedReceipt ? 33 : 100}
            maxSize={isCompact ? 100 : selectedReceipt ? 33 : 100}
            className="flex flex-col overflow-hidden bg-white border-r min-w-[25%]"
          >
            <div className="flex flex-col h-full w-full animate-in fade-in duration-500">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-10 min-h-[73px] h-auto">
                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                  <Receipt className="h-5 w-5 text-slate-600" />
                  <h1 className={cn("font-semibold text-slate-900", selectedReceipt ? "text-lg" : "text-xl")}>
                    Receipts
                  </h1>
                  <span className="text-sm text-slate-400">({filteredReceipts.length})</span>
                </div>

                <div className="flex items-center gap-2">
                  {selectedReceipt ? (
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
                        />
                      </div>
                    ) : (
                      <Button variant="outline" size="icon" onClick={() => setIsSearchVisible(true)}>
                        <Search className="h-4 w-4 text-slate-400" />
                      </Button>
                    )
                  ) : (
                    <div className="relative w-[240px] hidden sm:block">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search receipts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  )}
                </div>
              </div>

              {receiptsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : filteredReceipts.length === 0 ? (
                <Card className="border-dashed m-6">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <FileCheck className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No receipts found</h3>
                    <p className="text-muted-foreground mb-4 max-w-sm">
                      Receipts will appear here once vendors update payment status to "Paid" and send the receipt.
                    </p>
                  </CardContent>
                </Card>
              ) : selectedReceipt ? (
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <div className="flex flex-col h-full bg-white">
                    {filteredReceipts.map((receipt) => (
                      <div
                        key={receipt.id}
                        onClick={() => setSelectedReceipt(receipt)}
                        className={cn(
                          "group flex items-start gap-3 p-4 border-b border-sidebar/10 cursor-pointer transition-colors hover-elevate relative",
                          selectedReceipt.id === receipt.id ? "bg-sidebar/5" : ""
                        )}
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-[14px] text-slate-900 truncate">
                              {receipt.paymentNumber || receipt.receiptNumber || `REC-${receipt.id}`}
                            </h3>
                            <span className="font-semibold text-[14px] text-slate-900 whitespace-nowrap">
                              {formatCurrency(receipt.amount || 0)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[13px] text-slate-500">
                            <span>{receipt.vendorName || "-"}</span>
                            <span className="text-slate-300">|</span>
                            <span>{formatDate(receipt.sentAt || receipt.createdAt)}</span>
                          </div>
                          <div className="pt-1">
                            <StatusBadge status={receipt.paymentStatus || receipt.status || "Paid"} />
                          </div>
                        </div>
                        {selectedReceipt.id === receipt.id && (
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
                          <TableHead className="font-display font-semibold text-slate-500 whitespace-nowrap">Vendor</TableHead>
                          <TableHead className="font-display font-semibold text-right text-slate-500 whitespace-nowrap">Amount</TableHead>
                          <TableHead className="font-display font-semibold text-slate-500 whitespace-nowrap">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReceipts.map((receipt) => (
                          <TableRow
                            key={receipt.id}
                            onClick={() => setSelectedReceipt(receipt)}
                            className="cursor-pointer hover-elevate"
                          >
                            <TableCell className="text-sm">{formatDate(receipt.sentAt || receipt.createdAt)}</TableCell>
                            <TableCell className="text-sm font-medium">{receipt.paymentNumber || receipt.receiptNumber || `REC-${receipt.id}`}</TableCell>
                            <TableCell className="text-sm">{receipt.vendorName || "-"}</TableCell>
                            <TableCell className="text-sm text-right font-medium">{formatCurrency(receipt.amount || 0)}</TableCell>
                            <TableCell><StatusBadge status={receipt.paymentStatus || receipt.status || "Paid"} /></TableCell>
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

        {selectedReceipt && !isCompact && <ResizableHandle withHandle />}

        {selectedReceipt && (
          <ResizablePanel
            defaultSize={isCompact ? 100 : 67}
            minSize={isCompact ? 100 : 50}
            className="flex flex-col overflow-hidden"
          >
            <ReceiptDetailPanel
              receipt={selectedReceipt}
              payment={selectedPayment}
              onClose={() => setSelectedReceipt(null)}
              branding={branding}
              organization={currentOrganization}
            />
          </ResizablePanel>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
