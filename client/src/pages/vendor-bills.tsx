import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Plus, Eye, Edit, Loader2, Send, Trash2 } from "lucide-react";

interface BillItem {
  name: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export default function VendorBillsPage() {
  const { user, token } = useAuthStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [bills, setBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);

  const [billForm, setBillForm] = useState({
    purchaseOrderId: "",
    billNumber: "",
    billDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    notes: "",
    items: [{ name: "", description: "", quantity: 1, rate: 0, amount: 0 }] as BillItem[],
  });

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

  const fetchPOs = async () => {
    try {
      const res = await fetch("/api/vendor/purchase-orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setPurchaseOrders((data.data || []).filter((po: any) => po.status === "Accepted"));
      }
    } catch (err) {
      console.error("Failed to load POs:", err);
    }
  };

  useEffect(() => { fetchBills(); fetchPOs(); }, [token]);

  const updateItem = (index: number, field: keyof BillItem, value: any) => {
    setBillForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      items[index].amount = items[index].quantity * items[index].rate;
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setBillForm((prev) => ({
      ...prev,
      items: [...prev.items, { name: "", description: "", quantity: 1, rate: 0, amount: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    setBillForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handlePOSelect = (poId: string) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (po) {
      setBillForm((prev) => ({
        ...prev,
        purchaseOrderId: poId,
        items: (po.items || []).map((item: any) => ({
          name: item.name || item.itemName || item.description || "",
          description: item.description || "",
          quantity: item.quantity || 1,
          rate: item.rate || 0,
          amount: (item.quantity || 1) * (item.rate || 0),
        })),
      }));
    }
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
        setBillForm({
          purchaseOrderId: "",
          billNumber: "",
          billDate: new Date().toISOString().split("T")[0],
          dueDate: "",
          notes: "",
          items: [{ name: "", description: "", quantity: 1, rate: 0, amount: 0 }],
        });
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

  const handleResubmit = async (billId: string) => {
    try {
      const res = await fetch(`/api/vendor/bills/${billId}/resubmit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: "Bill resubmitted for approval" });
        fetchBills();
      } else {
        toast({ title: "Failed to resubmit bill", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error resubmitting bill", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      "Pending Approval": "bg-yellow-100 text-yellow-700",
      Approved: "bg-green-100 text-green-700",
      Rejected: "bg-red-100 text-red-700",
      Paid: "bg-blue-100 text-blue-700",
      "Partially Paid": "bg-orange-100 text-orange-700",
      Unpaid: "bg-slate-100 text-slate-700",
    };
    return <Badge className={colors[status] || "bg-slate-100 text-slate-700"}>{status}</Badge>;
  };

  const billTotal = billForm.items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="text-vendor-bills-title">Bills</h1>
          <p className="text-slate-500 mt-1">Create and manage your bills</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-bill">
          <Plus className="h-4 w-4 mr-2" /> Create Bill
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : bills.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No bills found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">{bill.billNumber || bill.id}</TableCell>
                    <TableCell>{bill.billDate ? new Date(bill.billDate).toLocaleDateString("en-IN") : "-"}</TableCell>
                    <TableCell>{bill.dueDate ? new Date(bill.dueDate).toLocaleDateString("en-IN") : "-"}</TableCell>
                    <TableCell>₹{(bill.total || 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell>{getStatusBadge(bill.status || "Unpaid")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedBill(bill); setShowDetailDialog(true); }}
                          data-testid={`button-view-bill-${bill.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {bill.status === "Rejected" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600"
                            onClick={() => handleResubmit(bill.id)}
                            data-testid={`button-resubmit-bill-${bill.id}`}
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill Details</DialogTitle>
            <DialogDescription>{selectedBill?.billNumber || `Bill-${selectedBill?.id}`}</DialogDescription>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-slate-500">Date</p><p className="font-medium">{selectedBill.billDate ? new Date(selectedBill.billDate).toLocaleDateString("en-IN") : "-"}</p></div>
                <div><p className="text-slate-500">Status</p>{getStatusBadge(selectedBill.status || "Unpaid")}</div>
                <div><p className="text-slate-500">Due Date</p><p className="font-medium">{selectedBill.dueDate ? new Date(selectedBill.dueDate).toLocaleDateString("en-IN") : "-"}</p></div>
                <div><p className="text-slate-500">Total</p><p className="font-medium">₹{(selectedBill.total || 0).toLocaleString("en-IN")}</p></div>
              </div>
              {selectedBill.rejectionReason && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-sm font-medium text-red-700">Rejection Reason:</p>
                  <p className="text-sm text-red-600">{selectedBill.rejectionReason}</p>
                </div>
              )}
              {selectedBill.items && selectedBill.items.length > 0 && (
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
                    {selectedBill.items.map((item: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{item.name || item.itemName || item.description}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₹{(item.rate || 0).toLocaleString("en-IN")}</TableCell>
                        <TableCell>₹{(item.amount || 0).toLocaleString("en-IN")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {selectedBill.notes && (
                <div><p className="text-sm text-slate-500">Notes</p><p className="text-sm">{selectedBill.notes}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateDialog} onOpenChange={(v) => { if (!v) setShowCreateDialog(false); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Bill</DialogTitle>
            <DialogDescription>Create a bill for an accepted purchase order</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Purchase Order</Label>
                <Select value={billForm.purchaseOrderId} onValueChange={handlePOSelect}>
                  <SelectTrigger data-testid="select-po-for-bill">
                    <SelectValue placeholder="Select a PO (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchaseOrders.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.purchaseOrderNumber || `PO-${po.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bill Number *</Label>
                <Input
                  value={billForm.billNumber}
                  onChange={(e) => setBillForm((prev) => ({ ...prev, billNumber: e.target.value }))}
                  placeholder="e.g., BILL-001"
                  data-testid="input-bill-number"
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
              <div className="flex items-center justify-between mb-2">
                <Label>Items</Label>
                <Button variant="outline" size="sm" onClick={addItem} data-testid="button-add-item">
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {billForm.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_100px_100px_32px] gap-2 items-center">
                    <Input
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => updateItem(i, "name", e.target.value)}
                      data-testid={`input-item-name-${i}`}
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)}
                      data-testid={`input-item-qty-${i}`}
                    />
                    <Input
                      type="number"
                      placeholder="Rate"
                      value={item.rate}
                      onChange={(e) => updateItem(i, "rate", parseFloat(e.target.value) || 0)}
                      data-testid={`input-item-rate-${i}`}
                    />
                    <div className="text-sm font-medium text-right">₹{item.amount.toLocaleString("en-IN")}</div>
                    {billForm.items.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="text-red-500 h-8 w-8 p-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-right mt-2 font-semibold">Total: ₹{billTotal.toLocaleString("en-IN")}</div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={billForm.notes}
                onChange={(e) => setBillForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes"
                data-testid="input-bill-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateBill} disabled={isSubmitting} data-testid="button-submit-bill">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
