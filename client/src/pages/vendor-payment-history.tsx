import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreditCard, Check, X, Eye, Loader2 } from "lucide-react";

export default function VendorPaymentHistoryPage() {
  const { user, token } = useAuthStore();
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [disputingPayment, setDisputingPayment] = useState<any>(null);

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

  useEffect(() => { fetchPayments(); }, [token]);

  const handleConfirm = async (payment: any) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/vendor/payments/${payment.id}/confirm`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: "Payment confirmed" });
        fetchPayments();
      } else {
        toast({ title: "Failed to confirm payment", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error confirming payment", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) {
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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      "Pending Verification": "bg-yellow-100 text-yellow-700",
      Confirmed: "bg-green-100 text-green-700",
      Disputed: "bg-red-100 text-red-700",
      Paid: "bg-blue-100 text-blue-700",
      PAID: "bg-blue-100 text-blue-700",
    };
    return <Badge className={colors[status] || "bg-slate-100 text-slate-700"}>{status}</Badge>;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" data-testid="text-vendor-payments-title">Payment History</h1>
        <p className="text-slate-500 mt-1">View and verify payments made by admin</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No payments found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.paymentNumber || payment.id}</TableCell>
                    <TableCell>{payment.date ? new Date(payment.date).toLocaleDateString("en-IN") : "-"}</TableCell>
                    <TableCell>{payment.billNumber || payment.bills?.[0]?.billNumber || "-"}</TableCell>
                    <TableCell>{payment.paymentMode || "-"}</TableCell>
                    <TableCell>₹{(payment.amount || 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell>{getStatusBadge(payment.vendorStatus || payment.status || "Pending Verification")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedPayment(payment); setShowDetailDialog(true); }}
                          data-testid={`button-view-payment-${payment.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(payment.vendorStatus === "Pending Verification" || (!payment.vendorStatus && payment.status === "Pending Verification")) && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleConfirm(payment)}
                              disabled={isProcessing}
                              data-testid={`button-confirm-payment-${payment.id}`}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => { setDisputingPayment(payment); setShowDisputeDialog(true); }}
                              disabled={isProcessing}
                              data-testid={`button-dispute-payment-${payment.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>{selectedPayment?.paymentNumber || selectedPayment?.id}</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-slate-500">Date</p><p className="font-medium">{selectedPayment.date ? new Date(selectedPayment.date).toLocaleDateString("en-IN") : "-"}</p></div>
                <div><p className="text-slate-500">Amount</p><p className="font-medium">₹{(selectedPayment.amount || 0).toLocaleString("en-IN")}</p></div>
                <div><p className="text-slate-500">Mode</p><p className="font-medium">{selectedPayment.paymentMode || "-"}</p></div>
                <div><p className="text-slate-500">Status</p>{getStatusBadge(selectedPayment.vendorStatus || selectedPayment.status || "Pending Verification")}</div>
                {selectedPayment.reference && <div className="col-span-2"><p className="text-slate-500">Reference</p><p className="font-medium">{selectedPayment.reference}</p></div>}
              </div>
              {selectedPayment.disputeReason && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-sm font-medium text-red-700">Dispute Reason:</p>
                  <p className="text-sm text-red-600">{selectedPayment.disputeReason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
            <Button variant="outline" onClick={() => { setShowDisputeDialog(false); setDisputeReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleDispute} disabled={isProcessing || !disputeReason.trim()} data-testid="button-confirm-dispute">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
