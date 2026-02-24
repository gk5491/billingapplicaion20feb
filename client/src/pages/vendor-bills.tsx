import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { PurchasePDFHeader } from "@/components/purchase-pdf-header";
import { Organization } from "@shared/schema";
import { useOrganization } from "@/context/OrganizationContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  ChevronDown,
  Pencil,
  X,
  FileText,
  Printer,
  Download,
  Loader2,
  Send,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { robustIframePrint } from "@/lib/robust-print";
import { generatePDFFromElement } from "@/lib/pdf-utils";

interface BillItem {
  id?: string;
  name: string;
  description: string;
  hsnSac?: string;
  quantity: number;
  rate: number;
  taxCode?: string;
  taxAmount?: number;
  amount: number;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  description: string;
  user?: string;
}

interface VendorBill {
  id: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  referenceNumber?: string;
  purchaseOrderId?: string;
  vendorId?: string;
  vendorName?: string;
  vendorEmail?: string;
  vendorAddress?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    country?: string;
    gstin?: string;
  };
  items: BillItem[];
  subTotal?: number;
  taxAmount?: number;
  taxCategory?: string;
  total: number;
  amountPaid?: number;
  balanceDue?: number;
  notes?: string;
  terms?: string;
  status: string;
  rejectionReason?: string;
  activityLogs?: ActivityLog[];
  paymentReceiptStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "Pending Approval":
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          Pending Approval
        </Badge>
      );
    case "Approved":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Approved
        </Badge>
      );
    case "Rejected":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          Rejected
        </Badge>
      );
    case "SUBMITTED":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Submitted
        </Badge>
      );
    case "APPROVED":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Approved
        </Badge>
      );
    case "DRAFT":
      return (
        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
          Draft
        </Badge>
      );
    case "Paid":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Paid
        </Badge>
      );
    case "Partially Paid":
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          Partially Paid
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function VendorBillPDFView({
  bill,
  branding,
  organization,
}: {
  bill: VendorBill;
  branding?: any;
  organization?: Organization;
}) {
  return (
    <div
      id="vendor-bill-pdf-content"
      className="bg-white"
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#0f172a",
        margin: "0",
        minHeight: "296mm",
        width: "100%",
        maxWidth: "210mm",
        boxSizing: "border-box",
        lineHeight: "1.5",
      }}
    >
      <div style={{ padding: "40px" }}>
        <div style={{ marginBottom: "40px" }}>
          <PurchasePDFHeader
            logo={branding?.logo}
            documentTitle="BILL"
            documentNumber={bill.billNumber}
            date={bill.billDate}
            referenceNumber={bill.referenceNumber}
            organization={organization}
          />
        </div>

        <div style={{ display: "flex", gap: "40px", marginBottom: "40px", flexWrap: "wrap" }}>
          <div style={{ borderLeft: "3px solid #f1f5f9", paddingLeft: "20px", flex: "1", minWidth: "250px" }}>
            <h3
              style={{
                fontSize: "11px",
                fontWeight: "800",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "0 0 12px 0",
              }}
            >
              BILL FROM
            </h3>
            <p
              style={{
                fontSize: "18px",
                fontWeight: "900",
                color: "#0f172a",
                margin: "0 0 6px 0",
                letterSpacing: "-0.02em",
              }}
            >
              {bill.vendorName || "Vendor"}
            </p>
            <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.6" }}>
              {bill.vendorAddress?.street1 && <p style={{ margin: 0 }}>{bill.vendorAddress.street1}</p>}
              {bill.vendorAddress?.city && (
                <p style={{ margin: 0 }}>
                  {bill.vendorAddress.city}
                  {bill.vendorAddress.state ? `, ${bill.vendorAddress.state}` : ""}
                </p>
              )}
              {bill.vendorAddress?.pinCode && <p style={{ margin: 0 }}>{bill.vendorAddress.pinCode}</p>}
              {bill.vendorAddress?.gstin && (
                <p style={{ margin: "4px 0 0 0", fontWeight: "600", color: "#991b1b" }}>
                  GSTIN: {bill.vendorAddress.gstin}
                </p>
              )}
              {bill.vendorEmail && <p style={{ margin: "4px 0 0 0" }}>{bill.vendorEmail}</p>}
            </div>
          </div>

          <div style={{ borderLeft: "3px solid #f1f5f9", paddingLeft: "20px", flex: "1", minWidth: "250px" }}>
            <h3
              style={{
                fontSize: "11px",
                fontWeight: "800",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "0 0 12px 0",
              }}
            >
              SHIP TO
            </h3>
            <p
              style={{
                fontSize: "18px",
                fontWeight: "900",
                color: "#0f172a",
                margin: "0 0 6px 0",
                letterSpacing: "-0.02em",
              }}
            >
              {organization?.name || "Your Company"}
            </p>
            <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.6" }}>
              {organization?.street1 && <p style={{ margin: 0 }}>{organization.street1}</p>}
              {organization?.city && (
                <p style={{ margin: 0 }}>
                  {organization.city}
                  {organization?.state ? `, ${organization.state}` : ""}
                </p>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            marginBottom: "40px",
            backgroundColor: "#f1f5f9",
            border: "1px solid #f1f5f9",
            borderRadius: "8px",
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "2px",
          }}
        >
          <div style={{ backgroundColor: "#ffffff", padding: "16px" }}>
            <p style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>
              Bill Date
            </p>
            <p style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", margin: "0" }}>{formatDate(bill.billDate)}</p>
          </div>
          <div style={{ backgroundColor: "#ffffff", padding: "16px" }}>
            <p style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>
              Due Date
            </p>
            <p style={{ fontSize: "13px", fontWeight: "800", color: "#b91c1c", margin: "0" }}>{formatDate(bill.dueDate)}</p>
          </div>
          <div style={{ backgroundColor: "#ffffff", padding: "16px" }}>
            <p style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>
              Status
            </p>
            <p style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase", margin: "0" }}>{bill.status}</p>
          </div>
        </div>

        <div style={{ marginBottom: "32px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "500px" }}>
            <thead>
              <tr style={{ backgroundColor: "#991b1b", color: "#ffffff" }}>
                <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em", borderRadius: "4px 0 0 0" }}>
                  #
                </th>
                <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Item & Description
                </th>
                <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>
                  HSN/SAC
                </th>
                <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>
                  Qty
                </th>
                <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>
                  Rate
                </th>
                <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>
                  Tax
                </th>
                <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right", borderRadius: "0 4px 0 0" }}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {(bill.items || []).map((item, index) => (
                <tr key={item.id || index} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "16px", fontSize: "13px", color: "#64748b", verticalAlign: "top" }}>{index + 1}</td>
                  <td style={{ padding: "16px", verticalAlign: "top" }}>
                    <p style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", margin: "0 0 4px 0" }}>{item.name || item.description}</p>
                    {item.description && item.name && (
                      <p style={{ fontSize: "12px", color: "#64748b", margin: "0", lineHeight: "1.4" }}>{item.description}</p>
                    )}
                  </td>
                  <td style={{ padding: "16px", fontSize: "13px", color: "#64748b", textAlign: "center", verticalAlign: "top" }}>{item.hsnSac || "-"}</td>
                  <td style={{ padding: "16px", fontSize: "13px", color: "#0f172a", textAlign: "center", verticalAlign: "top", fontWeight: "600" }}>{item.quantity}</td>
                  <td style={{ padding: "16px", fontSize: "13px", color: "#0f172a", textAlign: "right", verticalAlign: "top" }}>{formatCurrency(item.rate)}</td>
                  <td style={{ padding: "16px", fontSize: "13px", color: "#0f172a", textAlign: "right", verticalAlign: "top" }}>{formatCurrency(item.taxAmount || 0)}</td>
                  <td style={{ padding: "16px", fontSize: "13px", color: "#0f172a", textAlign: "right", verticalAlign: "top", fontWeight: "700" }}>{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "40px" }}>
          <div style={{ backgroundColor: "#f8fafc", borderRadius: "8px", padding: "20px", border: "1px solid #f1f5f9", width: "320px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "13px" }}>
              <span style={{ color: "#64748b", fontWeight: "600" }}>Sub Total</span>
              <span style={{ color: "#0f172a", fontWeight: "700" }}>
                {formatCurrency(bill.subTotal || bill.items.reduce((sum, i) => sum + i.amount, 0))}
              </span>
            </div>
            {bill.taxAmount && bill.taxAmount > 0 && (
              <>
                {bill.taxCategory === "IGST" ? (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "13px" }}>
                    <span style={{ color: "#64748b", fontWeight: "600" }}>IGST</span>
                    <span style={{ color: "#0f172a", fontWeight: "700" }}>{formatCurrency(bill.taxAmount)}</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "13px" }}>
                      <span style={{ color: "#64748b", fontWeight: "600" }}>CGST</span>
                      <span style={{ color: "#0f172a", fontWeight: "700" }}>{formatCurrency(bill.taxAmount / 2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "13px" }}>
                      <span style={{ color: "#64748b", fontWeight: "600" }}>SGST</span>
                      <span style={{ color: "#0f172a", fontWeight: "700" }}>{formatCurrency(bill.taxAmount / 2)}</span>
                    </div>
                  </>
                )}
              </>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px", paddingTop: "16px", borderTop: "2px solid #e2e8f0" }}>
              <span style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>Total</span>
              <span style={{ fontSize: "18px", fontWeight: "800", color: "#991b1b" }}>{formatCurrency(bill.total)}</span>
            </div>
            {(bill.amountPaid || 0) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", fontSize: "13px", color: "#16a34a" }}>
                <span style={{ fontWeight: "600" }}>Amount Paid</span>
                <span style={{ fontWeight: "700" }}>(-) {formatCurrency(bill.amountPaid || 0)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>Balance Due</span>
              <span style={{ fontSize: "16px", fontWeight: "800", color: "#b91c1c" }}>
                {formatCurrency(bill.balanceDue ?? bill.total - (bill.amountPaid || 0))}
              </span>
            </div>
          </div>
        </div>

        {bill.notes && (
          <div style={{ backgroundColor: "#fdfdfd", padding: "16px", borderRadius: "4px", borderLeft: "4px solid #cbd5e1" }}>
            <h4 style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px 0" }}>
              Notes
            </h4>
            <p style={{ fontSize: "13px", color: "#475569", margin: "0", lineHeight: "1.6" }}>{bill.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function VendorBillDetailPanel({
  bill,
  onClose,
  onEdit,
  onResubmit,
  onSubmitToAdmin,
  branding,
  organization,
}: {
  bill: VendorBill;
  onClose: () => void;
  onEdit: () => void;
  onResubmit: () => void;
  onSubmitToAdmin: () => void;
  branding?: any;
  organization?: Organization;
}) {
  const [showPdfView, setShowPdfView] = useState(true);
  const [isSendingReceipt, setIsSendingReceipt] = useState(false);
  const [receiptStatus, setReceiptStatus] = useState<string>(bill.paymentReceiptStatus || "Not Verified");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSendReceipt = async () => {
    setIsSendingReceipt(true);
    try {
      const response = await fetch(`/api/vendor/payments/${bill.id}/receipt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({ status: receiptStatus })
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: "Success", description: "Payment receipt sent to admin." });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to send receipt.", variant: "destructive" });
    } finally {
      setIsSendingReceipt(false);
    }
  };

  const [vendorItems, setVendorItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchVendorItems = async () => {
      try {
        const res = await fetch("/api/vendor/items", {
          headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
        });
        if (res.ok) {
          const data = await res.json();
          // Adjust based on API structure: data.data.items
          if (data.success) {
            const items = Array.isArray(data.data) ? data.data : (data.data.items || []);
            setVendorItems(items);
          }
        }
      } catch (err) {
        console.error("Failed to load vendor items:", err);
      }
    };
    fetchVendorItems();
  }, []);

  const canEditValue = (bill?.status === "DRAFT" || bill?.status === "Pending Approval" || bill?.status === "REJECTED" || bill?.status === "Rejected");
  const canSubmitToAdmin = bill?.status === "DRAFT";
  const canResubmit = bill?.status === "REJECTED" || bill?.status === "Rejected";
  const isRejected = bill?.status === "REJECTED" || bill?.status === "Rejected";

  const handleEdit = () => {
    if (!bill) return;
    setBillForm({
      purchaseOrderId: bill.purchaseOrderId || "",
      billNumber: bill.billNumber,
      billDate: bill.billDate ? bill.billDate.split("T")[0] : "",
      dueDate: bill.dueDate ? bill.dueDate.split("T")[0] : "",
      referenceNumber: bill.referenceNumber || "",
      notes: bill.notes || "",
      terms: bill.terms || "",
      items: bill.items && bill.items.length > 0 ? bill.items : [{ name: "", description: "", hsnSac: "", quantity: 1, rate: 0, taxCode: "", taxAmount: 0, amount: 0 }],
    });
    setShowEditDialog(true);
  };

  const handleDownloadPDF = async () => {
    if (!bill) return;

    if (bill.paymentReceiptStatus !== "Verified") {
      toast({
        title: "Download Restricted",
        description: "The payment receipt must be verified by the vendor before downloading the PDF.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Logic for PDF download
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" });
    }
  };

  const handlePrint = async () => {
    toast({ title: "Preparing print...", description: "Please wait while we prepare the document." });
    if (!showPdfView) {
      setShowPdfView(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    try {
      await robustIframePrint("vendor-bill-pdf-content");
    } catch (error) {
      console.error("Print error:", error);
      toast({ title: "Error", description: "Failed to open print dialog.", variant: "destructive" });
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900" data-testid="text-bill-number">
            {bill.billNumber}
          </h2>
          {getStatusBadge(bill.status)}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-detail">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 overflow-x-auto bg-white">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs font-semibold text-slate-600" data-testid="button-pdf-print">
              <FileText className="h-3.5 w-3.5" />
              PDF/Print
              <ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleDownloadPDF} data-testid="button-download-pdf">
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePrint} data-testid="button-print">
              <Printer className="mr-2 h-4 w-4" /> Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {canEdit && (
          <>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs font-semibold text-slate-600" onClick={handleEdit} data-testid="button-edit-bill">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </>
        )}

        {canSubmitToAdmin && (
          <>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs font-semibold text-green-600" onClick={onSubmitToAdmin} data-testid="button-submit-to-admin">
              <Send className="h-3.5 w-3.5" />
              Send to Customer (Admin)
            </Button>
          </>
        )}

        {canResubmit && (
          <>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs font-semibold text-blue-600" onClick={onResubmit} data-testid="button-resubmit-bill">
              <Send className="h-3.5 w-3.5" />
              Resubmit
            </Button>
          </>
        )}

        {isRejected && (
          <>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs font-semibold text-amber-600" onClick={() => setLocation(`/vendor/bills/new?billId=${bill.id}`)} data-testid="button-edit-rejected-bill">
              <Pencil className="h-3.5 w-3.5" />
              Edit &amp; Resubmit
            </Button>
          </>
        )}

        <div className="w-px h-4 bg-slate-200 mx-1" />
        <div className="flex items-center gap-2">
          <Select value={receiptStatus} onValueChange={setReceiptStatus}>
            <SelectTrigger className="h-8 w-40 text-xs font-semibold">
              <SelectValue placeholder="Receipt Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending Verification">Pending Verification</SelectItem>
              <SelectItem value="Verified">Verified</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 gap-1.5 text-xs font-semibold text-blue-600" 
            onClick={handleSendReceipt}
            disabled={isSendingReceipt}
          >
            <Send className="h-3.5 w-3.5" />
            {isSendingReceipt ? "Updating..." : "Update Status"}
          </Button>
        </div>
      </div>

      {(bill.status === "Rejected" || bill.status === "REJECTED") && bill.rejectionReason && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700" data-testid="text-rejection-label">Rejection Reason</p>
            <p className="text-sm text-red-600" data-testid="text-rejection-reason">{bill.rejectionReason}</p>
          </div>
        </div>
      )}

      <div className="px-4 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mb-1.5">Approval Status</span>
            <span
              className={cn(
                "text-xs font-extrabold tracking-tight",
                bill.status === "Approved" || bill.status === "Paid"
                  ? "text-green-600"
                  : bill.status === "Rejected"
                    ? "text-red-600"
                    : "text-amber-600"
              )}
              data-testid="text-approval-status"
            >
              {bill.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="vendor-pdf-view" className="text-xs font-semibold text-slate-500">
            Show PDF View
          </Label>
          <Switch id="vendor-pdf-view" checked={showPdfView} onCheckedChange={setShowPdfView} className="scale-75" data-testid="switch-pdf-view" />
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-hide">
        <Tabs defaultValue="details" className="h-full flex flex-col">
          <div className="px-4 border-b bg-slate-50/50">
            <TabsList className="h-10 p-0 bg-transparent gap-6">
              <TabsTrigger
                value="details"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-sidebar data-[state=active]:text-sidebar data-[state=active]:bg-transparent data-[state=active]:shadow-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-2 text-xs font-bold uppercase tracking-wider bg-transparent hover:bg-transparent transition-none"
                data-testid="tab-details"
              >
                Details
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-sidebar data-[state=active]:text-sidebar data-[state=active]:bg-transparent data-[state=active]:shadow-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-2 text-xs font-bold uppercase tracking-wider bg-transparent hover:bg-transparent transition-none"
                data-testid="tab-activity"
              >
                Activity Log
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="details" className="flex-1 mt-0 overflow-auto scrollbar-hide p-2 focus-visible:ring-0">
            <div className="w-full">
              {showPdfView ? (
                <div className="w-full flex justify-center">
                  <div className="mx-auto shadow-lg bg-white my-8 w-full max-w-[210mm]">
                    <div className="bg-white border border-slate-200">
                      <VendorBillPDFView bill={bill} branding={branding} organization={organization} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 p-4">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">BILL</h2>
                      <p className="text-slate-600">
                        Bill# <span className="font-semibold">{bill.billNumber}</span>
                      </p>
                      {getStatusBadge(bill.status)}
                    </div>
                    <div className="text-right">
                      <h4 className="text-sm text-slate-500">VENDOR</h4>
                      <p className="font-semibold text-blue-600">{bill.vendorName || "Vendor"}</p>
                      {bill.vendorAddress && (
                        <div className="text-sm text-slate-600 mt-1">
                          {bill.vendorAddress.street1 && <p>{bill.vendorAddress.street1}</p>}
                          {bill.vendorAddress.city && (
                            <p>
                              {bill.vendorAddress.city}, {bill.vendorAddress.state}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm border-t border-b py-4">
                    <div>
                      <span className="text-slate-500 uppercase text-xs">Bill Date</span>
                      <p className="font-medium">{formatDate(bill.billDate)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase text-xs">Due Date</span>
                      <p className="font-medium">{formatDate(bill.dueDate)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase text-xs">Total</span>
                      <p className="font-bold text-lg">{formatCurrency(bill.total)}</p>
                    </div>
                  </div>

                  <div>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="text-xs">ITEM</TableHead>
                          <TableHead className="text-xs text-center">HSN/SAC</TableHead>
                          <TableHead className="text-xs text-center">QTY</TableHead>
                          <TableHead className="text-xs text-right">RATE</TableHead>
                          <TableHead className="text-xs text-right">TAX</TableHead>
                          <TableHead className="text-xs text-right">AMOUNT</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(bill.items || []).map((item, i) => (
                          <TableRow key={item.id || i}>
                            <TableCell className="text-blue-600">{item.name || item.description}</TableCell>
                            <TableCell className="text-center">{item.hsnSac || "-"}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.taxAmount || 0)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-end">
                    <div className="w-72 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Sub Total</span>
                        <span>{formatCurrency(bill.subTotal || bill.items.reduce((sum, i) => sum + i.amount, 0))}</span>
                      </div>
                      {bill.taxAmount && bill.taxAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Tax</span>
                          <span>{formatCurrency(bill.taxAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold border-t pt-2">
                        <span>Total</span>
                        <span>{formatCurrency(bill.total)}</span>
                      </div>
                      {(bill.amountPaid || 0) > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Amount Paid</span>
                          <span>(-) {formatCurrency(bill.amountPaid || 0)}</span>
                        </div>
                      )}
                      <div className="flex justify-between bg-blue-50 p-2 rounded font-semibold">
                        <span>Balance Due</span>
                        <span>{formatCurrency(bill.balanceDue ?? bill.total - (bill.amountPaid || 0))}</span>
                      </div>
                    </div>
                  </div>

                  {bill.notes && (
                    <div>
                      <p className="text-sm text-slate-500">Notes</p>
                      <p className="text-sm">{bill.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="flex-1 mt-0 overflow-auto scrollbar-hide p-6 focus-visible:ring-0">
            <div className="space-y-6">
              {bill.activityLogs && bill.activityLogs.length > 0 ? (
                <div className="relative border-l-2 border-slate-100 ml-3 pl-6 space-y-8">
                  {bill.activityLogs.map((log, index) => (
                    <div key={log.id || index} className="relative">
                      <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-sidebar" />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 capitalize" data-testid={`text-activity-action-${index}`}>
                          {log.action}
                        </span>
                        <span className="text-sm text-slate-500 mt-0.5" data-testid={`text-activity-desc-${index}`}>
                          {log.description}
                        </span>
                        <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                          {log.user && (
                            <>
                              <span className="font-medium uppercase">{log.user}</span>
                              <span>&#8226;</span>
                            </>
                          )}
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400">No activity recorded for this bill yet.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

const emptyBillForm = {
  billNumber: "",
  billDate: new Date().toISOString().split("T")[0],
  dueDate: "",
  referenceNumber: "",
  notes: "",
  terms: "",
  items: [{ name: "", description: "", hsnSac: "", quantity: 1, rate: 0, taxCode: "", taxAmount: 0, amount: 0 }] as BillItem[],
};

export default function VendorBillsPage() {
  const { user, token } = useAuthStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { currentOrganization: orgData } = useOrganization();
  const organization = orgData || undefined;

  const [bills, setBills] = useState<VendorBill[]>([]);
  const [selectedBill, setSelectedBill] = useState<VendorBill | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [branding, setBranding] = useState<any>(null);
  const [vendorItems, setVendorItems] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billForm, setBillForm] = useState({ ...emptyBillForm, purchaseOrderId: "" });
  const [editBillId, setEditBillId] = useState<string | null>(null);

  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const checkCompact = () => setIsCompact(window.innerWidth < 1280);
    checkCompact();
    window.addEventListener("resize", checkCompact);
    return () => window.removeEventListener("resize", checkCompact);
  }, []);

  const fetchBills = async () => {
    try {
      const res = await fetch("/api/vendor/bills", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setBills(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load bills:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVendorItems = async () => {
    try {
      const res = await fetch("/api/vendor/items", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setVendorItems(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch vendor items:", err);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const res = await fetch("/api/vendor/purchase-orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Only show accepted POs that can be converted
          setPurchaseOrders(data.data.filter((po: any) => po.status?.toLowerCase() === "accepted") || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch purchase orders:", err);
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const convertPoId = searchParams.get("convertPoId");
    if (convertPoId && purchaseOrders.length > 0) {
      const po = purchaseOrders.find(p => p.id === convertPoId);
      if (po) {
        handlePOChange(convertPoId);
        setShowCreateDialog(true);
      }
    }
  }, [purchaseOrders, window.location.search]);

  const fetchBranding = async () => {
    try {
      const res = await fetch("/api/branding");
      const data = await res.json();
      if (data.success) setBranding(data.data);
    } catch (err) {
      console.error("Failed to fetch branding:", err);
    }
  };

  useEffect(() => {
    fetchBills();
    fetchBranding();
    fetchVendorItems();
    fetchPurchaseOrders();
  }, [token]);

  const handleBillClick = (bill: VendorBill) => {
    setSelectedBill(bill);
  };

  const handleClosePanel = () => {
    setSelectedBill(null);
  };

  const updateItem = (index: number, field: keyof BillItem, value: any) => {
    setBillForm((prev) => {
      const items = [...prev.items];
      const currentItem = { ...items[index], [field]: value };

      // If item selection changed, update other fields
      if (field === "name" && (vendorItems || []).length > 0) {
        const selectedItem = (vendorItems || []).find(vi => vi.name === value);
        if (selectedItem) {
          currentItem.description = selectedItem.description || "";
          currentItem.rate = Number(selectedItem.rate) || 0;
          currentItem.hsnSac = selectedItem.hsnSac || "";
        }
      }

      currentItem.amount = (currentItem.quantity || 0) * (currentItem.rate || 0);
      items[index] = currentItem;
      return { ...prev, items };
    });
  };

  const handlePOChange = (poId: string) => {
    const selectedPO = purchaseOrders.find(po => po.id === poId);
    if (selectedPO) {
      setBillForm(prev => ({
        ...prev,
        purchaseOrderId: poId,
        referenceNumber: selectedPO.purchaseOrderNumber,
        items: selectedPO.items.map((item: any) => ({
          name: item.itemName || item.name,
          description: item.description || "",
          hsnSac: item.hsnSac || "",
          quantity: item.quantity,
          rate: item.rate,
          taxAmount: item.taxAmount || 0,
          amount: item.amount
        }))
      }));
    } else {
      setBillForm(prev => ({ ...prev, purchaseOrderId: poId }));
    }
  };

  const addItem = () => {
    setBillForm((prev) => ({
      ...prev,
      items: [...prev.items, { name: "", description: "", hsnSac: "", quantity: 1, rate: 0, taxCode: "", taxAmount: 0, amount: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    setBillForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const resetForm = () => {
    setBillForm({ ...emptyBillForm, purchaseOrderId: "", items: [{ name: "", description: "", hsnSac: "", quantity: 1, rate: 0, taxCode: "", taxAmount: 0, amount: 0 }] });
    setEditBillId(null);
  };

  const handleCreateBill = async () => {
    if (!billForm.billNumber) {
      toast({ title: "Bill number is required", variant: "destructive" });
      return;
    }
    if (billForm.items.length === 0 || !billForm.items[0].name) {
      toast({ title: "At least one item is required", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const total = billForm.items.reduce((sum, item) => sum + item.amount, 0);
      const res = await fetch("/api/vendor/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...billForm, total, status: "Pending Approval" }),
      });
      if (res.ok) {
        toast({ title: "Bill created successfully" });
        setShowCreateDialog(false);
        resetForm();
        fetchBills();
      } else {
        const err = await res.json();
        toast({ title: err.message || "Failed to create bill", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error creating bill", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditBill = async () => {
    if (!editBillId) return;
    if (!billForm.billNumber) {
      toast({ title: "Bill number is required", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const total = billForm.items.reduce((sum, item) => sum + item.amount, 0);
      const res = await fetch(`/api/vendor/bills/${editBillId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...billForm, total }),
      });
      if (res.ok) {
        toast({ title: "Bill updated successfully" });
        setShowEditDialog(false);
        resetForm();
        fetchBills();
        if (selectedBill?.id === editBillId) {
          const data = await res.json();
          setSelectedBill(data.data || selectedBill);
        }
      } else {
        const err = await res.json();
        toast({ title: err.message || "Failed to update bill", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error updating bill", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (bill: VendorBill) => {
    setBillForm({
      purchaseOrderId: bill.purchaseOrderId || "",
      billNumber: bill.billNumber,
      billDate: bill.billDate ? bill.billDate.split("T")[0] : "",
      dueDate: bill.dueDate ? bill.dueDate.split("T")[0] : "",
      referenceNumber: bill.referenceNumber || "",
      notes: bill.notes || "",
      terms: bill.terms || "",
      items: bill.items.length > 0 ? bill.items : [{ name: "", description: "", hsnSac: "", quantity: 1, rate: 0, taxCode: "", taxAmount: 0, amount: 0 }],
    });
    setEditBillId(bill.id);
    setShowEditDialog(true);
  };

  const handleSubmitToAdmin = async (billId: string) => {
    try {
      const res = await fetch(`/api/vendor/bills/${billId}/submit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: "Bill submitted to admin for approval" });
        fetchBills();
        if (selectedBill?.id === billId) {
          setSelectedBill((prev) => (prev ? { ...prev, status: "SUBMITTED" } : null));
        }
      } else {
        const err = await res.json();
        toast({ title: err.message || "Failed to submit bill", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error submitting bill", variant: "destructive" });
    }
  };

  const handleResubmit = async (billId: string) => {
    try {
      const res = await fetch(`/api/vendor/bills/${billId}/resubmit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: "Bill resubmitted for approval" });
        fetchBills();
        if (selectedBill?.id === billId) {
          setSelectedBill((prev) => (prev ? { ...prev, status: "Pending Approval" } : null));
        }
      } else {
        toast({ title: "Failed to resubmit bill", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error resubmitting bill", variant: "destructive" });
    }
  };

  const filteredBills = bills.filter(
    (bill) =>
      bill.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const billTotal = billForm.items.reduce((sum, item) => sum + item.amount, 0);

  const BillFormContent = ({ isEdit }: { isEdit: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Bill Number *</Label>
          <Input
            value={billForm.billNumber}
            onChange={(e) => setBillForm((prev) => ({ ...prev, billNumber: e.target.value }))}
            placeholder="e.g., BILL-001"
            readOnly={isEdit}
            data-testid="input-bill-number"
          />
        </div>
        <div>
          <Label>Purchase Order</Label>
          <Select 
            value={billForm.purchaseOrderId || "none"} 
            onValueChange={(val) => handlePOChange(val === "none" ? "" : val)}
            disabled={isEdit}
          >
            <SelectTrigger data-testid="select-purchase-order">
              <SelectValue placeholder="Select Purchase Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {purchaseOrders.map(po => (
                <SelectItem key={po.id} value={po.id}>{po.purchaseOrderNumber}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Reference Number</Label>
          <Input
            value={billForm.referenceNumber}
            onChange={(e) => setBillForm((prev) => ({ ...prev, referenceNumber: e.target.value }))}
            placeholder="Optional reference"
            data-testid="input-reference-number"
          />
        </div>
        <div>
          <Label>Bill Date</Label>
          <Input
            type="date"
            value={billForm.billDate}
            onChange={(e) => setBillForm((prev) => ({ ...prev, billDate: e.target.value }))}
            data-testid="input-bill-date"
          />
        </div>
        <div>
          <Label>Due Date</Label>
          <Input
            type="date"
            value={billForm.dueDate}
            onChange={(e) => setBillForm((prev) => ({ ...prev, dueDate: e.target.value }))}
            data-testid="input-due-date"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <Label>Items</Label>
          <Button variant="outline" size="sm" onClick={addItem} data-testid="button-add-item">
            <Plus className="h-3 w-3 mr-1" /> Add Item
          </Button>
        </div>
        <div className="space-y-3">
          {billForm.items.map((item, i) => (
            <div key={i} className="p-3 border rounded-md bg-slate-50/50 space-y-3 relative">
              <div className="grid grid-cols-[1fr_100px_100px_32px] gap-2 items-start">
                <div>
                  <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Item Name *</Label>
                  <Select 
                    value={item.name} 
                    onValueChange={(val) => updateItem(i, "name", val)}
                  >
                    <SelectTrigger data-testid={`input-item-name-${i}`}>
                      <SelectValue placeholder="Select an item" />
                    </SelectTrigger>
                    <SelectContent>
                      {(vendorItems || []).map((vi: any) => (
                        <SelectItem key={vi.id} value={vi.name}>{vi.name}</SelectItem>
                      ))}
                      {item.name && !(vendorItems || []).find((vi: any) => vi.name === item.name) && (
                        <SelectItem value={item.name}>{item.name}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Quantity</Label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)}
                    data-testid={`input-item-qty-${i}`}
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Rate</Label>
                  <Input
                    type="number"
                    value={item.rate}
                    onChange={(e) => updateItem(i, "rate", parseFloat(e.target.value) || 0)}
                    data-testid={`input-item-rate-${i}`}
                  />
                </div>
                <div className="pt-7">
                  {billForm.items.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeItem(i)} className="text-red-500 h-8 w-8" data-testid={`button-remove-item-${i}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-[1fr_120px] gap-2 items-center">
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(i, "description", e.target.value)}
                  className="h-8 text-xs"
                />
                <div className="text-sm font-bold text-right text-slate-900 pr-2">
                  {formatCurrency(item.amount)}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-4 pt-4 border-t">
          <div className="text-right">
            <span className="text-sm text-slate-500 uppercase font-bold mr-4">Total Amount</span>
            <span className="text-lg font-black text-sidebar">{formatCurrency(billTotal)}</span>
          </div>
        </div>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea
          value={billForm.notes}
          onChange={(e) => setBillForm((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Optional notes"
          data-testid="input-bill-notes"
          className="min-h-[80px]"
        />
      </div>
      <div>
        <Label>Terms</Label>
        <Textarea
          value={billForm.terms}
          onChange={(e) => setBillForm((prev) => ({ ...prev, terms: e.target.value }))}
          placeholder="Terms and conditions"
          data-testid="input-bill-terms"
          className="min-h-[80px]"
        />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen animate-in fade-in duration-300 w-full overflow-hidden bg-slate-50">
      <ResizablePanelGroup
        key={`${selectedBill ? "split" : "single"}-${isCompact ? "compact" : "full"}`}
        direction="horizontal"
        className="h-full w-full"
      >
        {(!isCompact || !selectedBill) && (
          <ResizablePanel
            defaultSize={isCompact ? 100 : selectedBill ? 30 : 100}
            minSize={isCompact ? 100 : selectedBill ? 30 : 100}
            maxSize={isCompact ? 100 : selectedBill ? 30 : 100}
            className="flex flex-col overflow-hidden bg-white min-w-[25%]"
          >
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-10 min-h-[73px] h-auto">
                <h1 className="text-xl font-semibold text-slate-900" data-testid="text-vendor-bills-title">
                  Bills
                </h1>
                <div className="flex items-center gap-2">
                  {selectedBill ? (
                    isSearchVisible ? (
                      <div className="relative w-full max-w-[200px] animate-in slide-in-from-right-5 fade-in-0 duration-200">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          autoFocus
                          placeholder="Search..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onBlur={() => !searchTerm && setIsSearchVisible(false)}
                          className="pl-9 h-9"
                          data-testid="input-search-bills-compact"
                        />
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setIsSearchVisible(true)}
                        data-testid="button-search-toggle"
                      >
                        <Search className="h-4 w-4 text-slate-400" />
                      </Button>
                    )
                  ) : (
                    <div className="relative w-[240px] hidden sm:block">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search bills..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9"
                        data-testid="input-search-bills"
                      />
                    </div>
                  )}
                  <Button
                    onClick={() => {
                      resetForm();
                      setShowCreateDialog(true);
                    }}
                    className={cn(
                      "bg-sidebar hover:bg-sidebar/90 gap-1.5 h-9 font-medium shadow-sm",
                      selectedBill ? "w-9 px-0" : ""
                    )}
                    size={selectedBill ? "icon" : "default"}
                    data-testid="button-create-bill"
                  >
                    <Plus className={cn("h-4 w-4", !selectedBill && "mr-1.5")} />
                    {!selectedBill && "New Bill"}
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto scrollbar-hide">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : filteredBills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                    <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No bills found</h3>
                    <p className="text-slate-500 mb-4 max-w-sm">Create your first bill to get started.</p>
                    <Button
                      onClick={() => {
                        resetForm();
                        setShowCreateDialog(true);
                      }}
                      className="bg-sidebar hover:bg-sidebar/90 font-medium shadow-sm"
                      data-testid="button-create-first-bill"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Create Your First Bill
                    </Button>
                  </div>
                ) : selectedBill ? (
                  <div className="divide-y divide-slate-100 bg-white">
                    {filteredBills.map((bill) => (
                      <div
                        key={bill.id}
                        className={cn(
                          "flex items-start gap-3 p-4 cursor-pointer hover-elevate transition-colors",
                          selectedBill.id === bill.id ? "bg-sidebar/5" : ""
                        )}
                        onClick={() => handleBillClick(bill)}
                        data-testid={`row-bill-${bill.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-slate-900 truncate text-[13px]">{bill.billNumber}</span>
                            <span className="font-bold text-slate-900 text-[13px] whitespace-nowrap">{formatCurrency(bill.total)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1">
                            <span>{formatDate(bill.billDate)}</span>
                            {bill.vendorName && (
                              <>
                                <span>&#8226;</span>
                                <span className="truncate">{bill.vendorName}</span>
                              </>
                            )}
                          </div>
                          {getStatusBadge(bill.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto scrollbar-hide">
                    <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-sidebar/5 dark:bg-sidebar/10 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="px-4 py-3 text-left text-[11px] font-bold text-sidebar/70 uppercase tracking-wider">Bill #</th>
                              <th className="px-4 py-3 text-left text-[11px] font-bold text-sidebar/70 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-3 text-left text-[11px] font-bold text-sidebar/70 uppercase tracking-wider">Due Date</th>
                              <th className="px-4 py-3 text-left text-[11px] font-bold text-sidebar/70 uppercase tracking-wider">Vendor</th>
                              <th className="px-4 py-3 text-left text-[11px] font-bold text-sidebar/70 uppercase tracking-wider">Status</th>
                              <th className="px-4 py-3 text-left text-[11px] font-bold text-sidebar/70 uppercase tracking-wider">Receipt</th>
                              <th className="px-4 py-3 text-right text-[11px] font-bold text-sidebar/70 uppercase tracking-wider">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredBills.map((bill) => (
                              <tr
                                key={bill.id}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                onClick={() => handleBillClick(bill)}
                                data-testid={`row-bill-${bill.id}`}
                              >
                            <td className="px-4 py-4 text-sm font-medium text-sidebar">{bill.billNumber}</td>
                            <td className="px-4 py-4 text-sm text-slate-600">{formatDate(bill.billDate)}</td>
                            <td className="px-4 py-4 text-sm text-slate-600">{formatDate(bill.dueDate)}</td>
                            <td className="px-4 py-4 text-sm text-slate-900">{bill.vendorName || "-"}</td>
                            <td className="px-4 py-4">{getStatusBadge(bill.status)}</td>
                            <td className="px-4 py-4">
                              <Badge variant="outline" className={cn(
                                "text-[10px] uppercase font-bold px-2 py-0.5",
                                bill.paymentReceiptStatus === "PAID" ? "bg-green-50 text-green-700 border-green-200" :
                                bill.paymentReceiptStatus === "Verified" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                "bg-slate-50 text-slate-500 border-slate-200"
                              )}>
                                {bill.paymentReceiptStatus || "Not Verified"}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-sm text-right font-semibold text-slate-900">{formatCurrency(bill.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        )}

        {selectedBill && !isCompact && <ResizableHandle withHandle />}

        {selectedBill && (
          <ResizablePanel
            defaultSize={isCompact ? 100 : 70}
            minSize={isCompact ? 100 : 50}
            className="overflow-hidden"
          >
            <VendorBillDetailPanel
              bill={selectedBill}
              onClose={handleClosePanel}
              onEdit={() => openEditDialog(selectedBill)}
              onResubmit={() => handleResubmit(selectedBill.id)}
              onSubmitToAdmin={() => handleSubmitToAdmin(selectedBill.id)}
              branding={branding}
              organization={organization}
            />
          </ResizablePanel>
        )}
      </ResizablePanelGroup>

      <Dialog open={showCreateDialog} onOpenChange={(v) => { if (!v) { setShowCreateDialog(false); resetForm(); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Bill</DialogTitle>
            <DialogDescription>Fill in the details to create a new bill</DialogDescription>
          </DialogHeader>
          <BillFormContent isEdit={false} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }} data-testid="button-cancel-create">
              Cancel
            </Button>
            <Button onClick={handleCreateBill} disabled={isSubmitting} data-testid="button-submit-bill">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={(v) => { if (!v) { setShowEditDialog(false); resetForm(); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Bill</DialogTitle>
            <DialogDescription>Update the bill details</DialogDescription>
          </DialogHeader>
          <BillFormContent isEdit={true} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm(); }} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleEditBill} disabled={isSubmitting} data-testid="button-save-bill">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
