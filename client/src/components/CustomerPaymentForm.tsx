import { useState, useEffect } from "react";
import {
    Calendar as CalendarIcon,
    Upload,
    X,
    CheckCircle,
    AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/authStore";

const PAYMENT_MODES = [
    "Bank Transfer",
    "Cash",
    "Cheque",
    "Credit Card",
    "Debit Card",
    "UPI",
    "Net Banking",
    "Other"
];

interface Invoice {
    id: string;
    invoiceNumber: string;
    date: string;
    total: number;
    balanceDue: number;
    status: string;
}

interface CustomerPaymentFormProps {
    invoices: Invoice[];
    initialInvoiceId?: string;
    onSuccess: () => void;
    onCancel: () => void;
}

export function CustomerPaymentForm({ invoices, initialInvoiceId, onSuccess, onCancel }: CustomerPaymentFormProps) {
    const { token } = useAuthStore();
    const { toast } = useToast();

    const [paymentDate, setPaymentDate] = useState<Date>(new Date());
    const [paymentMode, setPaymentMode] = useState<string>("Bank Transfer");
    const [referenceNumber, setReferenceNumber] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [amountReceived, setAmountReceived] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedInvoices, setSelectedInvoices] = useState<Record<string, { selected: boolean; payment: number }>>({});
    const [attachments, setAttachments] = useState<any[]>([]);

    // Initialize selected invoices
    useEffect(() => {
        const initial: Record<string, { selected: boolean; payment: number }> = {};
        invoices.forEach(inv => {
            initial[inv.id] = { selected: false, payment: 0 };
        });

        if (initialInvoiceId) {
            const inv = invoices.find(i => i.id === initialInvoiceId);
            if (inv) {
                initial[inv.id] = { selected: true, payment: inv.balanceDue };
                setAmountReceived(inv.balanceDue);
            }
        }
        setSelectedInvoices(initial);
    }, [invoices, initialInvoiceId]);

    // Handle amount change
    const handleAmountChange = (val: string) => {
        const amount = parseFloat(val) || 0;
        const maxAmount = invoices.find(inv => inv.id === initialInvoiceId)?.balanceDue || 0;
        
        if (amount > maxAmount) {
            setAmountReceived(maxAmount);
            // Update selection for the single invoice
            if (initialInvoiceId) {
                setSelectedInvoices({
                    [initialInvoiceId]: { selected: true, payment: maxAmount }
                });
            }
        } else {
            setAmountReceived(amount);
            if (initialInvoiceId) {
                setSelectedInvoices({
                    [initialInvoiceId]: { selected: true, payment: amount }
                });
            }
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            // In a real app, upload to server and get URL
            // For now, we'll simulate it
            toast({ title: "Uploading...", description: "Proof of payment is being uploaded." });

            // Simulate upload
            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData
                });
                const data = await res.json();
                if (data.success) {
                    setAttachments(prev => [...prev, { name: file.name, url: data.url }]);
                    toast({ title: "Success", description: "Proof uploaded successfully." });
                }
            } catch (err) {
                toast({ title: "Upload Failed", description: "Could not upload proof.", variant: "destructive" });
            }
        }
    };

    const handleSubmit = async () => {
        if (amountReceived <= 0) {
            toast({ title: "Validation Error", description: "Please enter a valid amount.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);

        const payload = {
            amount: amountReceived,
            date: paymentDate.toISOString(),
            mode: paymentMode,
            referenceNumber,
            notes,
            attachments,
            invoices: Object.entries(selectedInvoices)
                .filter(([_, data]) => data.selected && data.payment > 0)
                .map(([id, data]) => ({
                    invoiceId: id,
                    invoiceNumber: invoices.find(inv => inv.id === id)?.invoiceNumber,
                    paymentAmount: data.payment
                }))
        };

        try {
            const res = await fetch('/api/flow/payments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast({ title: "Payment Recorded", description: "Your payment has been submitted for verification." });
                onSuccess();
            } else {
                const data = await res.json();
                throw new Error(data.message || "Failed to submit payment");
            }
        } catch (err: any) {
            toast({ title: "Submission Error", description: err.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Amount Received *</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-500">₹</span>
                        <Input
                            type="number"
                            className="pl-7 text-lg font-bold"
                            value={amountReceived || ''}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            placeholder="0.00"
                            max={invoices.find(inv => inv.id === initialInvoiceId)?.balanceDue}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Payment Date *</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn("w-full justify-start text-left font-normal", !paymentDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {paymentDate ? format(paymentDate, "PPP") : "Pick a date"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={paymentDate}
                                onSelect={(date) => date && setPaymentDate(date)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PAYMENT_MODES.map(mode => (
                                <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Reference Number</Label>
                    <Input
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        placeholder="e.g. Transaction ID, Check #"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional details about this payment..."
                    rows={2}
                />
            </div>

            <div className="space-y-2">
                <Label>Upload Proof (Receipt/Screenshot)</Label>
                <div className="flex flex-col gap-2">
                    <Input
                        type="file"
                        onChange={handleFileUpload}
                        className="cursor-pointer"
                    />
                    <div className="flex flex-wrap gap-2">
                        {attachments.map((file, i) => (
                            <Badge key={i} variant="secondary" className="gap-1 pr-1">
                                {file.name}
                                <X
                                    className="h-3 w-3 cursor-pointer hover:text-red-500"
                                    onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                />
                            </Badge>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? "Processing..." : "Submit Payment"}
                </Button>
            </div>
        </div>
    );
}
