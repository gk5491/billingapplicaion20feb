import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileCheck, Send, Eye, Loader2, Download, Plus } from "lucide-react";

export default function VendorReceiptsPage() {
  const { user, token } = useAuthStore();
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [confirmedPayments, setConfirmedPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchReceipts = async () => {
    try {
      const res = await fetch("/api/vendor/receipts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setReceipts(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load receipts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConfirmedPayments = async () => {
    try {
      const res = await fetch("/api/vendor/payments?status=Confirmed", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const paymentsWithReceipts = receipts.map((r) => r.paymentId);
          setConfirmedPayments((data.data || []).filter((p: any) => !paymentsWithReceipts.includes(p.id)));
        }
      }
    } catch (err) {
      console.error("Failed to load confirmed payments:", err);
    }
  };

  useEffect(() => { fetchReceipts(); }, [token]);
  useEffect(() => { if (!isLoading) fetchConfirmedPayments(); }, [isLoading, receipts]);

  const handleGenerateReceipt = async (paymentId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/vendor/receipts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentId }),
      });
      if (res.ok) {
        toast({ title: "Receipt generated successfully" });
        fetchReceipts();
        setShowGenerateDialog(false);
      } else {
        toast({ title: "Failed to generate receipt", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error generating receipt", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendToAdmin = async (receiptId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/vendor/receipts/${receiptId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: "Receipt sent to admin" });
        fetchReceipts();
      } else {
        toast({ title: "Failed to send receipt", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error sending receipt", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Generated: "bg-blue-100 text-blue-700",
      "Sent to Admin": "bg-green-100 text-green-700",
      Pending: "bg-yellow-100 text-yellow-700",
    };
    return <Badge className={colors[status] || "bg-slate-100 text-slate-700"}>{status}</Badge>;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="text-vendor-receipts-title">Receipts</h1>
          <p className="text-slate-500 mt-1">Generate and send payment receipts to admin</p>
        </div>
        <Button onClick={() => { fetchConfirmedPayments(); setShowGenerateDialog(true); }} data-testid="button-generate-receipt">
          <Plus className="h-4 w-4 mr-2" /> Generate Receipt
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No receipts found</p>
              <p className="text-xs mt-1">Generate a receipt after confirming a payment</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Payment #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.receiptNumber || `REC-${receipt.id}`}</TableCell>
                    <TableCell>{receipt.paymentNumber || "-"}</TableCell>
                    <TableCell>{receipt.date ? new Date(receipt.date).toLocaleDateString("en-IN") : "-"}</TableCell>
                    <TableCell>₹{(receipt.amount || 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell>{getStatusBadge(receipt.status || "Generated")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedReceipt(receipt); setShowDetailDialog(true); }}
                          data-testid={`button-view-receipt-${receipt.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {receipt.status !== "Sent to Admin" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600"
                            onClick={() => handleSendToAdmin(receipt.id)}
                            disabled={isProcessing}
                            data-testid={`button-send-receipt-${receipt.id}`}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
            <DialogDescription>{selectedReceipt?.receiptNumber || `REC-${selectedReceipt?.id}`}</DialogDescription>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-slate-500">Date</p><p className="font-medium">{selectedReceipt.date ? new Date(selectedReceipt.date).toLocaleDateString("en-IN") : "-"}</p></div>
                <div><p className="text-slate-500">Amount</p><p className="font-medium">₹{(selectedReceipt.amount || 0).toLocaleString("en-IN")}</p></div>
                <div><p className="text-slate-500">Payment #</p><p className="font-medium">{selectedReceipt.paymentNumber || "-"}</p></div>
                <div><p className="text-slate-500">Status</p>{getStatusBadge(selectedReceipt.status || "Generated")}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Receipt</DialogTitle>
            <DialogDescription>Select a confirmed payment to generate a receipt</DialogDescription>
          </DialogHeader>
          {confirmedPayments.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No confirmed payments without receipts</p>
          ) : (
            <div className="space-y-2">
              {confirmedPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">{payment.paymentNumber || payment.id}</p>
                    <p className="text-xs text-slate-500">₹{(payment.amount || 0).toLocaleString("en-IN")} • {payment.date ? new Date(payment.date).toLocaleDateString("en-IN") : ""}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleGenerateReceipt(payment.id)}
                    disabled={isProcessing}
                    data-testid={`button-gen-receipt-${payment.id}`}
                  >
                    Generate
                  </Button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
