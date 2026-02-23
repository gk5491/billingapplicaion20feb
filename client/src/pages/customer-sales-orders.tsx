import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Download, X, Printer, FileText, Eye } from "lucide-react";
import { SalesOrderPdfView } from "@/components/SalesOrderPdfView";
import { generatePDFFromElement } from "@/lib/pdf-utils";
import { robustIframePrint } from "@/lib/robust-print";
import { useBranding } from "@/hooks/use-branding";
import { useOrganization } from "@/context/OrganizationContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getStatusBadgeClass = (status: string) => {
  const s = status?.toLowerCase() || '';
  if (s === 'confirmed' || s === 'closed' || s === 'invoiced' || s === 'paid' || s === 'shipped' || s === 'delivered' || s === 'approved' || s === 'partially invoiced') {
    return 'bg-green-50 text-green-700 border-green-200';
  }
  if (s === 'draft' || s === 'pending' || s === 'not invoiced' || s === 'unpaid' || s === 'sent') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (s === 'rejected' || s === 'cancelled' || s === 'void') {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  return 'bg-slate-50 text-slate-500 border-slate-200';
};

function SalesOrderDetailPanel({
  order,
  onClose,
  isAdmin,
  onRefresh,
}: {
  order: any;
  onClose: () => void;
  isAdmin: boolean;
  onRefresh: () => void;
}) {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const { data: branding } = useBranding();
  const { currentOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState("details");
  const queryClient = useQueryClient();

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const res = await fetch(`/api/flow/sales-orders/${id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || `Failed to ${action} sales order`);
      return result;
    },
    onSuccess: (data, variables) => {
      toast({ title: "Success", description: `Sales order ${variables.action}d successfully` });
      queryClient.invalidateQueries({ queryKey: ["/api/flow/my-sales-orders"] });
      onRefresh();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleDownloadPDF = async () => {
    toast({ title: "Preparing download...", description: "Please wait while we generate the PDF." });
    if (activeTab !== "pdf") {
      setActiveTab("pdf");
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    try {
      await generatePDFFromElement("sales-order-pdf-preview", `SalesOrder-${order.salesOrderNumber}.pdf`);
      toast({ title: "PDF Downloaded", description: `${order.salesOrderNumber}.pdf has been downloaded successfully.` });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({ title: "Failed to download PDF", description: "Please try again.", variant: "destructive" });
    }
  };

  const handlePrint = async () => {
    toast({ title: "Preparing print...", description: "Please wait." });
    if (activeTab !== "pdf") {
      setActiveTab("pdf");
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    try {
      await robustIframePrint('sales-order-pdf-preview', `SalesOrder_${order.salesOrderNumber}`);
    } catch (error) {
      console.error('Print failed:', error);
      toast({ title: "Print failed", variant: "destructive" });
    }
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50/50">
        <div>
          <h2 className="text-lg font-bold text-slate-900 font-display tracking-tight">{order.salesOrderNumber}</h2>
          <p className="text-xs text-slate-500 font-display">Date: {formatDate(order.date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleDownloadPDF} data-testid="button-download-so-pdf">
            <Download className="h-4 w-4 text-slate-600" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrint} data-testid="button-print-so">
            <Printer className="h-4 w-4 text-slate-600" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" onClick={onClose} data-testid="button-close-so-panel">
            <X className="h-4 w-4 text-slate-500" />
          </Button>
        </div>
      </div>

      {order.orderStatus === 'Sent' && (
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200 bg-blue-50/30">
          <Button
            onClick={() => actionMutation.mutate({ id: order.id, action: 'approve' })}
            disabled={actionMutation.isPending}
            size="sm"
            className="h-8 px-3 font-bold font-display bg-green-600 hover:bg-green-700"
            data-testid="button-approve-so"
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            Approve
          </Button>
          <Button
            onClick={() => actionMutation.mutate({ id: order.id, action: 'reject' })}
            disabled={actionMutation.isPending}
            variant="outline"
            size="sm"
            className="h-8 px-3 font-bold font-display text-red-600 hover:text-red-700 hover:bg-red-50 border-slate-200"
            data-testid="button-reject-so"
          >
            <XCircle className="h-3.5 w-3.5 mr-1.5" />
            Reject
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center px-5 border-b border-slate-200">
          <TabsList className="h-auto p-0 bg-transparent gap-6">
            <TabsTrigger
              value="details"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none shadow-none px-0 py-3 font-bold font-display text-xs uppercase tracking-widest transition-all"
            >
              Details
            </TabsTrigger>
            <TabsTrigger
              value="pdf"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none shadow-none px-0 py-3 font-bold font-display text-xs uppercase tracking-widest transition-all"
            >
              PDF Preview
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="details" className="flex-1 overflow-auto p-5 mt-0">
          <div className="space-y-6">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className={`font-bold font-display text-[10px] uppercase tracking-wider ${getStatusBadgeClass(order.orderStatus)}`}>
                {order.orderStatus === 'Sent' ? 'Received' : order.orderStatus}
              </Badge>
              {order.invoiceStatus && (
                <Badge variant="outline" className={`font-bold font-display text-[10px] uppercase tracking-wider ${getStatusBadgeClass(order.invoiceStatus)}`}>
                  Invoice: {order.invoiceStatus}
                </Badge>
              )}
              {order.paymentStatus && (
                <Badge variant="outline" className={`font-bold font-display text-[10px] uppercase tracking-wider ${getStatusBadgeClass(order.paymentStatus)}`}>
                  Payment: {order.paymentStatus}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-display mb-1">Expected Shipment</p>
                <p className="font-bold text-slate-900 font-display">{formatDate(order.expectedShipmentDate)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-display mb-1">Reference#</p>
                <p className="font-bold text-slate-900 font-display">{order.referenceNumber || '-'}</p>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display mb-3">Items</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold uppercase text-[10px] tracking-wider text-slate-500 font-display">Item</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] tracking-wider text-slate-500 font-display text-center">Qty</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] tracking-wider text-slate-500 font-display text-right">Rate</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] tracking-wider text-slate-500 font-display text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-slate-400 font-display">No items</TableCell>
                      </TableRow>
                    )}
                    {order.items?.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-slate-900 font-display">
                          <div>{item.name}</div>
                          {item.description && <div className="text-xs text-slate-400">{item.description}</div>}
                        </TableCell>
                        <TableCell className="text-center text-slate-600 font-display">{item.quantity} {item.unit || ''}</TableCell>
                        <TableCell className="text-right text-slate-600 font-display">{formatCurrency(item.rate)}</TableCell>
                        <TableCell className="text-right font-bold text-slate-900 font-display">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="w-64 space-y-2 border-t border-slate-100 pt-4">
                {order.subTotal !== undefined && order.subTotal !== order.total && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-display">Sub Total</span>
                    <span className="font-bold text-slate-700 font-display">{formatCurrency(order.subTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-display font-medium">Total Amount</span>
                  <span className="text-slate-900 font-bold text-lg font-display">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pdf" className="flex-1 overflow-auto bg-slate-100 p-6 flex justify-center mt-0">
          <div className="w-full max-w-[210mm] shadow-xl bg-white">
            <div id="sales-order-pdf-preview">
              <SalesOrderPdfView
                order={order}
                branding={branding}
                organization={currentOrganization}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CustomerSalesOrdersPage() {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: ordersResponse, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/flow/my-sales-orders"],
  });

  const orders = ordersResponse?.data || [];

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  useEffect(() => {
    if (selectedOrder && orders.length > 0) {
      const updated = orders.find((o: any) => o.id === selectedOrder.id);
      if (updated) setSelectedOrder(updated);
    }
  }, [orders]);

  const handleRowClick = (order: any) => {
    setSelectedOrder(order);
  };

  if (isLoading) {
    return <div className="p-20 text-center font-display font-medium text-slate-500">Loading sales orders...</div>;
  }

  return (
    <div className="container mx-auto py-10 flex gap-6 relative">
      <div className={`flex-1 transition-all duration-300 ${selectedOrder ? 'mr-[400px] lg:mr-[600px]' : ''}`}>
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-2xl font-bold font-display tracking-tight">My Sales Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-100/50">
                <TableRow>
                  <TableHead className="font-bold uppercase text-[11px] tracking-wider text-slate-500">Order #</TableHead>
                  <TableHead className="font-bold uppercase text-[11px] tracking-wider text-slate-500">Date</TableHead>
                  <TableHead className="font-bold uppercase text-[11px] tracking-wider text-slate-500">Total</TableHead>
                  <TableHead className="font-bold uppercase text-[11px] tracking-wider text-slate-500">Status</TableHead>
                  <TableHead className="font-bold uppercase text-[11px] tracking-wider text-slate-500 text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-display">No sales orders found.</TableCell>
                  </TableRow>
                )}
                {orders.map((order: any) => (
                  <TableRow
                    key={order.id}
                    className={`cursor-pointer hover:bg-slate-50 transition-colors group ${selectedOrder?.id === order.id ? 'bg-blue-50/50' : ''}`}
                    onClick={() => handleRowClick(order)}
                    data-testid={`row-sales-order-${order.id}`}
                  >
                    <TableCell className="font-bold text-slate-900 font-display">{order.salesOrderNumber}</TableCell>
                    <TableCell className="text-slate-500 font-display">{formatDate(order.date)}</TableCell>
                    <TableCell className="font-bold text-slate-900 font-display">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`font-bold font-display text-[10px] uppercase tracking-wider ${getStatusBadgeClass(order.orderStatus)}`}
                      >
                        {order.orderStatus === 'Sent' ? 'Received' : order.orderStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        {(order.orderStatus === "Sent" || order.orderStatus === "Draft") && (
                          <>
                            <Button size="sm" className="h-8 px-3 font-bold font-display" onClick={() => {
                              const actionMut = async () => {
                                try {
                                  const res = await fetch(`/api/flow/sales-orders/${order.id}/action`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ action: 'approve' })
                                  });
                                  const result = await res.json();
                                  if (!res.ok) throw new Error(result.message);
                                  toast({ title: "Success", description: "Sales order approved" });
                                  refetch();
                                } catch (error: any) {
                                  toast({ variant: "destructive", title: "Error", description: error.message });
                                }
                              };
                              actionMut();
                            }} data-testid={`button-approve-${order.id}`}>Approve</Button>
                            <Button size="sm" variant="outline" className="h-8 px-3 font-bold font-display text-red-600 hover:text-red-700 hover:bg-red-50 border-slate-200" onClick={() => {
                              const actionMut = async () => {
                                try {
                                  const res = await fetch(`/api/flow/sales-orders/${order.id}/action`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ action: 'reject' })
                                  });
                                  const result = await res.json();
                                  if (!res.ok) throw new Error(result.message);
                                  toast({ title: "Success", description: "Sales order rejected" });
                                  refetch();
                                } catch (error: any) {
                                  toast({ variant: "destructive", title: "Error", description: error.message });
                                }
                              };
                              actionMut();
                            }} data-testid={`button-reject-${order.id}`}>Reject</Button>
                          </>
                        )}
                        {order.orderStatus === "Approved" && (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-green-600 font-bold font-display text-xs uppercase tracking-wider">Approved</span>
                          </div>
                        )}
                        {order.orderStatus === "Rejected" && <span className="text-red-600 font-bold font-display text-xs uppercase tracking-wider">Rejected</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {selectedOrder && (
        <div className="fixed inset-y-0 right-0 w-full max-w-[400px] lg:max-w-[600px] z-50 border-l border-slate-200 shadow-2xl animate-in slide-in-from-right duration-300">
          <SalesOrderDetailPanel
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            isAdmin={false}
            onRefresh={() => refetch()}
          />
        </div>
      )}
    </div>
  );
}
