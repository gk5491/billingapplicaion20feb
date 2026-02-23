
import { useState, useEffect, useMemo, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";
import { useOrganization } from "@/context/OrganizationContext";
import { useBranding } from "@/hooks/use-branding";
import { cn } from "@/lib/utils";
import {
    Plus,
    Search,
    MoreHorizontal,
    Pencil,
    Trash2,
    ChevronDown,
    Mail,
    Phone,
    MapPin,
    Building2,
    FileText,
    Filter,
    ArrowUpDown,
    ChevronUp,
    X,
    Send,
    Printer,
    Download,
    MessageSquare,
    History,
    Receipt,
    BadgeIndianRupee,
    Settings,
    Clock,
    User,
    CreditCard,
    Briefcase,
    Notebook,
    Tag,
    ChevronRight,
    RefreshCw,
    Loader2,
    Bold,
    Italic,
    Underline,
    Link2,
    Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuPortal,
    DropdownMenuSubContent,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TablePagination } from "@/components/table-pagination";
import { usePagination } from "@/hooks/use-pagination";
// removed import { formatCurrency } from "@/lib/utils";
import { robustIframePrint } from "@/lib/robust-print";
import { generatePDFFromElement } from "@/lib/pdf-utils";
import {
    startOfMonth,
    endOfMonth,
    subMonths,
    startOfQuarter,
    endOfQuarter,
    startOfYear,
    endOfYear,
    isWithinInterval,
    isBefore,
    parseISO
} from "date-fns";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

interface ContactPerson {
    salutation?: string;
    firstName: string;
    lastName: string;
    email?: string;
    workPhone?: string;
    mobile?: string;
    isPrimary?: boolean;
}

interface Vendor {
    id: string;
    name: string;
    mobile?: string;
    workPhone?: string;
    phone?: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    email?: string;
    gstin?: string;
    gstTreatment?: string;
    currency?: string;
    openingBalance?: number;
    totalBilled?: number;
    paymentTerms?: string;
    sourceOfSupply?: string;
    billingAddress?: {
        attention?: string;
        street1?: string;
        street2?: string;
        city?: string;
        state?: string;
        pinCode?: string;
        country?: string;
        phone?: string;
        faxNumber?: string;
    };
    shippingAddress?: {
        attention?: string;
        street1?: string;
        street2?: string;
        city?: string;
        state?: string;
        pinCode?: string;
        country?: string;
        phone?: string;
        faxNumber?: string;
    };
    bankDetails?: {
        accountHolderName?: string;
        bankName?: string;
        accountNumber?: string;
        ifscCode?: string;
        swiftCode?: string;
        branchName?: string;
    };
    salutation?: string;
    pan?: string;
    expenseAccount?: string;
    msmeRegistered?: boolean;
    msmeRegistrationType?: string;
    msmeRegistrationNumber?: string;
    remarks?: string;
    contactPersons?: ContactPerson[];
    payables?: number;
    unusedCredits?: number;
    status?: string;
    isCrm?: boolean;
    isPortalEnabled?: boolean;
    createdAt?: string;
}

interface Comment {
    id: string;
    text: string;
    author: string;
    createdAt: string;
}

interface Transaction {
    id: string;
    type: string;
    date: string;
    number: string;
    orderNumber?: string;
    amount: number;
    balance: number;
    status: string;
    vendor?: string;
    paidThrough?: string;
    mode?: string;
    paidAmount?: number;
}

interface SystemMail {
    id: string;
    to: string;
    subject: string;
    date: string;
    status: string;
    type: string;
}

interface ActivityItem {
    id: string;
    type: string;
    title: string;
    description: string;
    user: string;
    date: string;
    time: string;
}

const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(amount);
};

const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
        date: date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    };
};

const formatVendorAddress = (address: any) => {
    if (!address) return ['-'];
    const parts = [address.street1, address.street2, address.city, address.state, address.pinCode, address.country].filter(Boolean);
    return parts.length > 0 ? parts : ['-'];
};

const getStatementDateRange = (period: string) => {
    const now = new Date();
    let start = startOfMonth(now);
    let end = endOfMonth(now);
    switch (period) {
        case "last-month": {
            const lastMonth = subMonths(now, 1);
            start = startOfMonth(lastMonth);
            end = endOfMonth(lastMonth);
            break;
        }
        case "this-quarter":
            start = startOfQuarter(now);
            end = endOfQuarter(now);
            break;
        case "this-year":
            start = startOfYear(now);
            end = endOfYear(now);
            break;
        case "this-month":
        default:
            start = startOfMonth(now);
            end = endOfMonth(now);
            break;
    }
    return { start, end };
};

const RenderComment = ({ text }: { text: string }) => {
    let parts: (string | React.ReactElement)[] = [text];
    const boldRegex = /\*\*(.*?)\*\*|__(.*?)__/g;
    parts = parts.flatMap((part) => {
        if (typeof part !== 'string') return [part];
        const subParts: (string | React.ReactElement)[] = [];
        let lastIndex = 0;
        let match;
        while ((match = boldRegex.exec(part)) !== null) {
            if (match.index > lastIndex) subParts.push(part.substring(lastIndex, match.index));
            subParts.push(<strong key={`bold-${match.index}`}>{match[1] || match[2]}</strong>);
            lastIndex = boldRegex.lastIndex;
        }
        if (lastIndex < part.length) subParts.push(part.substring(lastIndex));
        return subParts;
    });
    const italicRegex = /\*(.*?)\*|_(.*?)_/g;
    parts = parts.flatMap((part) => {
        if (typeof part !== 'string') return [part];
        const subParts: (string | React.ReactElement)[] = [];
        let lastIndex = 0;
        let match;
        while ((match = italicRegex.exec(part)) !== null) {
            if (match.index > lastIndex) subParts.push(part.substring(lastIndex, match.index));
            subParts.push(<em key={`italic-${match.index}`}>{match[1] || match[2]}</em>);
            lastIndex = italicRegex.lastIndex;
        }
        if (lastIndex < part.length) subParts.push(part.substring(lastIndex));
        return subParts;
    });
    return <>{parts}</>;
};

interface VendorDetailPanelProps {
    vendor: Vendor;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

function VendorDetailPanel({ vendor, onClose, onEdit, onDelete }: VendorDetailPanelProps) {
    const { currentOrganization } = useOrganization();
    const { data: branding } = useBranding();
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("overview");
    const [isDownloading, setIsDownloading] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isAddingComment, setIsAddingComment] = useState(false);
    const commentRef = useRef<HTMLTextAreaElement>(null);
    const [transactions, setTransactions] = useState<Record<string, Transaction[]>>({
        bills: [],
        billPayments: [],
        expenses: [],
        purchaseOrders: [],
        vendorCredits: [],
        journals: []
    });
    const [mails, setMails] = useState<SystemMail[]>([]);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [fullVendor, setFullVendor] = useState<Vendor>(vendor);

    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        bills: true,
        billPayments: true,
        expenses: false,
        purchaseOrders: false,
        vendorCredits: false
    });

    const [sectionFilters, setSectionFilters] = useState<Record<string, string>>({
        bills: 'All',
        billPayments: 'All',
        expenses: 'All',
        purchaseOrders: 'All',
        vendorCredits: 'All'
    });

    const [statementPeriod, setStatementPeriod] = useState("this-month");
    const [statementFilter, setStatementFilter] = useState("all");

    const [expensePeriod, setExpensePeriod] = useState("last-6-months");
    const [expenseMethod, setExpenseMethod] = useState("accrual");

    useEffect(() => {
        if (vendor.id) {
            setFullVendor(vendor);
            fetchVendorData();
        }
    }, [vendor.id]);

    const fetchVendorData = async () => {
        setLoading(true);
        try {
            const [vendorRes, commentsRes, transactionsRes, mailsRes, activitiesRes] = await Promise.all([
                fetch(`/api/vendors/${vendor.id}`),
                fetch(`/api/vendors/${vendor.id}/comments`),
                fetch(`/api/vendors/${vendor.id}/transactions`),
                fetch(`/api/vendors/${vendor.id}/mails`),
                fetch(`/api/vendors/${vendor.id}/activities`)
            ]);

            if (vendorRes.ok) {
                const data = await vendorRes.json();
                if (data.success) {
                    setFullVendor(data.data);
                }
            }

            if (commentsRes.ok) {
                const data = await commentsRes.json();
                setComments(data.data || []);
            }
            if (transactionsRes.ok) {
                const data = await transactionsRes.json();
                setTransactions(data.data || {
                    bills: [],
                    billPayments: [],
                    expenses: [],
                    purchaseOrders: [],
                    vendorCredits: [],
                    journals: []
                });
            }
            if (mailsRes.ok) {
                const data = await mailsRes.json();
                setMails(data.data || []);
            }
            if (activitiesRes.ok) {
                const data = await activitiesRes.json();
                setActivities(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching vendor data:', error);
            toast({ title: "Failed to fetch vendor data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || isAddingComment) return;
        setIsAddingComment(true);
        try {
            const response = await fetch(`/api/vendors/${vendor.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: newComment })
            });
            if (response.ok) {
                const data = await response.json();
                setComments([data.data, ...comments]);
                setNewComment("");
                toast({ title: "Comment added successfully" });
            }
        } catch (error) {
            toast({ title: "Failed to add comment", variant: "destructive" });
        } finally {
            setIsAddingComment(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            const response = await fetch(`/api/vendors/${vendor.id}/comments/${commentId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setComments(comments.filter(c => c.id !== commentId));
                toast({ title: "Comment deleted successfully" });
            }
        } catch (error) {
            toast({ title: "Failed to delete comment", variant: "destructive" });
        }
    };

    const applyFormatting = (format: 'bold' | 'italic' | 'underline') => {
        const textarea = commentRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);
        let formattedText = "";
        switch (format) {
            case 'bold': formattedText = `**${selectedText}**`; break;
            case 'italic': formattedText = `*${selectedText}*`; break;
            case 'underline': formattedText = `__${selectedText}__`; break;
        }
        const newValue = text.substring(0, start) + formattedText + text.substring(end);
        setNewComment(newValue);
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + formattedText.length;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const handlePrint = async () => {
        toast({ title: "Preparing print...", description: "Please wait while we generate the statement preview." });
        try {
            await robustIframePrint('vendor-statement', `Statement_${vendor.name}_${statementPeriod}`);
        } catch (error) {
            console.error('Print failed:', error);
            toast({ title: "Print failed", variant: "destructive" });
        }
    };

    const handleDownloadPDF = async () => {
        toast({ title: "Preparing download...", description: "Please wait while we generate your PDF." });
        const element = document.getElementById('vendor-statement');
        if (!element) return;
        setIsDownloading(true);
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.zIndex = '-9999';
        container.style.width = '210mm';
        container.style.backgroundColor = '#ffffff';
        container.style.padding = '0';
        container.style.margin = '0';
        document.body.appendChild(container);
        const clone = element.cloneNode(true) as HTMLElement;
        clone.style.position = 'static';
        clone.style.width = '100%';
        clone.style.height = 'auto';
        clone.style.margin = '0';
        clone.style.transform = 'none';
        clone.style.overflow = 'visible';
        clone.style.minHeight = '0';
        const tables = clone.querySelectorAll('table');
        tables.forEach((table: any) => { table.style.width = '100%'; table.style.tableLayout = 'fixed'; table.style.borderCollapse = 'collapse'; });
        const cells = clone.querySelectorAll('td, th');
        cells.forEach((cell: any) => { cell.style.overflow = 'visible'; cell.style.whiteSpace = 'nowrap'; });
        container.appendChild(clone);
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
            const dataUrl = await toPng(clone, {
                backgroundColor: '#ffffff', quality: 0.5, pixelRatio: 1,
                width: container.offsetWidth, height: container.offsetHeight,
                cacheBust: true, skipFonts: true,
                style: { overflow: 'visible', width: container.offsetWidth + 'px', height: container.offsetHeight + 'px' }
            });
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const imgWidth = 190;
            const pageHeight = 277;
            const elementHeight = container.offsetHeight;
            const elementWidth = container.offsetWidth;
            const imgHeight = (elementHeight * imgWidth) / elementWidth;
            let heightLeft = imgHeight;
            pdf.addImage(dataUrl, 'PNG', 10, 10, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            while (heightLeft > 2) {
                const position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(dataUrl, 'PNG', 10, position + 10, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            pdf.save(`Statement_${vendor.name}_${new Date().toISOString().split('T')[0]}.pdf`);
            toast({ title: "Statement downloaded successfully" });
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast({ title: "Failed to download PDF", variant: "destructive" });
        } finally {
            document.body.removeChild(container);
            setIsDownloading(false);
        }
    };

    const handleDownloadExcel = () => {
        try {
            toast({ title: "Preparing Excel download...", description: "Generating your statement spreadsheet." });
            const reportData = statementTransactions.map(tx => ({
                Date: formatDate(tx.date),
                Type: tx.type,
                Number: tx.number || '-',
                Amount: tx.type === 'Bill' ? tx.amount : 0,
                Payments: tx.type === 'Payment' ? tx.amount : 0,
                Balance: (tx as any).runningBalance || 0
            }));
            const ws = XLSX.utils.json_to_sheet(reportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Statement");
            const max_width = reportData.reduce((w, r) => Math.max(w, r.Number.length), 10);
            ws['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: max_width }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
            XLSX.writeFile(wb, `Statement_${vendor.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast({ title: "Excel downloaded successfully" });
        } catch (error) {
            console.error('Excel export failed:', error);
            toast({ title: "Failed to download Excel", variant: "destructive" });
        }
    };

    const toggleSection = (section: string) => {
        setExpandedSections((prev: Record<string, boolean>) => ({ ...prev, [section]: !prev[section] }));
    };

    const handleFilterChange = (sectionKey: string, status: string) => {
        setSectionFilters(prev => ({ ...prev, [sectionKey]: status }));
    };

    const getFilteredTransactions = (sectionKey: string) => {
        const sectionTransactions = transactions[sectionKey] || [];
        const filter = sectionFilters[sectionKey];
        if (filter === 'All') return sectionTransactions;
        return sectionTransactions.filter(tx =>
            tx.status?.toUpperCase() === filter.toUpperCase() ||
            tx.status?.toUpperCase().replace('_', ' ') === filter.toUpperCase()
        );
    };

    const handleNewTransaction = (type: string) => {
        const routes: Record<string, string> = {
            bill: `/bills/new?vendorId=${fullVendor.id}`,
            expense: `/expenses?vendorId=${fullVendor.id}`,
            'purchase-order': `/purchase-orders/new?vendorId=${fullVendor.id}`,
            payment: `/payments-made/new?vendorId=${fullVendor.id}`,
            'vendor-credit': `/vendor-credits/new?vendorId=${fullVendor.id}`,
        };
        setLocation(routes[type] || `/bills/new?vendorId=${fullVendor.id}`);
    };

    const transactionSections = [
        { key: 'bills', label: 'Bills', columns: ['DATE', 'BILL N...', 'ORDER NU...', 'AMOUNT', 'BALANCE D...', 'STATUS'], statusOptions: ['All', 'Draft', 'Open', 'Paid', 'Partially Paid', 'Overdue', 'Void'] },
        { key: 'billPayments', label: 'Payments Made', columns: ['DATE', 'PAYMEN...', 'REFERE...', 'AMOUNT', 'STATUS'], statusOptions: ['All', 'Draft', 'Sent', 'Paid'] },
        { key: 'expenses', label: 'Expenses', columns: ['DATE', 'EXPENSE N...', 'CATEGORY', 'AMOUNT', 'STATUS'], statusOptions: ['All', 'Draft', 'Pending', 'Approved', 'Rejected'] },
        { key: 'purchaseOrders', label: 'Purchase Orders', columns: ['DATE', 'PO N...', 'REFERENCE', 'AMOUNT', 'STATUS'], statusOptions: ['All', 'Draft', 'Open', 'Closed', 'Cancelled'] },
        { key: 'vendorCredits', label: 'Vendor Credits', columns: ['DATE', 'CREDIT N...', 'AMOUNT', 'BALANCE', 'STATUS'], statusOptions: ['All', 'Draft', 'Open', 'Closed'] }
    ];

    const [statementTransactions, setStatementTransactions] = useState<Transaction[]>([]);
    const [openingBalance, setOpeningBalance] = useState(0);

    useEffect(() => {
        if (activeTab === "statement") {
            fetchStatementTransactions();
        }
    }, [activeTab, vendor.id, statementPeriod]);

    const fetchStatementTransactions = async () => {
        try {
            const response = await fetch(`/api/vendors/${vendor.id}/transactions`);
            if (response.ok) {
                const data = await response.json();
                const { start, end } = getStatementDateRange(statementPeriod);
                const allBills = (data.data?.bills || []).map((b: any) => ({ ...b, type: 'Bill' }));
                const allPayments = (data.data?.billPayments || []).map((p: any) => ({ ...p, type: 'Payment' }));
                const prevBills = allBills.filter((b: any) => isBefore(parseISO(b.date), start));
                const prevPayments = allPayments.filter((p: any) => isBefore(parseISO(p.date), start));
                const openingBal = prevBills.reduce((sum: number, b: any) => sum + b.amount, 0) -
                    prevPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
                setOpeningBalance(openingBal);
                const periodTx = [
                    ...allBills.filter((b: any) => isWithinInterval(parseISO(b.date), { start, end })),
                    ...allPayments.filter((p: any) => isWithinInterval(parseISO(p.date), { start, end }))
                ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                let currentBal = openingBal;
                const txWithBalance = periodTx.map(tx => {
                    if (tx.type === 'Bill') { currentBal += tx.amount; } else { currentBal -= tx.amount; }
                    return { ...tx, runningBalance: currentBal };
                });
                setStatementTransactions(txWithBalance.reverse());
            }
        } catch (error) {
            console.error('Error fetching statement transactions:', error);
        }
    };

    const getExpenseData = () => {
        const now = new Date();
        let monthsToInclude = 6;
        let startDate = subMonths(startOfMonth(now), 5);
        if (expensePeriod === "last-12-months") {
            monthsToInclude = 12;
            startDate = subMonths(startOfMonth(now), 11);
        } else if (expensePeriod === "this-year") {
            startDate = startOfYear(now);
            const currentMonth = now.getMonth();
            monthsToInclude = currentMonth + 1;
        }
        const months: { label: string; date: Date; expense: number }[] = [];
        for (let i = 0; i < monthsToInclude; i++) {
            const d = startOfMonth(subMonths(now, monthsToInclude - 1 - i));
            months.push({ label: d.toLocaleDateString('en-IN', { month: 'short' }), date: d, expense: 0 });
        }
        const txList = expenseMethod === 'accrual'
            ? (transactions.bills || []).filter(b => b.status !== 'Void')
            : (transactions.billPayments || []).filter(p => p.status !== 'Void');
        txList.forEach(tx => {
            const txDate = parseISO(tx.date);
            const mStart = startOfMonth(txDate);
            const monthIdx = months.findIndex(m => m.date.getTime() === mStart.getTime());
            if (monthIdx !== -1) months[monthIdx].expense += tx.amount || 0;
        });
        const totalExpense = months.reduce((sum, m) => sum + m.expense, 0);
        return { months, totalExpense };
    };

    const expenseData = getExpenseData();

    const billedAmount = statementTransactions.filter(tx => tx.type === 'Bill').reduce((sum, tx) => sum + tx.amount, 0);
    const amountPaid = statementTransactions.filter(tx => tx.type === 'Payment').reduce((sum, tx) => sum + tx.amount, 0);
    const balanceDue = openingBalance + billedAmount - amountPaid;

    const primaryContact = fullVendor.contactPersons?.find(cp => cp.isPrimary) || fullVendor.contactPersons?.[0];

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-sidebar-accent/5">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 hover:bg-sidebar/10 transition-colors">
                        <ChevronDown className="h-4 w-4 rotate-90 text-sidebar/70" />
                    </Button>
                    <h2 className="text-xl font-semibold text-sidebar font-display truncate" data-testid="text-vendor-name">
                        {fullVendor.displayName || fullVendor.name}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onEdit} data-testid="button-edit-vendor">
                        Edit
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="bg-sidebar hover:bg-sidebar/90 text-white gap-1.5 h-9 font-display shadow-sm" size="sm" data-testid="button-new-transaction">
                                New Transaction
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel className="text-xs text-slate-500">PURCHASES</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleNewTransaction("bill")} data-testid="menu-item-bill">
                                <Receipt className="mr-2 h-4 w-4" /> Bill
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleNewTransaction("payment")} data-testid="menu-item-payment">
                                <CreditCard className="mr-2 h-4 w-4" /> Payment Made
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleNewTransaction("purchase-order")} data-testid="menu-item-purchase-order">
                                <Briefcase className="mr-2 h-4 w-4" /> Purchase Order
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleNewTransaction("expense")} data-testid="menu-item-expense">
                                <BadgeIndianRupee className="mr-2 h-4 w-4" /> Expense
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleNewTransaction("vendor-credit")} data-testid="menu-item-vendor-credit">
                                <Notebook className="mr-2 h-4 w-4" /> Vendor Credit
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-more-options">
                                More
                                <ChevronDown className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive" data-testid="menu-item-delete">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} data-testid="button-close-panel">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex items-center px-6 border-b border-slate-200 bg-white flex-shrink-0">
                    <TabsList className="h-auto p-0 bg-transparent gap-8">
                        <TabsTrigger
                            value="overview"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-sidebar data-[state=active]:text-sidebar data-[state=active]:bg-transparent data-[state=active]:shadow-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-3 bg-transparent hover:bg-transparent transition-none font-medium font-display"
                            data-testid="tab-overview"
                        >
                            Overview
                        </TabsTrigger>
                        <TabsTrigger
                            value="comments"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-sidebar data-[state=active]:text-sidebar data-[state=active]:bg-transparent data-[state=active]:shadow-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-3 bg-transparent hover:bg-transparent transition-none font-medium font-display"
                            data-testid="tab-comments"
                        >
                            Comments
                        </TabsTrigger>
                        <TabsTrigger
                            value="transactions"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-sidebar data-[state=active]:text-sidebar data-[state=active]:bg-transparent data-[state=active]:shadow-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-3 bg-transparent hover:bg-transparent transition-none font-medium font-display"
                            data-testid="tab-transactions"
                        >
                            Transactions
                        </TabsTrigger>
                        <TabsTrigger
                            value="mails"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-sidebar data-[state=active]:text-sidebar data-[state=active]:bg-transparent data-[state=active]:shadow-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-3 bg-transparent hover:bg-transparent transition-none font-medium font-display"
                            data-testid="tab-mails"
                        >
                            Mails
                        </TabsTrigger>
                        <TabsTrigger
                            value="statement"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-sidebar data-[state=active]:text-sidebar data-[state=active]:bg-transparent data-[state=active]:shadow-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-3 bg-transparent hover:bg-transparent transition-none font-medium font-display"
                            data-testid="tab-statement"
                        >
                            Statement
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="flex-1 overflow-y-auto scrollbar-hide p-0 mt-0">
                    <div className="flex h-full">
                        <div className="w-72 border-r border-slate-200 dark:border-slate-700 p-6 overflow-auto scrollbar-hide">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white" data-testid="text-vendor-display-name">{fullVendor.displayName || fullVendor.name}</h3>
                                    {primaryContact && (
                                        <div className="flex items-center gap-2 mt-3">
                                            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                                <User className="h-5 w-5 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 font-display" data-testid="text-contact-person">{primaryContact.salutation ? `${primaryContact.salutation} ` : ''}{primaryContact.firstName} {primaryContact.lastName}</p>
                                                <p className="text-xs text-sidebar font-medium font-display" data-testid="text-vendor-email">{primaryContact.email || fullVendor.email}</p>
                                            </div>
                                        </div>
                                    )}
                                    {!primaryContact && fullVendor.email && (
                                        <p className="text-sm text-sidebar font-medium mt-2 font-display" data-testid="text-vendor-email-only">{fullVendor.email}</p>
                                    )}
                                </div>

                                <Collapsible defaultOpen>
                                    <CollapsibleTrigger className="flex items-center justify-between w-full text-[11px] font-bold text-sidebar/60 uppercase tracking-widest font-display">
                                        ADDRESS
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="mt-3 space-y-4">
                                        <div className="mt-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-display">Billing Address</p>
                                            </div>
                                            <div className="text-sm mt-1">
                                                {formatVendorAddress(fullVendor.billingAddress).map((line, i) => (
                                                    <p key={i}>{line}</p>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-display">Shipping Address</p>
                                            </div>
                                            <div className="text-sm mt-1">
                                                {formatVendorAddress(fullVendor.shippingAddress).map((line, i) => (
                                                    <p key={i}>{line}</p>
                                                ))}
                                            </div>
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>

                                <Collapsible defaultOpen>
                                    <CollapsibleTrigger className="flex items-center justify-between w-full text-[11px] font-bold text-sidebar/60 uppercase tracking-widest font-display">
                                        OTHER DETAILS
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="mt-4 space-y-4 text-sm">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-display">Vendor Type</p>
                                            <p className="font-semibold text-slate-700 font-display">Business</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-display">Default Currency</p>
                                            <p className="font-semibold text-slate-700 font-display">{fullVendor.currency || 'INR'}</p>
                                        </div>
                                        {fullVendor.gstTreatment && (
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-display">GST Treatment</p>
                                                <p className="font-semibold text-slate-700 font-display">{fullVendor.gstTreatment}</p>
                                            </div>
                                        )}
                                        {fullVendor.gstin && (
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-display">GSTIN</p>
                                                <p className="font-semibold text-slate-700 font-display">{fullVendor.gstin}</p>
                                            </div>
                                        )}
                                        {fullVendor.pan && (
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-display">PAN</p>
                                                <p className="font-semibold text-slate-700 font-display font-mono">{fullVendor.pan}</p>
                                            </div>
                                        )}
                                        {fullVendor.sourceOfSupply && (
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-display">Source of Supply</p>
                                                <p className="font-semibold text-slate-700 font-display">{fullVendor.sourceOfSupply}</p>
                                            </div>
                                        )}
                                    </CollapsibleContent>
                                </Collapsible>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto scrollbar-hide">
                            <div className="w-full">
                                <div className="bg-sidebar/5 border border-sidebar/20 rounded-lg p-4 mb-6 mx-6 mt-6">
                                    <p className="text-sm text-sidebar font-display">
                                        You can request your contact to directly update the GSTIN by sending an email.{' '}
                                        <button className="text-sidebar font-bold hover:underline ml-1">Send email</button>
                                    </p>
                                </div>

                                <div className="mb-6 mx-6">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-display">Payment due period</p>
                                    <p className="text-sm font-semibold text-slate-700 font-display">{fullVendor.paymentTerms || 'Due on Receipt'}</p>
                                </div>

                                <div className="mb-6 mx-6">
                                    <h4 className="text-lg font-semibold mb-4 text-sidebar font-display">Payables</h4>
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-sidebar-accent/5">
                                                <tr className="text-left text-sidebar/60 border-b border-slate-200">
                                                    <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider font-display">CURRENCY</th>
                                                    <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider font-display">OUTSTANDING PAYABLES</th>
                                                    <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider font-display">UNUSED CREDITS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="group hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-slate-700 font-display">INR- Indian Rupee</td>
                                                    <td className="px-4 py-3 text-right font-semibold text-sidebar font-display">{formatCurrency(fullVendor.payables || 0)}</td>
                                                    <td className="px-4 py-3 text-right font-semibold text-green-600 font-display">{formatCurrency(fullVendor.unusedCredits || 0)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <button className="text-sm text-sidebar font-semibold mt-3 hover:text-sidebar/80 transition-colors font-display">Enter Opening Balance</button>
                                </div>

                                <div className="mb-6 mx-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-lg font-semibold text-sidebar font-display">Expenses</h4>
                                        <div className="flex items-center gap-2">
                                            <Select value={expensePeriod} onValueChange={setExpensePeriod}>
                                                <SelectTrigger className="w-36 h-8 text-sm border-slate-200 hover:border-sidebar/30 transition-colors">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                                                    <SelectItem value="last-12-months">Last 12 Months</SelectItem>
                                                    <SelectItem value="this-year">This Year</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Select value={expenseMethod} onValueChange={setExpenseMethod}>
                                                <SelectTrigger className="w-28 h-8 text-sm border-slate-200 hover:border-sidebar/30 transition-colors">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="accrual">Accrual</SelectItem>
                                                    <SelectItem value="cash">Cash</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-4 font-display">This chart is displayed in the organization's base currency.</p>
                                    <div className="h-40 bg-slate-50 rounded-lg flex items-end justify-around px-4 pb-2 border border-slate-100 mb-2">
                                        {expenseData.months.map((m, i) => {
                                            const maxExpense = Math.max(...expenseData.months.map(m => m.expense), 1);
                                            const height = (m.expense / maxExpense) * 100;
                                            return (
                                                <div key={i} className="flex flex-col items-center flex-1 group relative">
                                                    <div
                                                        className="w-8 bg-sidebar/20 rounded-t-sm group-hover:bg-sidebar/40 transition-all duration-300 relative"
                                                        style={{ height: `${Math.max(2, height * 0.8)}%` }}
                                                    >
                                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-lg font-mono">
                                                            {formatCurrency(m.expense)}
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase font-display">{m.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="text-sm mt-4 font-medium text-slate-700 font-display">
                                        Total Expenses ({expensePeriod === 'last-6-months' ? 'Last 6 Months' : expensePeriod === 'last-12-months' ? 'Last 12 Months' : 'This Year'}) - <span className="text-sidebar font-bold">{formatCurrency(expenseData.totalExpense)}</span>
                                    </p>
                                </div>

                                <div className="mx-6 pb-6">
                                    <h4 className="text-lg font-semibold mb-4">Activity Timeline</h4>
                                    <div className="space-y-4">
                                        {activities.length === 0 ? (
                                            <div className="text-center py-8 text-slate-500">
                                                <Clock className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                                <p className="text-sm">No activities yet</p>
                                            </div>
                                        ) : (
                                            activities.map((activity) => {
                                                const { date, time } = formatDateTime(activity.date);
                                                return (
                                                    <div key={activity.id} className="flex gap-4">
                                                        <div className="text-right text-[11px] font-bold text-slate-400 w-24 flex-shrink-0 uppercase font-display">
                                                            <p>{date}</p>
                                                            <p className="text-slate-300">{time}</p>
                                                        </div>
                                                        <div className="relative">
                                                            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-slate-200"></div>
                                                            <div className="relative z-10 h-3 w-3 bg-white border-2 border-sidebar rounded-full mt-1"></div>
                                                        </div>
                                                        <div className="flex-1 bg-slate-50/50 border border-slate-100 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                                                            <h5 className="font-bold text-sm text-slate-800 font-display">{activity.title}</h5>
                                                            <p className="text-sm text-slate-600 mt-1 font-display leading-relaxed">{activity.description}</p>
                                                            <p className="text-xs text-slate-500 mt-2 font-display">
                                                                by <span className="text-sidebar font-semibold">{activity.user}</span>
                                                                {activity.type === 'bill' && (
                                                                    <button className="text-sidebar font-semibold ml-2 hover:underline">- View Details</button>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="comments" className="flex-1 overflow-y-auto scrollbar-hide p-6 mt-0">
                    <div className="w-full p-6 max-w-4xl mx-auto">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden mb-8 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                            <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    onClick={() => applyFormatting('bold')}
                                    title="Bold (**text**)"
                                >
                                    <Bold className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    onClick={() => applyFormatting('italic')}
                                    title="Italic (*text*)"
                                >
                                    <Italic className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-slate-200 dark:hover:bg-slate-700"
                                    onClick={() => applyFormatting('underline')}
                                    title="Underline (__text__)"
                                >
                                    <Underline className="h-4 w-4" />
                                </Button>
                            </div>
                            <Textarea
                                ref={commentRef}
                                placeholder="Write a comment... (Markdown supported)"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="border-0 focus-visible:ring-0 min-h-32 resize-none p-4 text-sm bg-transparent"
                                data-testid="input-comment"
                            />
                            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                                <Button
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim() || isAddingComment}
                                    size="sm"
                                    className="bg-sidebar hover:bg-sidebar/90 text-white font-bold font-display px-6 shadow-sm"
                                    data-testid="button-add-comment"
                                >
                                    {isAddingComment ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Adding...
                                        </>
                                    ) : "Add Comment"}
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-px flex-1 bg-slate-100" />
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-display">All Comments</h4>
                            <div className="h-px flex-1 bg-slate-100" />
                        </div>

                        {comments.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">No comments yet.</p>
                                <p className="text-xs text-slate-400 mt-1">Be the first to share your thoughts!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {comments.map((comment) => (
                                    <div key={comment.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-sidebar/10 flex items-center justify-center text-sidebar font-bold text-xs uppercase font-display">
                                                    {comment.author.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{comment.author}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDateTime(comment.createdAt).date} at {formatDateTime(comment.createdAt).time}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                onClick={() => handleDeleteComment(comment.id)}
                                                title="Delete comment"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap pl-11">
                                            <RenderComment text={comment.text} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="transactions" className="flex-1 overflow-y-auto scrollbar-hide p-6 mt-0" data-vendor-transactions-scroll-container>
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-1.5 font-bold font-display border-slate-200 hover:border-sidebar/30 text-sidebar" data-testid="button-goto-transactions">
                                        Go to transactions
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48">
                                    {transactionSections.map((section) => (
                                        <DropdownMenuItem
                                            key={section.key}
                                            onClick={() => {
                                                setExpandedSections((prev: Record<string, boolean>) => ({ ...prev, [section.key]: true }));
                                                setTimeout(() => {
                                                    const element = document.getElementById(`section-${section.key}`);
                                                    const scrollContainer = document.querySelector('[data-vendor-transactions-scroll-container]');
                                                    if (element && scrollContainer) {
                                                        const containerPadding = 24;
                                                        const elementTop = element.offsetTop;
                                                        scrollContainer.scrollTo({
                                                            top: elementTop - containerPadding - 60,
                                                            behavior: 'smooth'
                                                        });
                                                    } else if (element) {
                                                        element.scrollIntoView({
                                                            behavior: 'smooth',
                                                            block: 'start'
                                                        });
                                                    }
                                                }, 300);
                                            }}
                                        >
                                            {section.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="space-y-4">
                            {transactionSections.map((section) => (
                                <Collapsible
                                    key={section.key}
                                    open={expandedSections[section.key]}
                                    onOpenChange={() => toggleSection(section.key)}
                                >
                                    <div id={`section-${section.key}`} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                        <div className="flex items-center justify-between w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                                                {expandedSections[section.key] ? (
                                                    <ChevronDown className="h-4 w-4 text-sidebar" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-slate-400" />
                                                )}
                                                <span className="font-bold font-display text-slate-800">{section.label}</span>
                                            </CollapsibleTrigger>
                                            <div className="flex items-center gap-4">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <div
                                                            className="flex items-center gap-2 text-xs font-bold text-slate-400 cursor-pointer hover:text-sidebar transition-colors font-display uppercase tracking-wider"
                                                        >
                                                            <Filter className="h-3.5 w-3.5" />
                                                            Status: <span className="text-sidebar">{sectionFilters[section.key]}</span>
                                                            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                                                        </div>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        {section.statusOptions?.map((status) => (
                                                            <DropdownMenuItem
                                                                key={status}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleFilterChange(section.key, status);
                                                                }}
                                                                className={sectionFilters[section.key] === status ? 'bg-blue-50 text-blue-600' : ''}
                                                            >
                                                                {status}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-sidebar font-bold font-display gap-1 hover:bg-sidebar/10"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleNewTransaction(section.key === 'billPayments' ? 'payment' : section.key === 'purchaseOrders' ? 'purchase-order' : section.key === 'vendorCredits' ? 'vendor-credit' : section.key.slice(0, -1));
                                                    }}
                                                    data-testid={`button-new-${section.key}`}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    New
                                                </Button>
                                            </div>
                                        </div>
                                        <CollapsibleContent>
                                            <div className="border-t border-slate-200">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-sidebar-accent/5">
                                                        <tr className="border-b border-slate-200">
                                                            {section.columns.map((col, i) => (
                                                                <th key={i} className="px-4 py-2.5 text-left text-[11px] font-bold text-sidebar/70 uppercase tracking-wider font-display">
                                                                    {col}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(getFilteredTransactions(section.key) || []).length === 0 ? (
                                                            <tr>
                                                                <td colSpan={section.columns.length} className="px-4 py-8 text-center text-slate-500">
                                                                    No {section.label.toLowerCase()} found. <button className="text-blue-600" onClick={() => handleNewTransaction(section.key === 'billPayments' ? 'payment' : section.key === 'purchaseOrders' ? 'purchase-order' : section.key === 'vendorCredits' ? 'vendor-credit' : section.key.slice(0, -1))}>Add New</button>
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            (getFilteredTransactions(section.key) || []).map((tx) => (
                                                                <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                                                                    <td className="px-4 py-3 text-slate-500 font-display">{formatDate(tx.date)}</td>
                                                                    <td className="px-4 py-3 text-sidebar font-semibold hover:text-primary transition-colors cursor-pointer font-display">{tx.number}</td>
                                                                    <td className="px-4 py-3 text-slate-500 font-display">{tx.orderNumber || '-'}</td>
                                                                    <td className="px-4 py-3 font-semibold text-slate-700 font-display">{formatCurrency(tx.amount)}</td>
                                                                    <td className="px-4 py-3 font-semibold text-sidebar font-display">{formatCurrency(tx.balance)}</td>
                                                                    <td className="px-4 py-3">
                                                                        <Badge variant="outline" className={`font-display font-semibold ${tx.status === 'Draft' ? 'text-slate-400 border-slate-200' : 'text-sidebar bg-sidebar/5 border-sidebar/20'}`}>
                                                                            {tx.status}
                                                                        </Badge>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </CollapsibleContent>
                                    </div>
                                </Collapsible>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="mails" className="flex-1 overflow-y-auto scrollbar-hide p-6 mt-0">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="text-lg font-bold font-display text-sidebar">System Mails</h4>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5 font-bold font-display border-slate-200 hover:border-sidebar/30" data-testid="button-link-email">
                                    <Link2 className="h-4 w-4 text-sidebar" />
                                    Link Email account
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>Gmail</DropdownMenuItem>
                                <DropdownMenuItem>Outlook</DropdownMenuItem>
                                <DropdownMenuItem>Other</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {mails.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                <Mail className="h-10 w-10 text-slate-200" />
                            </div>
                            <p className="text-lg font-bold font-display text-slate-800 mb-1">No emails yet</p>
                            <p className="text-sm font-display">System emails sent to this vendor will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {mails.map((mail) => {
                                const { date, time } = formatDateTime(mail.date);
                                return (
                                    <div key={mail.id} className="flex items-start gap-4 p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors group">
                                        <div className="h-10 w-10 rounded-full bg-sidebar/10 flex items-center justify-center flex-shrink-0 border border-sidebar/20">
                                            <span className="text-sidebar font-bold font-display">R</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">To <span className="text-sidebar ml-1">{mail.to}</span></p>
                                            <p className="font-bold text-sm text-slate-800 mt-1 font-display">{mail.subject}</p>
                                        </div>
                                        <div className="text-right text-[11px] font-bold text-slate-400 flex-shrink-0 uppercase font-display">
                                            <p>{date}</p>
                                            <p className="text-slate-300">{time}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="statement" className="flex-1 overflow-y-auto scrollbar-hide p-0 mt-0">
                    <div className="h-full overflow-auto scrollbar-hide p-4 md:p-8 flex flex-col items-center bg-slate-100 dark:bg-slate-800">
                        <div className="w-full max-w-[210mm] mb-6 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <Select value={statementPeriod} onValueChange={setStatementPeriod}>
                                    <SelectTrigger className="h-9 min-w-[140px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" data-testid="select-period">
                                        <Calendar className="h-4 w-4 mr-2 text-slate-500" />
                                        <SelectValue placeholder="Select period" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="this-month">This Month</SelectItem>
                                        <SelectItem value="last-month">Last Month</SelectItem>
                                        <SelectItem value="this-quarter">This Quarter</SelectItem>
                                        <SelectItem value="this-year">This Year</SelectItem>
                                        <SelectItem value="custom">Custom Range</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={statementFilter} onValueChange={setStatementFilter}>
                                    <SelectTrigger className="h-9 min-w-[140px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600" data-testid="select-filter">
                                        <span className="mr-1 text-slate-400">Filter By:</span>
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Transactions</SelectItem>
                                        <SelectItem value="outstanding">Outstanding</SelectItem>
                                        <SelectItem value="paid">Paid</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" className="h-9 w-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 hover:text-slate-900" onClick={handlePrint} title="Print" data-testid="button-print">
                                    <Printer className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" className="h-9 w-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 hover:text-slate-900" onClick={handleDownloadPDF} disabled={isDownloading} title="Download PDF" data-testid="button-download-pdf">
                                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                </Button>
                                <Button variant="outline" size="icon" className="h-9 w-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 hover:text-slate-900" onClick={handleDownloadExcel} title="Download Excel" data-testid="button-download-excel">
                                    <FileText className="h-4 w-4" />
                                </Button>
                                <Button
                                    className="h-9 px-4 text-xs font-bold font-display bg-sidebar hover:bg-sidebar/90 text-white shadow-sm hover:shadow transition-all gap-2"
                                    size="sm"
                                    data-testid="button-send-email"
                                >
                                    <Mail className="h-4 w-4" />
                                    Send Email
                                </Button>
                            </div>
                        </div>

                        <div
                            id="vendor-statement"
                            className="bg-white dark:bg-white text-slate-900 shadow-xl px-8 md:px-10 py-10 w-full max-w-[210mm] min-h-[296mm] h-fit"
                            style={{ color: '#000000' }}
                        >
                            <div className="flex justify-between items-start mb-12">
                                <div className="space-y-4">
                                    {branding?.logo?.url && (
                                        <img src={branding.logo.url} alt="Logo" className="h-16 object-contain" />
                                    )}
                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-bold uppercase">{currentOrganization?.name}</h2>
                                        <p className="text-sm text-slate-600">{currentOrganization?.street1}</p>
                                        {currentOrganization?.street2 && <p className="text-sm text-slate-600">{currentOrganization.street2}</p>}
                                        <p className="text-sm text-slate-600">
                                            {[currentOrganization?.city, currentOrganization?.state, currentOrganization?.postalCode].filter(Boolean).join(', ')}
                                        </p>
                                        {currentOrganization?.gstin && <p className="text-sm font-semibold pt-1">GSTIN: {currentOrganization.gstin}</p>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h1 className="text-4xl font-light text-slate-400 uppercase tracking-widest mb-4">Statement</h1>
                                    <div className="space-y-1 text-sm">
                                        <p><span className="text-slate-400 uppercase">Date:</span> {formatDate(new Date().toISOString())}</p>
                                        <p><span className="text-slate-400 uppercase">Period:</span> {(() => {
                                            const { start, end } = getStatementDateRange(statementPeriod);
                                            return `${formatDate(start.toISOString())} TO ${formatDate(end.toISOString())}`;
                                        })()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-12 mb-12">
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">To</h3>
                                    <div className="space-y-1">
                                        <p className="font-bold text-blue-600 text-lg leading-none mb-1">{fullVendor.displayName || fullVendor.name}</p>
                                        {fullVendor.companyName && <p className="font-bold text-sm text-slate-800">{fullVendor.companyName}</p>}
                                        {formatVendorAddress(fullVendor.billingAddress).map((part, i) => (
                                            <p key={i} className="text-sm text-slate-600">{part}</p>
                                        ))}
                                        {fullVendor.gstin && <p className="text-sm font-semibold pt-1">GSTIN: {fullVendor.gstin}</p>}
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-sm border border-slate-100">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Account Summary</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Opening Balance</span>
                                            <span className="font-medium">{formatCurrency(openingBalance)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Billed Amount</span>
                                            <span className="font-medium">{formatCurrency(billedAmount)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Amount Paid</span>
                                            <span className="font-medium text-green-600">{formatCurrency(amountPaid)}</span>
                                        </div>
                                        <div className="pt-3 border-t border-slate-200 flex justify-between">
                                            <span className="font-bold uppercase text-xs">Balance Due</span>
                                            <span className="font-bold text-lg">{formatCurrency(balanceDue)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden mb-12">
                                <table className="w-full" style={{ tableLayout: 'fixed' }}>
                                    <colgroup>
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '40%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '15%' }} />
                                    </colgroup>
                                    <thead>
                                        <tr className="bg-slate-900 text-white">
                                            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Date</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">Transactions</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Amount</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Payments</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {statementTransactions.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">No transactions in this period</td>
                                            </tr>
                                        ) : (
                                            statementTransactions
                                                .filter(tx => {
                                                    if (statementFilter === 'all') return true;
                                                    if (statementFilter === 'outstanding') return tx.type === 'Bill' && (tx.balance || 0) > 0;
                                                    if (statementFilter === 'paid') return tx.type === 'Payment' || (tx.type === 'Bill' && (tx.balance || 0) === 0);
                                                    return true;
                                                })
                                                .map((tx) => (
                                                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-4 text-xs">{formatDate(tx.date)}</td>
                                                        <td className="px-4 py-4">
                                                            <p className="text-xs font-bold">{tx.type} {tx.number}</p>
                                                        </td>
                                                        <td className="px-4 py-4 text-xs text-right">
                                                            {tx.type === 'Bill' ? formatCurrency(tx.amount) : '\u2014'}
                                                        </td>
                                                        <td className="px-4 py-4 text-xs text-right text-green-600">
                                                            {tx.type === 'Payment' ? formatCurrency(tx.amount) : '\u2014'}
                                                        </td>
                                                        <td className="px-4 py-4 text-xs text-right font-bold">
                                                            {formatCurrency((tx as any).runningBalance || 0)}
                                                        </td>
                                                    </tr>
                                                ))
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-50 border-t-2 border-slate-900">
                                            <td colSpan={4} className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">Closing Balance</td>
                                            <td className="px-4 py-3 text-right text-sm font-black">{formatCurrency(balanceDue)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="mt-auto pt-12 border-t border-slate-100">
                                <div className="flex justify-between items-end">
                                    <div className="text-[10px] text-slate-400 space-y-1 uppercase tracking-widest font-medium">
                                        <p>This is a computer generated statement.</p>
                                        <p>Thank you for your business</p>
                                    </div>
                                    {branding?.signature?.url && (
                                        <div className="text-right space-y-2">
                                            <img src={branding.signature.url} alt="Signature" className="h-12 ml-auto object-contain" />
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-200 pt-2 px-4">Authorized Signature</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}


export default function VendorsPage() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentView, setCurrentView] = useState("all");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [vendorToDelete, setVendorToDelete] = useState<string | null>(null);
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [isCompact, setIsCompact] = useState(false);

    useEffect(() => {
        const checkCompact = () => {
            setIsCompact(window.innerWidth < 1280);
        };

        checkCompact();
        window.addEventListener('resize', checkCompact);
        return () => window.removeEventListener('resize', checkCompact);
    }, []);

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        try {
            const response = await fetch('/api/vendors');
            if (response.ok) {
                const data = await response.json();
                setVendors(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch vendors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVendorClick = (vendor: Vendor) => {
        setSelectedVendor(vendor);
    };

    const handleClosePanel = () => {
        setSelectedVendor(null);
    };

    const handleEditVendor = () => {
        if (selectedVendor) {
            setLocation(`/vendors/${selectedVendor.id}/edit`);
        }
    };

    const handleDeleteClick = () => {
        if (selectedVendor) {
            setVendorToDelete(selectedVendor.id);
            setDeleteDialogOpen(true);
        }
    };

    const confirmDelete = async () => {
        if (!vendorToDelete) return;
        try {
            const response = await fetch(`/api/vendors/${vendorToDelete}`, { method: 'DELETE' });
            if (response.ok) {
                toast({ title: "Vendor deleted successfully" });
                handleClosePanel();
                fetchVendors();
            }
        } catch (error) {
            toast({ title: "Failed to delete vendor", variant: "destructive" });
        } finally {
            setDeleteDialogOpen(false);
            setVendorToDelete(null);
        }
    };

    const [sortBy, setSortBy] = useState<string>("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
    const [columnPreferences, setColumnPreferences] = useState({
        showEmail: true,
        showPhone: true,
        showCompany: true,
        showPayables: true,
        showUnusedCredits: true,
        showStatus: true,
    });

    const filteredVendors = useMemo(() => {
        let filtered = vendors.filter(vendor =>
            (vendor.displayName || vendor.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
            (vendor.email && vendor.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        // Apply View Filters
        if (currentView === "active") {
            filtered = filtered.filter(v => v.status === "active");
        } else if (currentView === "inactive") {
            filtered = filtered.filter(v => v.status === "inactive");
        } else if (currentView === "crm") {
            filtered = filtered.filter(v => v.isCrm === true);
        } else if (currentView === "portal_enabled") {
            filtered = filtered.filter(v => v.isPortalEnabled === true);
        } else if (currentView === "portal_disabled") {
            filtered = filtered.filter(v => v.isPortalEnabled !== true);
        } else if (currentView === "duplicates") {
            const seenNames = new Map<string, string[]>();
            const seenEmails = new Map<string, string[]>();
            const duplicates = new Set<string>();

            vendors.forEach(v => {
                const name = (v.displayName || v.name).toLowerCase();
                const email = (v.email || "").toLowerCase();

                if (name) {
                    const ids = seenNames.get(name) || [];
                    ids.push(v.id);
                    seenNames.set(name, ids);
                }
                if (email) {
                    const ids = seenEmails.get(email) || [];
                    ids.push(v.id);
                    seenEmails.set(email, ids);
                }
            });

            seenNames.forEach(ids => {
                if (ids.length > 1) ids.forEach(id => duplicates.add(id));
            });
            seenEmails.forEach(ids => {
                if (ids.length > 1) ids.forEach(id => duplicates.add(id));
            });

            filtered = filtered.filter(v => duplicates.has(v.id));
        }

        return filtered.sort((a, b) => {
            let valA: any = a[sortBy as keyof Vendor] || "";
            let valB: any = b[sortBy as keyof Vendor] || "";

            if (sortBy === "createdAt") {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            }

            if (typeof valA === "string") valA = valA.toLowerCase();
            if (typeof valB === "string") valB = valB.toLowerCase();

            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });
    }, [vendors, searchTerm, sortBy, sortOrder]);

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(field);
            setSortOrder("asc");
        }
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.csv,.xlsx,.xls';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            toast({ title: "Import Started", description: `Importing ${file.name}...` });

            try {
                if (file.name.endsWith('.json')) {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    const vendorsToImport = Array.isArray(data) ? data : data.vendors || [];

                    for (const vendor of vendorsToImport) {
                        await fetch('/api/vendors', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(vendor)
                        });
                    }
                    toast({ title: "Import Complete", description: `Imported ${vendorsToImport.length} vendors.` });
                    fetchVendors();
                } else if (file.name.endsWith('.csv')) {
                    const text = await file.text();
                    const lines = text.split('\n').filter(line => line.trim());
                    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

                    let importCount = 0;
                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',');
                        const vendor: Record<string, string> = {};
                        headers.forEach((header, idx) => {
                            vendor[header] = values[idx]?.trim() || '';
                        });

                        await fetch('/api/vendors', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name: vendor.name || vendor.vendor_name,
                                email: vendor.email,
                                phone: vendor.phone,
                                companyName: vendor.company_name || vendor.companyname
                            })
                        });
                        importCount++;
                    }
                    toast({ title: "Import Complete", description: `Imported ${importCount} vendors.` });
                    fetchVendors();
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    const XLSX = await import('xlsx');
                    const arrayBuffer = await file.arrayBuffer();
                    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const data = XLSX.utils.sheet_to_json(worksheet);

                    for (const row of data) {
                        const r = row as Record<string, any>;
                        await fetch('/api/vendors', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name: r.name || r.Name || r['Vendor Name'],
                                email: r.email || r.Email,
                                phone: r.phone || r.Phone,
                                companyName: r.companyName || r['Company Name']
                            })
                        });
                    }
                    toast({ title: "Import Complete", description: `Imported ${data.length} vendors.` });
                    fetchVendors();
                }
            } catch (error) {
                console.error('Import failed:', error);
                toast({ title: "Import Failed", description: "Please check your file format.", variant: "destructive" });
            }
        };
        input.click();
    };

    const handleExport = async (format: 'json' | 'csv' | 'excel') => {
        try {
            const exportData = vendors.map(v => ({
                Name: v.name || v.displayName,
                Email: v.email || '',
                Phone: v.phone || '',
                Company: v.companyName || '',
                'Source of Supply': v.sourceOfSupply || '',
                'Opening Balance': v.openingBalance || 0,
                'Total Billed': v.totalBilled || 0,
                Payables: v.payables || 0,
                'Unused Credits': v.unusedCredits || 0,
                Status: v.status || 'Active'
            }));

            if (format === 'json') {
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `vendors_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                toast({ title: "Export Complete", description: "JSON file downloaded." });
            } else if (format === 'csv') {
                const headers = Object.keys(exportData[0] || {});
                const csvContent = [
                    headers.join(','),
                    ...exportData.map(row => headers.map(h => `"${(row as any)[h] || ''}"`).join(','))
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `vendors_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast({ title: "Export Complete", description: "CSV file downloaded." });
            } else if (format === 'excel') {
                const XLSX = await import('xlsx');
                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Vendors');
                XLSX.writeFile(wb, `vendors_${new Date().toISOString().split('T')[0]}.xlsx`);
                toast({ title: "Export Complete", description: "Excel file downloaded." });
            }
        } catch (error) {
            console.error('Export failed:', error);
            toast({ title: "Export Failed", variant: "destructive" });
        }
    };

    const handleResetColumnWidth = () => {
        toast({
            title: "Success",
            description: "Column widths reset to default.",
        });
    };

    const { currentOrganization } = useOrganization();
    const { currentPage, totalPages, totalItems, itemsPerPage, paginatedItems, goToPage } = usePagination(filteredVendors, 10);

    const toggleSelectVendor = (id: string, e?: React.MouseEvent) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (selectedVendors.includes(id)) {
            setSelectedVendors(selectedVendors.filter(i => i !== id));
        } else {
            setSelectedVendors([...selectedVendors, id]);
        }
    }

    return (
        <div className="flex h-screen animate-in fade-in duration-300 w-full overflow-hidden bg-slate-50">
            <ResizablePanelGroup key={`${selectedVendor ? "split" : "single"}-${isCompact ? "compact" : "full"}`} direction="horizontal" className="h-full w-full">
                {(!isCompact || !selectedVendor) && (
                    <ResizablePanel
                        defaultSize={isCompact ? 100 : (selectedVendor ? 29 : 100)}
                        minSize={isCompact ? 100 : (selectedVendor ? 29 : 100)}
                        maxSize={isCompact ? 100 : (selectedVendor ? 29 : 100)}
                        className="flex flex-col overflow-hidden bg-white border-r border-slate-200 min-w-[25%]"
                    >
                        <div className="flex flex-col h-full overflow-hidden">

                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-10 min-h-[73px] h-auto">
                                <div className="flex items-center gap-2 flex-1">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="text-xl font-semibold text-slate-900 px-2 h-auto gap-2 hover:bg-slate-50">
                                                {currentView === "all" ? "All Vendors" :
                                                    currentView === "active" ? "Active Vendors" :
                                                        currentView === "inactive" ? "Inactive Vendors" :
                                                            currentView === "crm" ? "CRM Vendors" :
                                                                currentView === "duplicates" ? "Duplicate Vendors" :
                                                                    currentView === "portal_enabled" ? "Vendor Portal Enabled" :
                                                                        "Vendor Portal Disabled"}
                                                <ChevronDown className={cn("h-5 w-5 text-blue-600 transition-transform duration-200", false ? "rotate-180" : "")} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-64 p-0">
                                            <div className="py-2">
                                                {[
                                                    { id: "all", label: "All Vendors" },
                                                    { id: "active", label: "Active Vendors" },
                                                    { id: "crm", label: "CRM Vendors" },
                                                    { id: "duplicates", label: "Duplicate Vendors" },
                                                    { id: "inactive", label: "Inactive Vendors" },
                                                    { id: "portal_enabled", label: "Vendor Portal Enabled" },
                                                    { id: "portal_disabled", label: "Vendor Portal Disabled" },
                                                ].map((view) => (
                                                    <DropdownMenuItem
                                                        key={view.id}
                                                        onClick={() => setCurrentView(view.id)}
                                                        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-slate-50"
                                                    >
                                                        <span className={cn(currentView === view.id && "text-blue-600 font-medium")}>{view.label}</span>
                                                    </DropdownMenuItem>
                                                ))}
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="flex items-center gap-2">
                                    {selectedVendor ? (
                                        isSearchVisible ? (
                                            <div className="relative w-full max-w-[200px] animate-in slide-in-from-right-5 fade-in-0 duration-200">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input
                                                    autoFocus
                                                    placeholder="Search..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    onBlur={() => !searchTerm && setIsSearchVisible(false)}
                                                    className="pl-9 h-9"
                                                />
                                            </div>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9 px-0"
                                                data-testid="button-search-compact"
                                                onClick={() => setIsSearchVisible(true)}
                                            >
                                                <Search className="h-4 w-4 text-slate-400" />
                                            </Button>
                                        )
                                    ) : (
                                        <div className="relative w-[240px] hidden sm:block">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                placeholder="Search vendors..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-9 h-9"
                                            />
                                        </div>
                                    )}

                                    <Button
                                        onClick={() => setLocation("/vendors/new")}
                                        className={cn(
                                            "bg-[#002e46] hover:bg-[#001f2f] text-white h-9 font-display font-bold shadow-sm",
                                            selectedVendor ? 'w-9 px-0' : 'gap-2'
                                        )}
                                        size={selectedVendor ? "icon" : "default"}
                                    >
                                        <Plus className="h-4 w-4" />
                                        {!selectedVendor && "New"}
                                    </Button>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="icon" className="h-9 w-9">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56 p-1">
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger className="gap-2">
                                                    <ArrowUpDown className="h-4 w-4" />
                                                    <span>Sort by</span>
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuPortal>
                                                    <DropdownMenuSubContent className="w-48">
                                                        <DropdownMenuItem onClick={() => handleSort("name")} className={cn(sortBy === "name" && "bg-blue-50 text-blue-700 font-medium")}>
                                                            Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleSort("companyName")} className={cn(sortBy === "companyName" && "bg-blue-50 text-blue-700 font-medium")}>
                                                            Company Name {sortBy === "companyName" && (sortOrder === "asc" ? "↑" : "↓")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleSort("payables")} className={cn(sortBy === "payables" && "bg-blue-50 text-blue-700 font-medium")}>
                                                            Payables {sortBy === "payables" && (sortOrder === "asc" ? "↑" : "↓")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleSort("unusedCredits")} className={cn(sortBy === "unusedCredits" && "bg-blue-50 text-blue-700 font-medium")}>
                                                            Unused Credits {sortBy === "unusedCredits" && (sortOrder === "asc" ? "↑" : "↓")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleSort("createdAt")} className={cn(sortBy === "createdAt" && "bg-blue-50 text-blue-700 font-medium")}>
                                                            Created Time {sortBy === "createdAt" && (sortOrder === "asc" ? "↑" : "↓")}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuPortal>
                                            </DropdownMenuSub>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger className="gap-2">
                                                    <Download className="h-4 w-4" />
                                                    <span>Import</span>
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuPortal>
                                                    <DropdownMenuSubContent>
                                                        <DropdownMenuItem onClick={handleImport}>Import Vendors</DropdownMenuItem>
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuPortal>
                                            </DropdownMenuSub>
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger className="gap-2">
                                                    <Download className="h-4 w-4 rotate-180" />
                                                    <span>Export</span>
                                                </DropdownMenuSubTrigger>
                                                <DropdownMenuPortal>
                                                    <DropdownMenuSubContent>
                                                        <DropdownMenuItem onClick={() => handleExport('excel')}>Export as Excel (.xlsx)</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleExport('csv')}>Export as CSV</DropdownMenuItem>
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuPortal>
                                            </DropdownMenuSub>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="gap-2" onClick={() => setIsPreferencesOpen(true)}>
                                                <Settings className="h-4 w-4" />
                                                Preferences
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            {/* List */}
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex-1 overflow-auto scrollbar-hide">
                                    {loading ? (
                                        <div className="p-8 text-center text-slate-500">Loading vendors...</div>
                                    ) : filteredVendors.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500">No vendors found.</div>
                                    ) : selectedVendor ? (
                                        <div className="divide-y divide-slate-100">
                                            {filteredVendors.map(vendor => (
                                                <div
                                                    key={vendor.id}
                                                    className={`p-4 hover:bg-slate-50 cursor-pointer ${selectedVendor.id === vendor.id ? 'bg-sidebar/5 border-l-2 border-l-sidebar' : ''}`}
                                                    onClick={() => handleVendorClick(vendor)}
                                                >
                                                    <div className="font-medium text-slate-900">{vendor.displayName || vendor.name}</div>
                                                    <div className="text-sm text-slate-500">{vendor.companyName}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead className="bg-sidebar/5 sticky top-0 z-10">
                                                <tr className="border-b border-slate-200">
                                                    <th className="w-10 px-3 py-3 text-left">
                                                        <Checkbox />
                                                    </th>
                                                    <th className="px-3 py-3 text-left text-[11px] font-bold text-sidebar/70 uppercase tracking-wider font-display">Name</th>
                                                    <th className="px-3 py-3 text-left text-[11px] font-bold text-sidebar/70 uppercase tracking-wider font-display">Company</th>
                                                    <th className="px-3 py-3 text-left text-[11px] font-bold text-sidebar/70 uppercase tracking-wider font-display">Email</th>
                                                    <th className="px-3 py-3 text-left text-[11px] font-bold text-sidebar/70 uppercase tracking-wider font-display">Phone</th>
                                                    <th className="px-3 py-3 text-right text-[11px] font-bold text-sidebar/70 uppercase tracking-wider font-display">Opening Balance</th>
                                                    <th className="px-3 py-3 text-right text-[11px] font-bold text-sidebar/70 uppercase tracking-wider font-display">Total Billed</th>
                                                    <th className="px-3 py-3 text-right text-[11px] font-bold text-sidebar/70 uppercase tracking-wider font-display">Payables</th>
                                                    <th className="px-3 py-3 text-right text-[11px] font-bold text-sidebar/70 uppercase tracking-wider font-display">Unused Credits</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {paginatedItems.map(vendor => (
                                                    <tr
                                                        key={vendor.id}
                                                        className="hover:bg-slate-50 cursor-pointer"
                                                        onClick={() => handleVendorClick(vendor)}
                                                    >
                                                        <td className="px-3 py-3"><Checkbox onClick={e => toggleSelectVendor(vendor.id, e)} /></td>
                                                        <td className="px-3 py-3 font-medium text-sidebar">{vendor.displayName || vendor.name}</td>
                                                        <td className="px-3 py-3 text-slate-600">{vendor.companyName || '-'}</td>
                                                        <td className="px-3 py-3 text-slate-600">{vendor.email || '-'}</td>
                                                        <td className="px-3 py-3 text-slate-600">{vendor.mobile || vendor.workPhone || vendor.phone || '-'}</td>
                                                        <td className="px-3 py-3 text-right font-medium">{formatCurrency(vendor.openingBalance || 0)}</td>
                                                        <td className="px-3 py-3 text-right font-medium">{formatCurrency(vendor.totalBilled || 0)}</td>
                                                        <td className="px-3 py-3 text-right font-medium">{formatCurrency(vendor.payables || 0)}</td>
                                                        <td className="px-3 py-3 text-right font-medium text-green-600">{formatCurrency(vendor.unusedCredits || 0)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                                <div className="flex-none border-t border-slate-200 bg-white">
                                    <TablePagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        totalItems={totalItems}
                                        itemsPerPage={itemsPerPage}
                                        onPageChange={goToPage}
                                    />
                                </div>
                            </div>
                        </div>
                    </ResizablePanel>
                )}

                {selectedVendor && (
                    <>
                        {!isCompact && (
                            <ResizableHandle withHandle className="w-1 bg-slate-200 hover:bg-blue-400 hover:w-1.5 transition-all cursor-col-resize" />
                        )}
                        <ResizablePanel defaultSize={isCompact ? 100 : 71} minSize={isCompact ? 100 : 30} className="bg-white">
                            <VendorDetailPanel
                                vendor={selectedVendor}
                                onClose={handleClosePanel}
                                onEdit={handleEditVendor}
                                onDelete={handleDeleteClick}
                            />
                        </ResizablePanel>
                    </>
                )}
            </ResizablePanelGroup>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this vendor? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isPreferencesOpen} onOpenChange={setIsPreferencesOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Preferences</DialogTitle>
                        <DialogDescription>
                            Configure how your vendor list is displayed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-email">Show Email Column</Label>
                            <Switch
                                id="show-email"
                                checked={columnPreferences.showEmail}
                                onCheckedChange={(checked) =>
                                    setColumnPreferences((prev) => ({ ...prev, showEmail: checked }))
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-phone">Show Phone Column</Label>
                            <Switch
                                id="show-phone"
                                checked={columnPreferences.showPhone}
                                onCheckedChange={(checked) =>
                                    setColumnPreferences((prev) => ({ ...prev, showPhone: checked }))
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-company">Show Company Column</Label>
                            <Switch
                                id="show-company"
                                checked={columnPreferences.showCompany}
                                onCheckedChange={(checked) =>
                                    setColumnPreferences((prev) => ({ ...prev, showCompany: checked }))
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-payables">Show Payables Column</Label>
                            <Switch
                                id="show-payables"
                                checked={columnPreferences.showPayables}
                                onCheckedChange={(checked) =>
                                    setColumnPreferences((prev) => ({ ...prev, showPayables: checked }))
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-unused-credits">Show Unused Credits Column</Label>
                            <Switch
                                id="show-unused-credits"
                                checked={columnPreferences.showUnusedCredits}
                                onCheckedChange={(checked) =>
                                    setColumnPreferences((prev) => ({ ...prev, showUnusedCredits: checked }))
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-status">Show Status Column</Label>
                            <Switch
                                id="show-status"
                                checked={columnPreferences.showStatus}
                                onCheckedChange={(checked) =>
                                    setColumnPreferences((prev) => ({ ...prev, showStatus: checked }))
                                }
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setColumnPreferences({
                                    showEmail: true,
                                    showPhone: true,
                                    showCompany: true,
                                    showPayables: true,
                                    showUnusedCredits: true,
                                    showStatus: true,
                                });
                                toast({ title: "Preferences reset to default" });
                            }}
                        >
                            Reset to Default
                        </Button>
                        <Button onClick={() => {
                            setIsPreferencesOpen(false);
                            toast({ title: "Preferences saved" });
                        }}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
