import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
    History,
    Search,
    Filter,
    Download,
    Eye,
    CheckCircle2,
    Clock,
    XCircle,
    RotateCcw
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { useAuthStore } from "@/store/authStore";

export default function CustomerPaymentHistoryPage() {
    const { user } = useAuthStore();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPayment, setSelectedPayment] = useState<any>(null);

    const { data: paymentsData, isLoading } = useQuery<any>({
        queryKey: ["/api/flow/my-payments"],
        enabled: !!user?.id,
    });

    const payments = paymentsData?.data || [];

    const filteredPayments = payments.filter((p: any) => {
        return p.paymentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const getStatusBadge = (status: string) => {
        const s = status?.toLowerCase();
        if (s === 'received' || s === 'paid') {
            return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 gap-1"><CheckCircle2 className="h-3 w-3" /> Received</Badge>;
        }
        if (s === 'pending verification' || s === 'pending') {
            return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 gap-1"><Clock className="h-3 w-3" /> Pending Verification</Badge>;
        }
        if (s === 'not received' || s === 'failed' || s === 'rejected') {
            return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 gap-1"><XCircle className="h-3 w-3" /> Not Received</Badge>;
        }
        return <Badge variant="outline">{status}</Badge>;
    };

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-display text-slate-900 tracking-tight">Payment History</h1>
                    <p className="text-slate-500 font-display">View all your payment records and their current status</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Total Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-display text-slate-900">{payments.length}</div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Total Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-display text-blue-600">
                            ₹{payments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0).toLocaleString('en-IN')}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Pending Verification</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-display text-amber-600">
                            {payments.filter((p: any) => p.status?.toLowerCase().includes('pending')).length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider font-display">Verified</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-display text-green-600">
                            {payments.filter((p: any) => p.status?.toLowerCase() === 'received' || p.status?.toLowerCase() === 'paid').length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by payment number or reference..."
                            className="pl-10 h-9 bg-white border-slate-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <Table>
                    <TableHeader className="bg-slate-100/50">
                        <TableRow>
                            <TableHead className="font-bold text-[11px] text-slate-500 uppercase tracking-wider">Payment #</TableHead>
                            <TableHead className="font-bold text-[11px] text-slate-500 uppercase tracking-wider">Date</TableHead>
                            <TableHead className="font-bold text-[11px] text-slate-500 uppercase tracking-wider">Reference</TableHead>
                            <TableHead className="font-bold text-[11px] text-slate-500 uppercase tracking-wider">Mode</TableHead>
                            <TableHead className="font-bold text-[11px] text-slate-500 uppercase tracking-wider">Status</TableHead>
                            <TableHead className="font-bold text-[11px] text-slate-500 uppercase tracking-wider text-right">Amount</TableHead>
                            <TableHead className="font-bold text-[11px] text-slate-500 uppercase tracking-wider text-right pr-6">Detail</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-20 text-slate-400">Loading history...</TableCell>
                            </TableRow>
                        ) : filteredPayments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-24 text-slate-400">
                                    <div className="flex flex-col items-center gap-3">
                                        <History className="h-12 w-12 text-slate-200" />
                                        <p>No payment history found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPayments.map((p: any) => (
                                <TableRow key={p.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedPayment(p)}>
                                    <TableCell className="font-bold text-slate-900">{p.paymentNumber}</TableCell>
                                    <TableCell className="text-slate-500">{format(new Date(p.date), "MMM d, yyyy")}</TableCell>
                                    <TableCell className="text-slate-500">{p.referenceNumber || '-'}</TableCell>
                                    <TableCell><Badge variant="outline" className="font-normal font-display">{p.mode}</Badge></TableCell>
                                    <TableCell>{getStatusBadge(p.status)}</TableCell>
                                    <TableCell className="text-right font-bold text-slate-900">₹{p.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Sheet open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
                <SheetContent className="sm:max-w-lg overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <SheetTitle className="text-2xl font-bold font-display">Payment Detail</SheetTitle>
                    </SheetHeader>

                    {selectedPayment && (
                        <div className="space-y-6 font-display">
                            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Status</p>
                                    <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Amount</p>
                                    <p className="text-2xl font-bold text-blue-600">₹{selectedPayment.amount?.toLocaleString('en-IN')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-y-6">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Payment #</p>
                                    <p className="font-bold text-slate-900">{selectedPayment.paymentNumber}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Date</p>
                                    <p className="font-bold text-slate-900">{format(new Date(selectedPayment.date), "PPP")}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Reference</p>
                                    <p className="font-bold text-slate-900">{selectedPayment.referenceNumber || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Mode</p>
                                    <p className="font-bold text-slate-900">{selectedPayment.mode}</p>
                                </div>
                            </div>

                            {selectedPayment.invoices && selectedPayment.invoices.length > 0 && (
                                <div className="border-t pt-4">
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-3">Allocated To</p>
                                    <div className="space-y-2">
                                        {selectedPayment.invoices.map((inv: any, idx: number) => (
                                            <div key={idx} className="flex justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                                                <span className="font-medium text-slate-700">{inv.invoiceNumber}</span>
                                                <span className="font-bold text-slate-900">₹{inv.amountApplied?.toLocaleString('en-IN')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedPayment.attachments && selectedPayment.attachments.length > 0 && (
                                <div className="border-t pt-4">
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-3">Proof of Payment</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedPayment.attachments.map((file: any, idx: number) => (
                                            <a
                                                key={idx}
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                                            >
                                                <Download className="h-4 w-4" />
                                                {file.name}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedPayment.notes && (
                                <div className="border-t pt-4">
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-2">Notes</p>
                                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 italic">
                                        "{selectedPayment.notes}"
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
