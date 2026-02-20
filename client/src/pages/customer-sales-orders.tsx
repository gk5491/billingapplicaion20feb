import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Download, 
  X,
  Search,
  Filter,
  MoreHorizontal,
  ChevronDown,
  Clock,
  Printer,
  Calendar,
  Building2,
  MapPin,
  Truck,
  Receipt,
  CreditCard
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SalesOrderPdfView } from "@/components/SalesOrderPdfView";
import { generatePDFFromElement } from "@/lib/pdf-utils";
import { useBranding } from "@/hooks/use-branding";
import { useOrganization } from "@/context/OrganizationContext";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SalesOrderListItem {
  id: string;
  date: string;
  salesOrderNumber: string;
  referenceNumber: string;
  customerName: string;
  orderStatus: string;
  invoiceStatus: string;
  paymentStatus: string;
  total: number;
  expectedShipmentDate: string;
  items: any[];
}

const formatCurrency = (amount: number) => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getStatusBadgeStyles = (status: string) => {
  const statusLower = status?.toLowerCase() || '';
  if (statusLower === 'confirmed' || statusLower === 'closed' || statusLower === 'invoiced' || statusLower === 'paid' || statusLower === 'shipped' || statusLower === 'delivered' || statusLower === 'partially invoiced' || statusLower === 'approved') {
    return 'bg-green-50 text-green-700 border-green-200 font-display font-bold text-[10px] uppercase tracking-wider px-2 py-0.5';
  }
  if (statusLower === 'draft' || statusLower === 'pending' || statusLower === 'not invoiced' || statusLower === 'unpaid' || statusLower === 'sent') {
    return 'bg-amber-50 text-amber-700 border-amber-200 font-display font-bold text-[10px] uppercase tracking-wider px-2 py-0.5';
  }
  if (statusLower === 'rejected' || statusLower === 'cancelled' || statusLower === 'void') {
    return 'bg-red-50 text-red-700 border-red-200 font-display font-bold text-[10px] uppercase tracking-wider px-2 py-0.5';
  }
  return 'bg-slate-50 text-slate-600 border-slate-200 font-display font-bold text-[10px] uppercase tracking-wider px-2 py-0.5';
};

export default function CustomerSalesOrdersPage() {
    const { token } = useAuthStore();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { data: branding } = useBranding();
    const { currentOrganization } = useOrganization();

    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("details");

    const { data: ordersResponse, isLoading } = useQuery<any>({
        queryKey: ["/api/flow/my-sales-orders"],
    });

    const orders = ordersResponse?.data || [];

    const filteredOrders = orders.filter((order: any) => 
        order.salesOrderNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const actionMutation = useMutation({
        mutationFn: async ({ id, action }: { id: string, action: 'approve' | 'reject' }) => {
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
            if (selectedOrder?.id === variables.id) {
              setSelectedOrder((prev: any) => ({ ...prev, orderStatus: variables.action === 'approve' ? 'Approved' : 'Rejected' }));
            }
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const handleDownloadPDF = async (order: any) => {
        toast({ title: "Preparing download...", description: "Please wait while we generate your PDF." });
        try {
            await generatePDFFromElement("sales-order-pdf-preview", `SalesOrder-${order.salesOrderNumber}.pdf`);
            toast({
                title: "PDF Downloaded",
                description: `${order.salesOrderNumber}.pdf has been downloaded successfully.`
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

    if (isLoading) return <div className="p-8 text-center font-display font-medium text-slate-500">Loading your sales orders...</div>;

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <ResizablePanelGroup direction="horizontal" className="flex-1">
                <ResizablePanel defaultSize={40} minSize={30} className="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">My Sales Orders</h1>
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <Input
                                placeholder="Search sales orders..."
                                className="pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all font-display text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        {filteredOrders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400 p-8 text-center">
                                <Package className="h-12 w-12 mb-4 opacity-20" />
                                <p className="font-display font-medium">No sales orders found</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredOrders.map((order: any) => (
                                    <div
                                        key={order.id}
                                        onClick={() => setSelectedOrder(order)}
                                        className={cn(
                                            "p-4 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 group",
                                            selectedOrder?.id === order.id ? "bg-blue-50/50 dark:bg-blue-900/10 border-l-2 border-blue-500 shadow-sm" : "border-l-2 border-transparent"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-slate-900 dark:text-white font-display group-hover:text-blue-600 transition-colors">{order.salesOrderNumber}</span>
                                            <span className="font-bold text-slate-900 dark:text-white font-display">{formatCurrency(order.total)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-display">
                                            <div className="flex items-center gap-2">
                                                <span>{formatDate(order.date)}</span>
                                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                                <Badge variant="outline" className={getStatusBadgeStyles(order.orderStatus)}>
                                                    {order.orderStatus === 'Sent' ? 'Received' : order.orderStatus}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle className="bg-slate-200 dark:bg-slate-800" />

                <ResizablePanel defaultSize={60} minSize={40} className="bg-slate-50 dark:bg-slate-950">
                    {selectedOrder ? (
                        <div className="h-full flex flex-col bg-white dark:bg-slate-900">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight">{selectedOrder.salesOrderNumber}</h2>
                                    <p className="text-sm font-medium text-slate-500 font-display">Date: {formatDate(selectedOrder.date)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" className="h-8 gap-1.5 font-bold font-display" onClick={() => handleDownloadPDF(selectedOrder)}>
                                        <Download className="h-3.5 w-3.5" />
                                        Download PDF
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(null)} className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                                        <X className="h-5 w-5 text-slate-500" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-x-auto flex-wrap scrollbar-hide">
                                {selectedOrder.orderStatus === 'Sent' && (
                                    <>
                                        <Button
                                            onClick={() => actionMutation.mutate({ id: selectedOrder.id, action: 'approve' })}
                                            disabled={actionMutation.isPending}
                                            variant="default"
                                            size="sm"
                                            className="h-8 gap-1.5 bg-green-600 hover:bg-green-700 font-bold font-display"
                                        >
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            Approve Order
                                        </Button>
                                        <Button
                                            onClick={() => actionMutation.mutate({ id: selectedOrder.id, action: 'reject' })}
                                            disabled={actionMutation.isPending}
                                            variant="destructive"
                                            size="sm"
                                            className="h-8 gap-1.5 font-bold font-display"
                                        >
                                            <XCircle className="h-3.5 w-3.5" />
                                            Reject Order
                                        </Button>
                                    </>
                                )}
                                <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />
                                <Badge className={cn("ml-auto", getStatusBadgeStyles(selectedOrder.orderStatus))}>
                                    Status: {selectedOrder.orderStatus === 'Sent' ? 'Received' : selectedOrder.orderStatus}
                                </Badge>
                            </div>

                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
                                    <TabsList className="h-auto p-0 bg-transparent gap-8">
                                        <TabsTrigger
                                            value="details"
                                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none shadow-none px-0 py-4 font-bold font-display text-xs uppercase tracking-widest transition-all"
                                        >
                                            Details
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="pdf"
                                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none shadow-none px-0 py-4 font-bold font-display text-xs uppercase tracking-widest transition-all"
                                        >
                                            PDF Preview
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="details" className="flex-1 overflow-auto scrollbar-hide p-6 mt-0">
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Package className="h-4 w-4 text-slate-500" />
                                                    <span className="text-xs text-slate-500 uppercase font-bold tracking-wider font-display">Items</span>
                                                </div>
                                                <span className="text-sm font-bold text-slate-900 dark:text-white font-display">{selectedOrder.items?.length || 0} Products</span>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Calendar className="h-4 w-4 text-slate-500" />
                                                    <span className="text-xs text-slate-500 uppercase font-bold tracking-wider font-display">Shipment Date</span>
                                                </div>
                                                <span className="text-sm font-bold text-slate-900 dark:text-white font-display">{formatDate(selectedOrder.expectedShipmentDate)}</span>
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                                            <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest font-display mb-4">Items Breakdown</h4>
                                            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display">Item</th>
                                                            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display">Qty</th>
                                                            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display">Rate</th>
                                                            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display">Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                        {selectedOrder.items?.map((item: any, idx: number) => (
                                                            <tr key={idx}>
                                                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.name}</td>
                                                                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{item.quantity} {item.unit}</td>
                                                                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{formatCurrency(item.rate)}</td>
                                                                <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(item.amount)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4">
                                            <div className="w-64 space-y-3">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-500 font-medium font-display">Total Amount</span>
                                                    <span className="text-slate-900 dark:text-white font-bold text-lg font-display">{formatCurrency(selectedOrder.total)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="pdf" className="flex-1 overflow-auto scrollbar-hide bg-slate-100 dark:bg-slate-800 p-8 flex justify-center mt-0">
                                    <div className="w-full max-w-[210mm] shadow-xl bg-white">
                                        <div id="sales-order-pdf-preview">
                                            <SalesOrderPdfView
                                                order={selectedOrder}
                                                branding={branding}
                                                organization={currentOrganization}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 text-center">
                            <FileText className="h-20 w-20 mb-6 opacity-10" />
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 font-display">Select an Order</h3>
                            <p className="max-w-md font-display text-slate-500 dark:text-slate-400">Select a sales order from the list on the left to view its complete details, download the PDF, or approve the order.</p>
                        </div>
                    )}
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}

