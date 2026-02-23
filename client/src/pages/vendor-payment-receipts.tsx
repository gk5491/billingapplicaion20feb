import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/hooks/use-toast";

export default function VendorPaymentReceiptsPage() {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ amount: 0, paymentStatus: "Not Verified", notes: "" });

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vendor/receipts', { headers });
      if (res.ok) {
        const data = await res.json();
        setReceipts(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load receipts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReceipts(); }, []);

  const handleCreate = async () => {
    if (!form.amount || form.amount <= 0) { toast({ title: 'Amount required', variant: 'destructive' }); return; }
    try {
      const res = await fetch('/api/vendor/receipts', { method: 'POST', headers, body: JSON.stringify(form) });
      if (res.ok) {
        toast({ title: 'Receipt created' });
        setShowCreate(false);
        setForm({ amount: 0, paymentStatus: 'Not Verified', notes: '' });
        fetchReceipts();
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create');
      }
    } catch (err: any) {
      toast({ title: err.message || 'Error', variant: 'destructive' });
    }
  };

  const handleSend = async (id: string) => {
    try {
      const res = await fetch(`/api/vendor/receipts/${id}/send`, { method: 'PATCH', headers });
      if (res.ok) {
        toast({ title: 'Receipt sent to admin' });
        fetchReceipts();
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Failed to send');
      }
    } catch (err: any) {
      toast({ title: err.message || 'Error', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Payment Receipts</h1>
        <Button onClick={() => setShowCreate(true)}>New Receipt</Button>
      </div>

      <div className="bg-white rounded-md border p-4">
        {loading ? (<p>Loading...</p>) : receipts.length === 0 ? (<p>No receipts yet.</p>) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>ID</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Sent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="py-2">{r.id}</td>
                  <td className="py-2">₹{Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="py-2">{r.paymentStatus}</td>
                  <td className="py-2">{r.sentToAdmin ? 'Yes' : 'No'}</td>
                  <td className="py-2">
                    {!r.sentToAdmin && (
                      <Button size="sm" onClick={() => handleSend(r.id)}>Send Receipt</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Payment Receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm(prev => ({ ...prev, amount: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Payment Status</Label>
              <Select value={form.paymentStatus} onValueChange={(v) => setForm(prev => ({ ...prev, paymentStatus: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Verified">Not Verified</SelectItem>
                  <SelectItem value="Verified">Verified</SelectItem>
                  <SelectItem value="PAID">PAID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
