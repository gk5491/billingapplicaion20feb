import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Search, ChevronDown, X, FileText, Printer, Download,
  Check, Loader2, ShoppingBag, FileInput
} from "lucide-react";
import { robustIframePrint } from "@/lib/robust-print";
import { generatePDFFromElement } from "@/lib/pdf-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { PurchasePDFHeader } from "@/components/purchase-pdf-header";
import { Organization } from "@shared/schema";
import { useOrganization } from "@/context/OrganizationContext";
import { useAuthStore } from "@/store/authStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PurchaseOrder {
  id: string;
  purchaseOrderNumber: string;
  referenceNumber?: string;
  date: string;
  deliveryDate?: string;
  expectedDeliveryDate?: string;
  expectedShipmentDate?: string;
  paymentTerms?: string;
  vendorId: string;
  vendorName: string;
  vendorAddress?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    countryRegion?: string;
    gstin?: string;
  };
  items: Array<{
    id: string;
    itemName: string;
    name?: string;
    description?: string;
    quantity: number;
    rate: number;
    tax?: string;
    taxAmount?: number;
    amount: number;
    hsnSac?: string;
  }>;
  subTotal: number;
  discountAmount?: number;
  taxAmount?: number;
  adjustment?: number;
  total: number;
  notes?: string;
  termsAndConditions?: string;
  status: string;
  rejectionReason?: string;
  vendorResponseStatus?: string;
  vendorResponseDate?: string;
  createdAt?: string;
  pdfTemplate?: string;
  activityLogs?: Array<{
    id: string;
    timestamp: string;
    action: string;
    description: string;
    user: string;
  }>;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
}

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function PurchaseOrderPDFView({ purchaseOrder, branding, organization }: { purchaseOrder: PurchaseOrder; branding?: any; organization?: Organization }) {
  const redThemeColor = '#b91c1c';

  return (
    <div className="mx-auto shadow-lg bg-white my-8 w-full max-w-[210mm]">
      <div
        id="purchase-order-pdf-content"
        className="bg-white border border-slate-200"
        style={{
          backgroundColor: 'white',
          width: '100%',
          maxWidth: '210mm',
          minHeight: '316mm',
          margin: '0 auto',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: '#0f172a',
          boxSizing: 'border-box',
          lineHeight: '1.5'
        }}
      >
        <div style={{ padding: '40px', position: 'relative' }}>
          <PurchasePDFHeader
            logo={branding?.logo}
            documentTitle="PURCHASE ORDER"
            documentNumber={purchaseOrder.purchaseOrderNumber || 'PO-00001'}
            date={purchaseOrder.date}
            referenceNumber={purchaseOrder.referenceNumber}
            organization={organization}
          />

          <div style={{ display: 'flex', gap: '40px', marginBottom: '40px', flexWrap: 'wrap' }}>
            <div style={{ borderLeft: '3px solid #f1f5f9', paddingLeft: '20px', flex: '1', minWidth: '250px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', margin: '0 0 12px 0' }}>
                VENDOR
              </h4>
              <p style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginBottom: '6px', margin: '0 0 6px 0', letterSpacing: '-0.02em', wordWrap: 'break-word' }}>
                {purchaseOrder.vendorName}
              </p>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                {purchaseOrder.vendorAddress?.street1 && <p style={{ margin: 0 }}>{purchaseOrder.vendorAddress.street1}</p>}
                {purchaseOrder.vendorAddress?.street2 && <p style={{ margin: 0 }}>{purchaseOrder.vendorAddress.street2}</p>}
                {purchaseOrder.vendorAddress?.city && <p style={{ margin: 0 }}>{purchaseOrder.vendorAddress.city}</p>}
                <p style={{ margin: 0 }}>{purchaseOrder.vendorAddress?.pinCode || '411057'}, {purchaseOrder.vendorAddress?.state || 'Maharashtra'}</p>
                <p style={{ margin: 0 }}>{purchaseOrder.vendorAddress?.countryRegion || 'India'}</p>
                {purchaseOrder.vendorAddress?.gstin && <p style={{ margin: '4px 0 0 0', fontWeight: '600', color: '#991b1b' }}>GSTIN {purchaseOrder.vendorAddress.gstin}</p>}
              </div>
            </div>
            <div style={{ borderLeft: '3px solid #f1f5f9', paddingLeft: '20px', flex: '1', minWidth: '250px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', margin: '0 0 12px 0' }}>
                SHIP TO
              </h4>
              <p style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginBottom: '6px', margin: '0 0 6px 0', letterSpacing: '-0.02em', wordWrap: 'break-word' }}>
                {organization?.name || 'Your Company'}
              </p>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                {organization?.street1 && <p style={{ margin: 0 }}>{organization.street1}</p>}
                {organization?.street2 && <p style={{ margin: 0 }}>{organization.street2}</p>}
                {organization?.city && <p style={{ margin: 0 }}>{organization.city}</p>}
                <p style={{ margin: 0 }}>{organization?.postalCode || ''}{organization?.postalCode && organization?.state ? ', ' : ''}{organization?.state || ''}</p>
                <p style={{ margin: 0 }}>{organization?.location || 'India'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-[2px] mb-10 bg-slate-100 rounded-lg overflow-hidden border border-slate-100" style={{
            marginBottom: '40px',
            backgroundColor: '#f1f5f9',
            border: '1px solid #f1f5f9'
          }}>
            <div style={{ backgroundColor: '#ffffff', padding: '16px' }}>
              <p style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Order Date</p>
              <p style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '0' }}>{formatDate(purchaseOrder.date)}</p>
            </div>
            <div style={{ backgroundColor: '#ffffff', padding: '16px' }}>
              <p style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Expected Delivery</p>
              <p style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '0' }}>{formatDate(purchaseOrder.deliveryDate || purchaseOrder.expectedDeliveryDate || '')}</p>
            </div>
            <div style={{ backgroundColor: '#ffffff', padding: '16px' }}>
              <p style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Payment Terms</p>
              <p style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '0' }}>{purchaseOrder.paymentTerms || 'Due on Receipt'}</p>
            </div>
            <div style={{ backgroundColor: '#ffffff', padding: '16px' }}>
              <p style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Ref#</p>
              <p style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '0' }}>{purchaseOrder.referenceNumber || '-'}</p>
            </div>
          </div>

          <div style={{ marginBottom: '20px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', minWidth: '500px' }}>
              <thead>
                <tr style={{ backgroundColor: redThemeColor, color: 'white' }}>
                  <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', width: '30px', fontWeight: 'bold' }}>#</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px', fontWeight: 'bold' }}>Item & Description</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', width: '80px', fontWeight: 'bold' }}>HSN/SAC</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', width: '60px', fontWeight: 'bold' }}>Qty</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontSize: '11px', width: '100px', fontWeight: 'bold' }}>Rate</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontSize: '11px', width: '100px', fontWeight: 'bold' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrder.items.map((item, index) => (
                  <tr key={item.id || index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '15px 8px', textAlign: 'center', fontSize: '11px', verticalAlign: 'top' }}>{index + 1}</td>
                    <td style={{ padding: '15px 8px', verticalAlign: 'top' }}>
                      <p style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 5px 0' }}>{item.itemName || item.name}</p>
                      <p style={{ fontSize: '9px', color: '#64748b', margin: 0, textTransform: 'uppercase' }}>{item.description}</p>
                    </td>
                    <td style={{ padding: '15px 8px', textAlign: 'center', fontSize: '11px', verticalAlign: 'top', color: '#64748b' }}>{item.hsnSac || '998315'}</td>
                    <td style={{ padding: '15px 8px', textAlign: 'center', fontSize: '11px', verticalAlign: 'top' }}>{item.quantity.toFixed(2)}</td>
                    <td style={{ padding: '15px 8px', textAlign: 'right', fontSize: '11px', verticalAlign: 'top' }}>{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '15px 8px', textAlign: 'right', fontSize: '11px', verticalAlign: 'top' }}>{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginBottom: '40px' }}>
            <div style={{ width: '250px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '10px' }}>
                <span style={{ color: '#64748b' }}>Sub Total</span>
                <span style={{ fontWeight: 'bold' }}>{purchaseOrder.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '10px' }}>
                <span style={{ color: '#64748b' }}>CGST9 (9%)</span>
                <span style={{ fontWeight: 'bold' }}>{(purchaseOrder.taxAmount ? purchaseOrder.taxAmount / 2 : 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '10px' }}>
                <span style={{ color: '#64748b' }}>SGST9 (9%)</span>
                <span style={{ fontWeight: 'bold' }}>{(purchaseOrder.taxAmount ? purchaseOrder.taxAmount / 2 : 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: redThemeColor, marginBottom: '15px' }}>
                <div style={{ textAlign: 'right', flex: 1, marginRight: '20px' }}>
                  <p style={{ margin: 0 }}>Amount Withheld</p>
                  <p style={{ margin: 0 }}>(Section 194 J)</p>
                </div>
                <span style={{ fontWeight: 'bold' }}>(-){(0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Total</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>₹{purchaseOrder.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '50px', textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block', minHeight: '80px', minWidth: '200px' }}>
              {branding?.signature?.url ? (
                <img src={branding.signature.url} alt="Signature" style={{ maxWidth: '150px', maxHeight: '80px', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#1e313b', paddingTop: '20px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, borderBottom: '1px solid #1e313b', paddingBottom: '2px', display: 'inline-block' }}>SKILLTONIT</p>
                </div>
              )}
            </div>
            <p style={{ fontSize: '12px', marginTop: '10px', color: '#64748b' }}>Authorized Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VendorPODetailPanel({
  purchaseOrder,
  onClose,
  onAccept,
  onReject,
  onConvertToBill,
  isProcessing,
  branding,
  organization
}: {
  purchaseOrder: PurchaseOrder;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
  onConvertToBill: () => void;
  isProcessing: boolean;
  branding?: any;
  organization?: Organization;
}) {
  const [showPdfView, setShowPdfView] = useState(true);
  const { toast } = useToast();

  const handleDownloadPDF = async () => {
    toast({ title: "Preparing download...", description: "Please wait while we generate your PDF." });

    if (!showPdfView) {
      setShowPdfView(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    try {
      await generatePDFFromElement("purchase-order-pdf-content", `${purchaseOrder.purchaseOrderNumber}.pdf`);
      toast({ title: "Success", description: "Purchase Order downloaded successfully." });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({ title: "Error", description: "Failed to generate PDF. Please try again.", variant: "destructive" });
    }
  };

  const handlePrint = async () => {
    toast({ title: "Preparing print...", description: "Please wait while we prepare the document." });

    if (!showPdfView) {
      setShowPdfView(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    try {
      await robustIframePrint("purchase-order-pdf-content");
    } catch (error) {
      console.error("Print error:", error);
      toast({ title: "Error", description: "Failed to open print dialog.", variant: "destructive" });
    }
  };

  const canRespond = purchaseOrder.status === "Sent" || purchaseOrder.status === "ISSUED" || purchaseOrder.status?.toUpperCase() === "ISSUED";

  const getVendorResponseLabel = () => {
    const s = purchaseOrder.status?.toLowerCase();
    if (s === "accepted") return { text: "ACCEPTED", color: "text-green-600" };
    if (s === "rejected") return { text: "REJECTED", color: "text-red-600" };
    return { text: "PENDING RESPONSE", color: "text-amber-600" };
  };

  const responseStatus = getVendorResponseLabel();

  const onConvertToBill = () => {
    if (!purchaseOrder) return;
    setLocation(`/vendor/bills?convertPoId=${purchaseOrder.id}`);
  };

  const canConvertToBill = purchaseOrder.status?.toLowerCase() === "accepted";

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-900" data-testid="text-vendor-po-number">{purchaseOrder.purchaseOrderNumber}</h2>
          <Badge variant="outline" className={`font-bold text-[10px] px-1.5 py-0 h-5 border-none rounded-sm uppercase ${
            purchaseOrder.status?.toUpperCase() === 'DRAFT' ? 'bg-slate-100 text-slate-400' :
            purchaseOrder.status?.toUpperCase() === 'ISSUED' || purchaseOrder.status === 'Sent' ? 'bg-sidebar/10 text-sidebar border-sidebar/20' :
            purchaseOrder.status?.toLowerCase() === 'accepted' ? 'bg-green-100 text-green-600' :
            purchaseOrder.status?.toLowerCase() === 'rejected' ? 'bg-red-100 text-red-600' :
            purchaseOrder.status?.toUpperCase() === 'RECEIVED' ? 'bg-green-100 text-green-600' :
            purchaseOrder.status?.toUpperCase() === 'CANCELLED' ? 'bg-red-100 text-red-600' :
            'bg-slate-100 text-slate-600'
          }`}>
            {purchaseOrder.status?.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 border rounded-md" onClick={handleDownloadPDF} title="Download PDF" data-testid="button-download-pdf">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 border rounded-md" onClick={handlePrint} title="Print Document" data-testid="button-print-po">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 border rounded-md" onClick={onClose} data-testid="button-close-panel">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 overflow-x-auto bg-white">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs font-semibold text-slate-600" data-testid="button-pdf-print-dropdown">
              <FileText className="h-3.5 w-3.5" />
              PDF/Print
              <ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleDownloadPDF} data-testid="button-download-pdf-menu">
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePrint} data-testid="button-print-menu">
              <Printer className="mr-2 h-4 w-4" /> Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {canRespond && (
          <>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold text-green-600"
              onClick={onAccept}
              disabled={isProcessing}
              data-testid="button-accept-po"
            >
              <Check className="h-3.5 w-3.5" />
              Accept
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold text-red-600"
              onClick={onReject}
              disabled={isProcessing}
              data-testid="button-reject-po"
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </Button>
          </>
        )}
        {canConvertToBill && (
          <>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold text-blue-600"
              onClick={onConvertToBill}
              data-testid="button-convert-to-bill"
            >
              <FileInput className="h-3.5 w-3.5" />
              Convert to Bill
            </Button>
          </>
        )}
      </div>

      <div className="px-4 py-5 border-b border-slate-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mb-1.5">Vendor Response</span>
            <span className={`text-xs font-extrabold tracking-tight ${responseStatus.color}`}>
              {responseStatus.text}
            </span>
          </div>
          {purchaseOrder.rejectionReason && (
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mb-1.5">Rejection Reason</span>
              <span className="text-xs text-red-600 max-w-[200px] truncate" title={purchaseOrder.rejectionReason}>
                {purchaseOrder.rejectionReason}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="pdf-view-vendor" className="text-xs font-semibold text-slate-500">Show PDF View</Label>
          <Switch id="pdf-view-vendor" checked={showPdfView} onCheckedChange={setShowPdfView} className="scale-75" data-testid="switch-pdf-view" />
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
                  <PurchaseOrderPDFView purchaseOrder={purchaseOrder} branding={branding} organization={organization} />
                </div>
              ) : (
                <div className="space-y-6 p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Vendor</span>
                      <p className="font-medium text-sidebar font-display">{purchaseOrder.vendorName}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Date</span>
                      <p className="font-medium">{formatDate(purchaseOrder.date)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Delivery Date</span>
                      <p className="font-medium">{formatDate(purchaseOrder.deliveryDate || purchaseOrder.expectedDeliveryDate || '')}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Status</span>
                      <Badge variant="outline" className={`font-bold text-[10px] px-1.5 py-0 h-5 border-none rounded-sm uppercase ${
                        purchaseOrder.status?.toUpperCase() === 'DRAFT' ? 'bg-slate-100 text-slate-400' :
                        purchaseOrder.status?.toUpperCase() === 'ISSUED' || purchaseOrder.status === 'Sent' ? 'bg-sidebar/10 text-sidebar border-sidebar/20' :
                        purchaseOrder.status?.toLowerCase() === 'accepted' ? 'bg-green-100 text-green-600' :
                        purchaseOrder.status?.toLowerCase() === 'rejected' ? 'bg-red-100 text-red-600' :
                        purchaseOrder.status?.toUpperCase() === 'RECEIVED' ? 'bg-green-100 text-green-600' :
                        purchaseOrder.status?.toUpperCase() === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {purchaseOrder.status?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {purchaseOrder.rejectionReason && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-md">
                      <p className="text-sm font-medium text-red-700">Rejection Reason:</p>
                      <p className="text-sm text-red-600">{purchaseOrder.rejectionReason}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold mb-2">Items</h4>
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-2 py-1 text-left">Item</th>
                          <th className="px-2 py-1 text-center">Qty</th>
                          <th className="px-2 py-1 text-right">Rate</th>
                          <th className="px-2 py-1 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseOrder.items.map((item, i) => (
                          <tr key={item.id || i} className="border-b">
                            <td className="px-2 py-2">{item.itemName || item.name || item.description}</td>
                            <td className="px-2 py-2 text-center">{item.quantity}</td>
                            <td className="px-2 py-2 text-right">{formatCurrency(item.rate)}</td>
                            <td className="px-2 py-2 text-right">{formatCurrency(item.amount || (item.quantity * item.rate))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="flex justify-end gap-4 text-sm">
                      <span className="text-slate-500">Sub Total:</span>
                      <span className="w-28">{formatCurrency(purchaseOrder.subTotal)}</span>
                    </div>
                    {purchaseOrder.taxAmount ? (
                      <div className="flex justify-end gap-4 text-sm">
                        <span className="text-slate-500">Tax:</span>
                        <span className="w-28">{formatCurrency(purchaseOrder.taxAmount)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-end gap-4 text-sm font-semibold">
                      <span>Total:</span>
                      <span className="w-28">{formatCurrency(purchaseOrder.total)}</span>
                    </div>
                  </div>

                  {purchaseOrder.notes && (
                    <div>
                      <h4 className="font-semibold mb-1 text-sm">Notes</h4>
                      <p className="text-sm text-slate-600">{purchaseOrder.notes}</p>
                    </div>
                  )}

                  {purchaseOrder.termsAndConditions && (
                    <div>
                      <h4 className="font-semibold mb-1 text-sm">Terms & Conditions</h4>
                      <p className="text-sm text-slate-600">{purchaseOrder.termsAndConditions}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="flex-1 mt-0 overflow-auto scrollbar-hide p-6 focus-visible:ring-0">
            <div className="space-y-6">
              {purchaseOrder.activityLogs && purchaseOrder.activityLogs.length > 0 ? (
                <div className="relative border-l-2 border-slate-100 ml-3 pl-6 space-y-8">
                  {purchaseOrder.activityLogs.map((log, index) => (
                    <div key={log.id || index} className="relative">
                      <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-sidebar" />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 capitalize">{log.action}</span>
                        <span className="text-sm text-slate-500 mt-0.5">{log.description}</span>
                        <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                          <span className="font-medium uppercase">{log.user}</span>
                          <span>•</span>
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
                  <p className="text-sm text-slate-400">No activity recorded for this purchase order yet.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function VendorPurchaseOrdersPage() {
  const { user, token } = useAuthStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { currentOrganization: organization } = useOrganization();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [branding, setBranding] = useState<any>(null);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const checkCompact = () => {
      setIsCompact(window.innerWidth < 1280);
    };
    checkCompact();
    window.addEventListener('resize', checkCompact);
    return () => window.removeEventListener('resize', checkCompact);
  }, []);

  const fetchPOs = async () => {
    try {
      const res = await fetch("/api/vendor/purchase-orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setPurchaseOrders(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load POs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBranding = async () => {
    try {
      const response = await fetch("/api/branding");
      const data = await response.json();
      if (data.success) {
        setBranding(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch branding:", error);
    }
  };

  useEffect(() => {
    fetchPOs();
    fetchBranding();
  }, [token]);

  const handlePOClick = (po: PurchaseOrder) => {
    setSelectedPO(po);
  };

  const handleClosePanel = () => {
    setSelectedPO(null);
  };

  const handleAccept = async () => {
    if (!selectedPO) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/vendor/purchase-orders/${selectedPO.id}/accept`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: "Purchase order accepted" });
        await fetchPOs();
        setSelectedPO(prev => prev ? { ...prev, status: "Accepted" } : null);
      } else {
        toast({ title: "Failed to accept PO", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error accepting PO", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim() || !selectedPO) {
      toast({ title: "Please provide a rejection reason", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/vendor/purchase-orders/${selectedPO.id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        toast({ title: "Purchase order rejected" });
        setShowRejectDialog(false);
        setRejectReason("");
        await fetchPOs();
        setSelectedPO(prev => prev ? { ...prev, status: "Rejected", rejectionReason: rejectReason } : null);
      } else {
        toast({ title: "Failed to reject PO", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error rejecting PO", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase();
    switch (s) {
      case 'ISSUED':
      case 'SENT':
        return <Badge variant="outline" className="font-bold text-[10px] px-1.5 py-0 h-5 border-none rounded-sm uppercase bg-sidebar/10 text-sidebar border-sidebar/20">ISSUED</Badge>;
      case 'DRAFT':
        return <Badge variant="outline" className="font-bold text-[10px] px-1.5 py-0 h-5 border-none rounded-sm uppercase bg-slate-100 text-slate-400">DRAFT</Badge>;
      case 'ACCEPTED':
        return <Badge variant="outline" className="font-bold text-[10px] px-1.5 py-0 h-5 border-none rounded-sm uppercase bg-green-100 text-green-600">ACCEPTED</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="font-bold text-[10px] px-1.5 py-0 h-5 border-none rounded-sm uppercase bg-red-100 text-red-600">REJECTED</Badge>;
      case 'RECEIVED':
        return <Badge variant="outline" className="font-bold text-[10px] px-1.5 py-0 h-5 border-none rounded-sm uppercase bg-green-100 text-green-600">RECEIVED</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="font-bold text-[10px] px-1.5 py-0 h-5 border-none rounded-sm uppercase bg-red-100 text-red-600">CANCELLED</Badge>;
      default:
        return <Badge variant="outline" className="font-bold text-[10px] px-1.5 py-0 h-5 border-none rounded-sm uppercase bg-slate-100 text-slate-600">{status?.toUpperCase()}</Badge>;
    }
  };

  const filteredPOs = purchaseOrders.filter(po =>
    (po.purchaseOrderNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (po.vendorName?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const formatListDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="flex h-screen animate-in fade-in duration-300 w-full overflow-hidden bg-slate-50">
      <ResizablePanelGroup key={`${selectedPO ? "split" : "single"}-${isCompact ? "compact" : "full"}`} direction="horizontal" className="h-full w-full">
        {(!isCompact || !selectedPO) && (
          <ResizablePanel
            defaultSize={isCompact ? 100 : (selectedPO ? 30 : 100)}
            minSize={isCompact ? 100 : (selectedPO ? 30 : 100)}
            maxSize={isCompact ? 100 : (selectedPO ? 30 : 100)}
            className="flex flex-col overflow-hidden bg-white min-w-[25%]"
          >
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-10 min-h-[73px] h-auto">
                <div className="flex items-center gap-0">
                  <h1 className="text-xl font-semibold text-slate-900 px-2" data-testid="text-vendor-po-title">Purchase Orders</h1>
                </div>
                <div className="flex items-center gap-2">
                  {selectedPO ? (
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
                          data-testid="input-search-vendor-po"
                        />
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
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
                        placeholder="Search purchase orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9"
                        data-testid="input-search-vendor-po"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto scrollbar-hide">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : filteredPOs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                    <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <ShoppingBag className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No purchase orders found</h3>
                    <p className="text-slate-500 mb-4 max-w-sm">
                      Purchase orders from your organization will appear here.
                    </p>
                  </div>
                ) : selectedPO ? (
                  <div className="divide-y divide-slate-100 bg-white">
                    {filteredPOs.map((po) => (
                      <div
                        key={po.id}
                        className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors ${selectedPO && selectedPO.id === po.id ? 'bg-sidebar/5' : ''}`}
                        onClick={() => handlePOClick(po)}
                        data-testid={`row-vendor-po-${po.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-slate-900 truncate text-[13px]">{po.vendorName}</span>
                            <span className="font-bold text-slate-900 text-[13px] whitespace-nowrap">{formatCurrency(po.total)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1">
                            <span>{po.purchaseOrderNumber}</span>
                            <span>•</span>
                            <span>{formatListDate(po.date)}</span>
                          </div>
                          <div className={`text-[10px] font-bold uppercase tracking-wider ${
                            po.status?.toUpperCase() === 'DRAFT' ? 'text-slate-400' :
                            po.status?.toLowerCase() === 'accepted' ? 'text-green-600' :
                            po.status?.toLowerCase() === 'rejected' ? 'text-red-600' :
                            'text-blue-500'
                          }`}>
                            {po.status?.toUpperCase()}
                          </div>
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
                              <th className="px-4 py-3 text-left text-[11px] font-bold text-sidebar/70 uppercase tracking-wider font-display">Date</th>
                              <th className="px-4 py-3 text-left text-[11px] font-bold text-sidebar/70 uppercase tracking-wider font-display">Purchase Order#</th>
                              <th className="px-4 py-3 text-left text-[11px] font-bold text-sidebar/70 uppercase tracking-wider font-display">Reference#</th>
                              <th className="px-4 py-3 text-left text-[11px] font-bold text-sidebar/70 uppercase tracking-wider font-display">Status</th>
                              <th className="px-4 py-3 text-right text-[11px] font-bold text-sidebar/70 uppercase tracking-wider font-display">Amount</th>
                              <th className="px-4 py-3 text-left text-[11px] font-bold text-sidebar/70 uppercase tracking-wider font-display">Delivery Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredPOs.map((po) => (
                              <tr
                                key={po.id}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                onClick={() => handlePOClick(po)}
                                data-testid={`row-vendor-po-${po.id}`}
                              >
                                <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                  {formatListDate(po.date)}
                                </td>
                                <td className="px-4 py-4 text-sm font-medium text-sidebar hover:underline font-display">
                                  {po.purchaseOrderNumber || `PO-${po.id}`}
                                </td>
                                <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                                  {po.referenceNumber || '-'}
                                </td>
                                <td className="px-4 py-4">
                                  {getStatusBadge(po.status || 'Draft')}
                                </td>
                                <td className="px-4 py-4 text-sm font-bold text-right text-slate-900 dark:text-white">
                                  {formatCurrency(po.total)}
                                </td>
                                <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                  {(po.deliveryDate || po.expectedDeliveryDate) ? formatListDate(po.deliveryDate || po.expectedDeliveryDate || '') : '-'}
                                </td>
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

        {selectedPO && (
          <>
            {!isCompact && (
              <ResizableHandle withHandle className="w-1 bg-slate-200 hover:bg-blue-400 hover:w-1.5 transition-all cursor-col-resize" />
            )}
            <ResizablePanel defaultSize={isCompact ? 100 : 65} minSize={isCompact ? 100 : 30} className="bg-white">
              <VendorPODetailPanel
                purchaseOrder={selectedPO}
                onClose={handleClosePanel}
                onAccept={handleAccept}
                onReject={() => setShowRejectDialog(true)}
                onConvertToBill={onConvertToBill}
                isProcessing={isProcessing}
                branding={branding}
                organization={organization || undefined}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      <Dialog open={showRejectDialog} onOpenChange={(v) => { if (!v) { setShowRejectDialog(false); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Purchase Order</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedPO?.purchaseOrderNumber || `PO-${selectedPO?.id}`}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            data-testid="input-reject-reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectReason(""); }} data-testid="button-cancel-reject">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectSubmit} disabled={isProcessing || !rejectReason.trim()} data-testid="button-confirm-reject">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
