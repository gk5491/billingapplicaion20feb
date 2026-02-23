import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  User, Building2, Mail, Phone, MapPin, FileText, CreditCard, 
  IndianRupee, Calendar, Loader2, MessageSquare
} from "lucide-react";

export default function VendorProfilePage() {
  const { user, token } = useAuthStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [vendor, setVendor] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [transactions, setTransactions] = useState<any>({
    purchaseOrders: [],
    bills: [],
    payments: [],
  });
  const [comments, setComments] = useState<any[]>([]);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/vendor/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setVendor(data.data.vendor);
            setTransactions(data.data.transactions || { purchaseOrders: [], bills: [], payments: [] });
            setComments(data.data.comments || []);
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [token]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsAddingComment(true);
    try {
      const res = await fetch("/api/vendor/profile/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: newComment }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [data.data, ...prev]);
        setNewComment("");
        toast({ title: "Comment added" });
      }
    } catch (err) {
      toast({ title: "Failed to add comment", variant: "destructive" });
    } finally {
      setIsAddingComment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="p-6 text-center text-slate-500">Vendor profile not found.</div>
    );
  }

  const statusColor = vendor.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900" data-testid="text-vendor-name">
                  {vendor.displayName || vendor.companyName}
                </h1>
                <Badge className={statusColor}>{vendor.status || "Active"}</Badge>
              </div>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-600">
                {vendor.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {vendor.email}
                  </div>
                )}
                {(vendor.workPhone || vendor.mobile) && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {vendor.workPhone || vendor.mobile}
                  </div>
                )}
                {vendor.billingAddress?.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {vendor.billingAddress.city}, {vendor.billingAddress.state}
                  </div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">GST Treatment</p>
                  <p className="text-sm font-medium text-slate-900">{vendor.gstTreatment || "N/A"}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">PAN</p>
                  <p className="text-sm font-medium text-slate-900">{vendor.pan || "N/A"}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Balance to Pay</p>
                  <p className="text-sm font-medium text-slate-900">₹{(vendor.balanceToPay || 0).toLocaleString("en-IN")}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Unused Credits</p>
                  <p className="text-sm font-medium text-slate-900">₹{(vendor.unusedCredits || 0).toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-slate-900 mb-3">Billing Address</h3>
                {vendor.billingAddress ? (
                  <div className="text-sm text-slate-600 space-y-1">
                    {vendor.billingAddress.attention && <p>{vendor.billingAddress.attention}</p>}
                    {vendor.billingAddress.street1 && <p>{vendor.billingAddress.street1}</p>}
                    {vendor.billingAddress.street2 && <p>{vendor.billingAddress.street2}</p>}
                    <p>{[vendor.billingAddress.city, vendor.billingAddress.state, vendor.billingAddress.pinCode].filter(Boolean).join(", ")}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No billing address</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-slate-900 mb-3">Bank Details</h3>
                {vendor.bankDetails?.bankName ? (
                  <div className="text-sm text-slate-600 space-y-1">
                    <p>Bank: {vendor.bankDetails.bankName}</p>
                    <p>Account: {vendor.bankDetails.accountNumber}</p>
                    <p>IFSC: {vendor.bankDetails.ifscCode}</p>
                    {vendor.bankDetails.branchName && <p>Branch: {vendor.bankDetails.branchName}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No bank details</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-slate-900 mb-3">Purchase Orders</h3>
              {transactions.purchaseOrders.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No purchase orders found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.purchaseOrders.slice(0, 10).map((po: any) => (
                      <TableRow key={po.id}>
                        <TableCell>{po.purchaseOrderNumber || po.id}</TableCell>
                        <TableCell>{po.date ? new Date(po.date).toLocaleDateString("en-IN") : "-"}</TableCell>
                        <TableCell>₹{(po.total || 0).toLocaleString("en-IN")}</TableCell>
                        <TableCell><Badge variant="outline">{po.status || "Draft"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <h3 className="font-semibold text-slate-900 mb-3 mt-6">Bills</h3>
              {transactions.bills.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No bills found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.bills.slice(0, 10).map((bill: any) => (
                      <TableRow key={bill.id}>
                        <TableCell>{bill.billNumber || bill.id}</TableCell>
                        <TableCell>{bill.billDate ? new Date(bill.billDate).toLocaleDateString("en-IN") : "-"}</TableCell>
                        <TableCell>₹{(bill.total || 0).toLocaleString("en-IN")}</TableCell>
                        <TableCell><Badge variant="outline">{bill.status || "Draft"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1"
                  data-testid="input-vendor-comment"
                />
                <Button onClick={handleAddComment} disabled={isAddingComment || !newComment.trim()} data-testid="button-add-comment">
                  {isAddingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                </Button>
              </div>
              {comments.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No comments yet</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment: any, i: number) => (
                    <div key={comment.id || i} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-700">{comment.content}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {comment.author} • {new Date(comment.date || comment.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
