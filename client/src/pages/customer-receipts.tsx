
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
    FileCheck,
    Search,
    Filter,
    Download,
    Eye,
    Printer,
    CheckCircle2,
    X,
    FileText
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/authStore";
import { UnifiedPaymentReceipt } from "@/components/UnifiedPaymentReceipt";
import { useOrganization } from "@/context/OrganizationContext";

export default function CustomerReceiptsPage() {
    const { user } = useAuthStore();
    const { toast } = useToast();
    const { currentOrganization } = useOrganization();
    const [searchTerm, setSearchTerm] = useState("");
    const [, setLocation] = useLocation();
    const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
    const [showPdfView, setShowPdfView] = useState(true);
    const [branding, setBranding] = useState<any>(null);

    const { data: receipts, isLoading } = useQuery<any>({
        queryKey: ["/api/customer/receipts", { customerId: user?.id }],
        enabled: !!user?.id,
    });

    useEffect(() => {
        fetchBranding();
    }, []);

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

    const handleDownloadPDF = async (receipt: any) => {
        toast({ title: "Preparing download...", description: "Please wait while we generate the PDF." });

        try {
            const { generatePDFFromElement } = await import("@/lib/pdf-utils");
            await generatePDFFromElement("payment-pdf-content", `Payment-${receipt.paymentNumber}.pdf`);

            toast({
                title: "PDF Downloaded",
                description: `${receipt.paymentNumber}.pdf has been downloaded successfully.`
            });
        } catch (error) {
            console.error("PDF generation error:", error);
            toast({
                title: "Failed to download PDF",
                description: "Please try again.",
                variant: "destructive"
            });
        }
    };

    const handlePrint = async (receipt: any) => {
        toast({ title: "Preparing print...", description: "Please wait while we generate the receipt preview." });

        try {
            const { robustIframePrint } = await import("@/lib/robust-print");
            await robustIframePrint('payment-pdf-content', `Payment_${receipt.paymentNumber}`);
        } catch (error) {
            console.error('Print failed:', error);
            toast({ title: "Print failed", variant: "destructive" });
        }
    };

    const filteredReceipts = receipts?.data?.filter((rec: any) => {
        return rec.paymentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rec.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    }) || [];

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-display text-slate-900">My Receipts</h1>
                    <p className="text-slate-500">View payment receipts</p>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by receipt or invoice number..."
                            className="pl-9 bg-slate-50 border-slate-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Filter
                    </Button>
                </div>

                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-bold text-slate-500">RECEIPT #</TableHead>
                            <TableHead className="font-bold text-slate-500">DATE</TableHead>
                            <TableHead className="font-bold text-slate-500">INVOICE #</TableHead>
                            <TableHead className="font-bold text-slate-500">MODE</TableHead>
                            <TableHead className="font-bold text-slate-500 text-right">AMOUNT</TableHead>
                            <TableHead className="font-bold text-slate-500 text-right">ACTIONS</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                    Loading receipts...
                                </TableCell>
                            </TableRow>
                        ) : filteredReceipts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <FileCheck className="h-12 w-12 text-slate-300" />
                                        <p>No receipts found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredReceipts.map((receipt: any) => (
                                <TableRow key={receipt.id} className="hover:bg-slate-50/50">
                                    <TableCell className="font-medium text-slate-900">
                                        {receipt.paymentNumber}
                                    </TableCell>
                                    <TableCell className="text-slate-600">
                                        {format(new Date(receipt.date), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="text-slate-600">
                                        {receipt.invoiceNumber || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{receipt.mode || 'Online'}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        ₹{receipt.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-100 text-slate-500" onClick={() => {
                                                setSelectedReceipt(receipt);
                                                setShowPdfView(true);
                                            }}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-100 text-slate-500" onClick={() => {
                                                setSelectedReceipt(receipt);
                                                handleDownloadPDF(receipt);
                                            }}>
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Sheet open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
                <SheetContent className="sm:max-w-[90vw] md:max-w-[70vw] lg:max-w-[60vw] xl:max-w-[50vw] p-0 w-full">
                    <div className="flex flex-col h-full bg-slate-50">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
                            <div className="flex items-center gap-4">
                                <h2 className="text-lg font-bold text-slate-900">{selectedReceipt?.paymentNumber}</h2>
                                <div className="flex items-center gap-2 ml-4">
                                    <Label htmlFor="pdf-view" className="text-xs text-slate-500 font-medium">PDF View</Label>
                                    <Switch id="pdf-view" checked={showPdfView} onCheckedChange={setShowPdfView} className="scale-75" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="gap-2" onClick={() => handleDownloadPDF(selectedReceipt)}>
                                    <Download className="h-4 w-4" /> Download
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2" onClick={() => handlePrint(selectedReceipt)}>
                                    <Printer className="h-4 w-4" /> Print
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedReceipt(null)} className="rounded-full">
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-6 flex flex-col items-center">
                            {showPdfView ? (
                                <div id="payment-pdf-content" className="shadow-xl bg-white w-full max-w-[210mm] border border-slate-200" style={{ minHeight: '296mm' }}>
                                    <UnifiedPaymentReceipt
                                        payment={{
                                            ...selectedReceipt,
                                            customerName: user?.name || selectedReceipt?.customerName || "Customer",
                                            customerEmail: user?.username || selectedReceipt?.customerEmail || ""
                                        }}
                                        branding={branding}
                                        organization={currentOrganization}
                                        isPreview={true}
                                    />
                                </div>
                            ) : (
                                <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                                    </div>

                                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Receipt</h2>
                                    <p className="text-slate-500 mb-8">Payment of ₹{selectedReceipt?.amount?.toLocaleString('en-IN')} received</p>

                                    <div className="w-full bg-slate-50 rounded-lg p-6 space-y-4 mb-8 text-left border border-slate-100">
                                        <div className="flex justify-between border-b border-slate-200 pb-3">
                                            <span className="text-slate-500 font-medium">Receipt No</span>
                                            <span className="font-bold text-slate-900">{selectedReceipt?.paymentNumber}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-200 pb-3">
                                            <span className="text-slate-500 font-medium">Date</span>
                                            <span className="font-bold text-slate-900">{selectedReceipt && format(new Date(selectedReceipt.date), "PPP")}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-200 pb-3">
                                            <span className="text-slate-500 font-medium">Payment Mode</span>
                                            <span className="font-bold text-slate-900">{selectedReceipt?.mode || 'Online'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-200 pb-3">
                                            <span className="text-slate-500 font-medium">Transaction ID</span>
                                            <span className="font-bold text-slate-900">{selectedReceipt?.reference || '-'}</span>
                                        </div>
                                        <div className="flex justify-between pt-3">
                                            <span className="font-bold text-slate-900 text-lg">Amount Paid</span>
                                            <span className="font-bold text-green-600 text-lg">₹{selectedReceipt?.amount?.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}

