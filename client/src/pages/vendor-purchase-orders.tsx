import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShoppingBag, Check, X, Eye, Loader2, FileText } from "lucide-react";

export default function VendorPurchaseOrdersPage() {
  const { user, token } = useAuthStore();
  const { toast } = useToast();
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectingPO, setRejectingPO] = useState<any>(null);

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

  useEffect(() => { fetchPOs(); }, [token]);

  const handleAccept = async (po: any) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/vendor/purchase-orders/${po.id}/accept`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: "Purchase order accepted" });
        fetchPOs();
      } else {
        toast({ title: "Failed to accept PO", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error accepting PO", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast({ title: "Please provide a rejection reason", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/vendor/purchase-orders/${rejectingPO.id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        toast({ title: "Purchase order rejected" });
        setShowRejectDialog(false);
        setRejectReason("");
        setRejectingPO(null);
        fetchPOs();
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
    const colors: Record<string, string> = {
      Draft: "bg-slate-100 text-slate-700",
      Sent: "bg-blue-100 text-blue-700",
      Accepted: "bg-green-100 text-green-700",
      Rejected: "bg-red-100 text-red-700",
      Issued: "bg-blue-100 text-blue-700",
      Closed: "bg-slate-100 text-slate-700",
    };
    return <Badge className={colors[status] || "bg-slate-100 text-slate-700"}>{status}</Badge>;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="text-vendor-po-title">Purchase Orders</h1>
          <p className="text-slate-500 mt-1">View and respond to purchase orders from admin</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : purchaseOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No purchase orders found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.purchaseOrderNumber || `PO-${po.id}`}</TableCell>
                    <TableCell>{po.date ? new Date(po.date).toLocaleDateString("en-IN") : "-"}</TableCell>
                    <TableCell>{po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString("en-IN") : "-"}</TableCell>
                    <TableCell>{po.items?.length || 0} items</TableCell>
                    <TableCell>₹{(po.total || 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell>{getStatusBadge(po.status || "Draft")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedPO(po); setShowDetailDialog(true); }}
                          data-testid={`button-view-po-${po.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(po.status === "Sent" || po.status === "Issued") && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleAccept(po)}
                              disabled={isProcessing}
                              data-testid={`button-accept-po-${po.id}`}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => { setRejectingPO(po); setShowRejectDialog(true); }}
                              disabled={isProcessing}
                              data-testid={`button-reject-po-${po.id}`}
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
            <DialogDescription>
              {selectedPO?.purchaseOrderNumber || `PO-${selectedPO?.id}`}
            </DialogDescription>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Date</p>
                  <p className="font-medium">{selectedPO.date ? new Date(selectedPO.date).toLocaleDateString("en-IN") : "-"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Status</p>
                  {getStatusBadge(selectedPO.status || "Draft")}
                </div>
                <div>
                  <p className="text-slate-500">Delivery Date</p>
                  <p className="font-medium">{selectedPO.expectedDeliveryDate ? new Date(selectedPO.expectedDeliveryDate).toLocaleDateString("en-IN") : "-"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Total</p>
                  <p className="font-medium">₹{(selectedPO.total || 0).toLocaleString("en-IN")}</p>
                </div>
              </div>
              {selectedPO.rejectionReason && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-sm font-medium text-red-700">Rejection Reason:</p>
                  <p className="text-sm text-red-600">{selectedPO.rejectionReason}</p>
                </div>
              )}
              {selectedPO.items && selectedPO.items.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPO.items.map((item: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{item.name || item.itemName || item.description}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₹{(item.rate || 0).toLocaleString("en-IN")}</TableCell>
                          <TableCell>₹{(item.amount || (item.quantity * item.rate) || 0).toLocaleString("en-IN")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={(v) => { if (!v) { setShowRejectDialog(false); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Purchase Order</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {rejectingPO?.purchaseOrderNumber || `PO-${rejectingPO?.id}`}
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
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing || !rejectReason.trim()} data-testid="button-confirm-reject">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
