import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  FileText, Plus, Trash2, ChevronDown, Search,
  Upload, Info, X, Building2, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountSelectDropdown } from "@/components/AccountSelectDropdown";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/authStore";
import { Card } from "@/components/ui/card";

interface Organization {
  id: string;
  name: string;
  companyName?: string;
  address?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    country?: string;
  };
  gstin?: string;
  email?: string;
  phone?: string;
}

interface PurchaseOrder {
  id: string;
  purchaseOrderNumber: string;
  status: string;
  vendorId?: string;
  vendorName?: string;
  items: any[];
  subTotal?: number;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  taxAmount?: number;
  tcsAmount?: number;
  tdsAmount?: number;
  adjustment?: number;
  adjustmentDescription?: string;
  total?: number;
  notes?: string;
  vendorAddress?: any;
}

interface BillItem {
  id: string;
  itemName: string;
  itemId?: string;
  description?: string;
  account: string;
  quantity: number;
  rate: number;
  tax?: string;
  taxAmount?: number;
  customerDetails?: string;
  amount: number;
  availableQuantity?: number;
}

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Tax {
  id: string;
  name: string;
  rate: number;
}

interface VendorItem {
  id: string;
  name: string;
  type?: string;
  unit?: string;
  usageUnit?: string;
  sellingPrice?: number;
  costPrice?: number;
  rate?: string | number;
  purchaseRate?: string | number;
  description?: string;
  purchaseDescription?: string;
  hsnSac?: string;
  taxPreference?: string;
  intraStateTax?: string;
  interStateTax?: string;
  purchaseAccount?: string;
  salesAccount?: string;
  availableQuantity?: number;
  isActive?: boolean;
}

export default function VendorBillCreate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { token } = useAuthStore();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [vendorItems, setVendorItems] = useState<VendorItem[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingPO, setLoadingPO] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const purchaseOrderIdFromUrl = urlParams.get('purchaseOrderId');
  const billIdFromUrl = urlParams.get('billId');

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const [formData, setFormData] = useState({
    billNumber: "",
    orderNumber: "",
    billDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    paymentTerms: "Due on Receipt",
    reverseCharge: false,
    subject: "",
    notes: "",
    items: [] as BillItem[],
    subTotal: 0,
    discountType: "percent",
    discountValue: 0,
    discountAmount: 0,
    taxType: "TDS",
    taxCategory: "none",
    taxAmount: 0,
    tcsType: "TCS",
    tcsCategory: "none",
    tcsValue: 0,
    tdsValue: 0,
    adjustment: 0,
    adjustmentDescription: "",
    total: 0,
    purchaseOrderId: "",
    selectedPurchaseOrderId: "",
  });

  useEffect(() => {
    fetchOrganization();
    fetchPurchaseOrders();
    fetchAccounts();
    fetchTaxes();
    fetchVendorItems();
    fetchNextBillNumber();
    if (billIdFromUrl) {
      fetchBillForEdit(billIdFromUrl);
    }
  }, []);

  useEffect(() => {
    if (purchaseOrderIdFromUrl && purchaseOrders.length > 0 && !formData.purchaseOrderId) {
      handlePurchaseOrderSelect(purchaseOrderIdFromUrl);
    }
  }, [purchaseOrderIdFromUrl, purchaseOrders]);

  const fetchOrganization = async () => {
    try {
      const response = await fetch('/api/organizations');
      if (response.ok) {
        const data = await response.json();
        const orgs = data.data || [];
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch organization:', error);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch('/api/vendor/purchase-orders', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const allPOs = data.data || [];
        // Exclude purchase orders that are already converted to bills
        const billsRes = await fetch('/api/vendor/bills', { headers: { 'Authorization': `Bearer ${token}` } });
        let vendorBills: any[] = [];
        if (billsRes.ok) {
          const billsData = await billsRes.json();
          vendorBills = billsData.data || [];
        }
        const convertedPoIds = new Set(vendorBills.map(b => b.purchaseOrderId).filter(Boolean));
        const eligiblePOs = allPOs.filter((po: PurchaseOrder) =>
          (po.status === "Accepted" || po.status === "ISSUED" || po.status === "Issued") && !convertedPoIds.has(po.id)
        );
        setPurchaseOrders(eligiblePOs);
      }
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error);
    }
  };

  const fetchVendorItems = async () => {
    try {
      setLoadingItems(true);
      const response = await fetch('/api/vendor/items', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setVendorItems((data.data || []).filter((i: VendorItem) => i.isActive !== false));
      }
    } catch (error) {
      console.error('Failed to fetch vendor items:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/bills/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  const fetchTaxes = async () => {
    try {
      const response = await fetch('/api/bills/taxes');
      if (response.ok) {
        const data = await response.json();
        setTaxes(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch taxes:', error);
    }
  };

  const fetchNextBillNumber = async () => {
    try {
      const response = await fetch('/api/bills/next-number');
      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, billNumber: data.data.billNumber }));
      }
    } catch (error) {
      console.error('Failed to fetch next bill number:', error);
    }
  };

  const fetchBillForEdit = async (billId: string) => {
    try {
      const response = await fetch(`/api/vendor/bills`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const bill = (data.data || []).find((b: any) => b.id === billId);
        if (bill) {
          setFormData(prev => ({
            ...prev,
            billNumber: bill.billNumber || prev.billNumber,
            orderNumber: bill.orderNumber || "",
            billDate: bill.billDate || prev.billDate,
            dueDate: bill.dueDate || prev.dueDate,
            paymentTerms: bill.paymentTerms || "Due on Receipt",
            reverseCharge: bill.reverseCharge || false,
            subject: bill.subject || "",
            notes: bill.notes || "",
            items: bill.items || [],
            discountType: bill.discountType || "percent",
            discountValue: bill.discountValue || 0,
            tcsValue: bill.tcsAmount || bill.tcsValue || 0,
            tdsValue: bill.tdsAmount || bill.tdsValue || 0,
            adjustment: bill.adjustment || 0,
            adjustmentDescription: bill.adjustmentDescription || "",
            purchaseOrderId: bill.purchaseOrderId || "",
            selectedPurchaseOrderId: bill.purchaseOrderId || "",
          }));
          if (bill.attachments) {
            setAttachments(bill.attachments);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch bill for editing:', error);
    }
  };

  const handlePurchaseOrderSelect = (poId: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;

    setLoadingPO(true);

    const billItems: BillItem[] = (po.items || []).map((item: any, index: number) => {
      const vendorItem = vendorItems.find(vi => vi.name === item.itemName || vi.id === item.itemId);
      const rate = vendorItem ? (parseRateValue(vendorItem.purchaseRate) || vendorItem.costPrice || item.rate || 0) : (item.rate || 0);
      const taxRateStr = vendorItem?.intraStateTax || item.tax || "";
      const taxRate = taxes.find(t => t.name === taxRateStr)?.rate || 0;
      const amount = (item.quantity || 1) * rate;
      
      return {
        id: `item-${Date.now()}-${index}`,
        itemName: item.itemName || item.name || "",
        itemId: vendorItem?.id || item.itemId || "",
        description: item.description || vendorItem?.purchaseDescription || "",
        account: item.account || vendorItem?.purchaseAccount || "Cost of Goods Sold",
        quantity: item.quantity || 1,
        rate: rate,
        tax: taxRateStr,
        taxAmount: (amount * taxRate) / 100,
        customerDetails: "none",
        amount: amount,
        availableQuantity: vendorItem?.availableQuantity,
      };
    });

    setFormData(prev => ({
      ...prev,
      orderNumber: po.purchaseOrderNumber || "",
      subject: `Bill for Purchase Order #${po.purchaseOrderNumber}`,
      notes: po.notes || "",
      items: billItems,
      discountType: po.discountType || "percent",
      discountValue: po.discountValue || 0,
      discountAmount: po.discountAmount || 0,
      tcsValue: po.tcsAmount || 0,
      tdsValue: po.tdsAmount || 0,
      adjustment: po.adjustment || 0,
      adjustmentDescription: po.adjustmentDescription || "",
      purchaseOrderId: po.id,
      selectedPurchaseOrderId: po.id,
    }));

    setLoadingPO(false);
    toast({ title: `Loaded data from Purchase Order #${po.purchaseOrderNumber}` });
  };

  const parseRateValue = (value: string | number | undefined): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const stringValue = String(value).replace(/,/g, '');
    const parsed = parseFloat(stringValue);
    return isNaN(parsed) ? 0 : parsed;
  };

  const addItem = () => {
    const newItem: BillItem = {
      id: String(Date.now()),
      itemName: "",
      description: "",
      account: "",
      quantity: 1,
      rate: 0,
      tax: "",
      taxAmount: 0,
      customerDetails: "none",
      amount: 0,
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const calculateSubTotal = () =>
    formData.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);

  const calculateTaxTotal = () =>
    formData.items.reduce((sum, item) => sum + (Number(item.taxAmount) || 0), 0);

  const calculateDiscount = () => {
    const subTotal = calculateSubTotal();
    return formData.discountType === "percent"
      ? (subTotal * (Number(formData.discountValue) || 0)) / 100
      : (Number(formData.discountValue) || 0);
  };

  const calculateTCS = () => (Number(formData.tcsValue) || 0);
  const calculateTDS = () => (Number(formData.tdsValue) || 0);

  const calculateTotal = () => {
    const subTotal = calculateSubTotal();
    const discount = calculateDiscount();
    const taxTotal = calculateTaxTotal();
    const adjustment = Number(formData.adjustment) || 0;
    const tcs = calculateTCS();
    return subTotal - discount + taxTotal + adjustment + tcs;
  };

  const calculateBalanceDue = () => {
    return calculateTotal() - calculateTDS();
  };

  const getQuantityError = (item: BillItem): string | null => {
    if (item.availableQuantity !== undefined && item.availableQuantity !== null) {
      if (Number(item.quantity) > Number(item.availableQuantity)) {
        return `Exceeds available quantity (${item.availableQuantity})`;
      }
    }
    const vendorItem = vendorItems.find(vi => vi.name === item.itemName || vi.id === item.itemId);
    if (vendorItem && vendorItem.availableQuantity !== undefined && vendorItem.availableQuantity !== null) {
      if (Number(item.quantity) > Number(vendorItem.availableQuantity)) {
        return `Exceeds available quantity (${vendorItem.availableQuantity})`;
      }
    }
    return null;
  };

  const getItemAvailableQty = (item: BillItem): number | null => {
    if (item.availableQuantity !== undefined && item.availableQuantity !== null) {
      return Number(item.availableQuantity);
    }
    const vendorItem = vendorItems.find(vi => vi.name === item.itemName || vi.id === item.itemId);
    if (vendorItem && vendorItem.availableQuantity !== undefined && vendorItem.availableQuantity !== null) {
      return Number(vendorItem.availableQuantity);
    }
    return null;
  };

  const hasQuantityErrors = () => {
    return formData.items.some(item => getQuantityError(item) !== null);
  };

  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'rate') {
            updatedItem.amount = (Number(updatedItem.quantity) || 0) * (Number(updatedItem.rate) || 0);
            if (updatedItem.tax) {
              const taxRate = taxes.find(t => t.name === updatedItem.tax)?.rate || 0;
              updatedItem.taxAmount = (updatedItem.amount * taxRate) / 100;
            }
          }
          if (field === 'tax') {
            const taxRate = taxes.find(t => t.name === value)?.rate || 0;
            updatedItem.taxAmount = (updatedItem.amount * taxRate) / 100;
          }
          return updatedItem;
        }
        return item;
      }),
    }));
  };

  const removeItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id),
    }));
  };

  const handleVendorItemSelect = (itemId: string, vendorItemId: string) => {
    const vendorItem = vendorItems.find(p => p.id === vendorItemId);
    if (vendorItem) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(item => {
          if (item.id === itemId) {
            const rate = parseRateValue(vendorItem.purchaseRate) || vendorItem.costPrice || vendorItem.sellingPrice || 0;
            const taxRateStr = vendorItem.intraStateTax || "";
            const taxRate = taxes.find(t => t.name === taxRateStr)?.rate || 0;
            const amount = item.quantity * rate;
            return {
              ...item,
              itemName: vendorItem.name,
              itemId: vendorItem.id,
              description: vendorItem.purchaseDescription || vendorItem.description || "",
              account: vendorItem.purchaseAccount || item.account || "",
              rate: rate,
              tax: taxRateStr,
              taxAmount: (amount * taxRate) / 100,
              amount: amount,
              availableQuantity: vendorItem.availableQuantity,
            };
          }
          return item;
        }),
      }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > 5) {
      toast({ title: "You can only upload up to 5 files", variant: "destructive" });
      return;
    }

    const formDataUpload = new FormData();
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > 10 * 1024 * 1024) {
        toast({ title: `File ${files[i].name} exceeds 10MB limit`, variant: "destructive" });
        continue;
      }
      formDataUpload.append('files', files[i]);
    }

    setUploading(true);
    try {
      const response = await fetch('/api/bills/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (response.ok) {
        const result = await response.json();
        setAttachments(prev => [...prev, ...result.data]);
        toast({ title: "Files uploaded successfully" });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast({ title: "Failed to upload files", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = async (status: "DRAFT" | "Submitted" = "DRAFT") => {
    if (!formData.selectedPurchaseOrderId) {
      toast({ title: "Please select a Purchase Order", variant: "destructive" });
      return;
    }
    if (!formData.billNumber) {
      toast({ title: "Please enter a bill number", variant: "destructive" });
      return;
    }
    if (formData.items.length === 0) {
      toast({ title: "Please add at least one item", variant: "destructive" });
      return;
    }
    if (status === "Submitted" && hasQuantityErrors()) {
      toast({ title: "Bill quantity exceeds available stock for one or more items", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const billPayload = {
        ...formData,
        attachments,
        subTotal: calculateSubTotal(),
        discountAmount: calculateDiscount(),
        taxAmount: calculateTaxTotal(),
        tcsAmount: calculateTCS(),
        tdsAmount: calculateTDS(),
        total: calculateTotal(),
        balanceDue: calculateBalanceDue(),
        status,
      };

      const url = billIdFromUrl
        ? `/api/vendor/bills/${billIdFromUrl}`
        : '/api/vendor/bills';
      const method = billIdFromUrl ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(billPayload),
      });

      if (response.ok) {
        toast({ 
          title: status === "Submitted" ? "Bill submitted successfully" : (billIdFromUrl ? "Bill updated successfully" : "Bill saved as draft") 
        });
        setLocation("/vendor/bills");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save bill');
      }
    } catch (error: any) {
      toast({ title: error.message || "Failed to save bill", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getGSTSplits = () => {
    const orgState = organization?.address?.state || "Maharashtra";
    const isIntraState = true;
    const splits: { [key: string]: number } = {};

    formData.items.forEach(item => {
      if (item.tax && item.tax !== "none" && item.tax !== "") {
        const rate = parseInt(item.tax.replace(/\D/g, "")) || 0;
        const taxAmount = Number(item.taxAmount) || 0;

        if (isIntraState) {
          const halfRate = rate / 2;
          const halfAmount = taxAmount / 2;
          splits[`CGST${halfRate}`] = (splits[`CGST${halfRate}`] || 0) + halfAmount;
          splits[`SGST${halfRate}`] = (splits[`SGST${halfRate}`] || 0) + halfAmount;
        } else {
          splits[`IGST${rate}`] = (splits[`IGST${rate}`] || 0) + taxAmount;
        }
      }
    });

    return splits;
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 h-screen">
      <div className="flex-1 overflow-y-auto invisible-scrollbar">
        <div className="max-w-6xl mx-auto p-6 pb-24">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="h-6 w-6 text-slate-600" />
            <h1 className="text-2xl font-semibold text-slate-900" data-testid="text-page-title">
              {billIdFromUrl ? "Edit Bill" : "New Bill"}
            </h1>
          </div>

          {organization && (
            <Card className="p-4 mb-4 bg-slate-50 border-slate-200">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-slate-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2" data-testid="text-org-label">
                    Organization Name (Admin)
                  </h3>
                  <p className="font-bold text-lg text-slate-900 mb-1" data-testid="text-org-name">
                    {organization.companyName || organization.name}
                  </p>
                  {organization.address && (
                    <div className="space-y-1">
                      <p className="text-sm text-slate-600 flex items-start gap-2" data-testid="text-org-address">
                        <span className="font-medium shrink-0">Address:</span>
                        <span>
                          {[
                            organization.address.street1,
                            organization.address.street2,
                            organization.address.city,
                            organization.address.state,
                            organization.address.pinCode,
                          ].filter(Boolean).join(", ")}
                        </span>
                      </p>
                      {organization.gstin && (
                        <p className="text-sm text-slate-600 flex items-center gap-2" data-testid="text-org-gstin">
                          <span className="font-medium shrink-0">GST Number:</span>
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{organization.gstin}</span>
                        </p>
                      )}
                      {(organization.email || organization.phone) && (
                        <p className="text-sm text-slate-600 flex items-center gap-2" data-testid="text-org-contact">
                          <span className="font-medium shrink-0">Contact Details:</span>
                          <span>{[organization.email, organization.phone].filter(Boolean).join(" | ")}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="grid gap-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-black">
                    Purchase Order <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.selectedPurchaseOrderId}
                    onValueChange={handlePurchaseOrderSelect}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-purchase-order">
                      <SelectValue placeholder="Select a Purchase Order" />
                    </SelectTrigger>
                    <SelectContent>
                      {purchaseOrders.length === 0 ? (
                        <SelectItem value="none" disabled>No accepted purchase orders</SelectItem>
                      ) : (
                        purchaseOrders.map(po => (
                          <SelectItem key={po.id} value={po.id}>
                            PO# {po.purchaseOrderNumber} - {po.status}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div></div>
              </div>

              {formData.selectedPurchaseOrderId && (
                <div className="bg-sidebar/5 border border-sidebar/10 rounded-lg p-4 flex items-center gap-3">
                  <FileText className="h-5 w-5 text-sidebar" />
                  <div>
                    <p className="text-sm font-medium text-sidebar">
                      {loadingPO ? "Loading purchase order data..." : "Creating bill from Purchase Order"}
                    </p>
                    {formData.orderNumber && (
                      <p className="text-xs text-sidebar">PO# {formData.orderNumber}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-black">
                    Bill# <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.billNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, billNumber: e.target.value }))}
                    className="mt-1"
                    data-testid="input-bill-number"
                  />
                </div>
                <div>
                  <Label>Order Number</Label>
                  <Input
                    value={formData.orderNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, orderNumber: e.target.value }))}
                    className="mt-1"
                    data-testid="input-order-number"
                    readOnly
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-black">
                    Bill Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.billDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, billDate: e.target.value }))}
                    className="mt-1"
                    data-testid="input-bill-date"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="mt-1"
                      data-testid="input-due-date"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Payment Terms</Label>
                    <Select
                      value={formData.paymentTerms}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, paymentTerms: value }))}
                    >
                      <SelectTrigger className="mt-1" data-testid="select-payment-terms">
                        <SelectValue placeholder="Select terms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                        <SelectItem value="Net 15">Net 15</SelectItem>
                        <SelectItem value="Net 30">Net 30</SelectItem>
                        <SelectItem value="Net 45">Net 45</SelectItem>
                        <SelectItem value="Net 60">Net 60</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="reverse-charge"
                  checked={formData.reverseCharge}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, reverseCharge: checked as boolean }))}
                />
                <Label htmlFor="reverse-charge" className="text-sm">
                  This transaction is applicable for reverse charge
                </Label>
              </div>

              <div>
                <Label className="flex items-center gap-1">
                  Subject <Info className="h-3 w-3 text-slate-400" />
                </Label>
                <Textarea
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter a subject within 250 characters"
                  className="mt-1 resize-none"
                  maxLength={250}
                  data-testid="input-subject"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>At Transaction Level</span>
                <ChevronDown className="h-4 w-4" />
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-sidebar/5 px-4 py-2 flex items-center justify-between gap-2 border-b">
                  <h3 className="font-medium text-slate-700">Item Table</h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-sidebar/5">
                      <TableHead className="w-[200px] text-xs">ITEM DETAILS</TableHead>
                      <TableHead className="w-[150px] text-xs">ACCOUNT</TableHead>
                      <TableHead className="w-[120px] text-xs text-center">QUANTITY</TableHead>
                      <TableHead className="w-[140px] text-xs text-right">RATE</TableHead>
                      <TableHead className="w-[120px] text-xs">TAX</TableHead>
                      <TableHead className="w-[100px] text-xs text-right">AMOUNT</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                          {formData.selectedPurchaseOrderId
                            ? "No items in selected Purchase Order."
                            : "Select a Purchase Order to populate items, or add items manually."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      formData.items.map((item) => {
                        const qtyError = getQuantityError(item);
                        const availQty = getItemAvailableQty(item);
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Select
                                value={item.itemName || ""}
                                onValueChange={(value) => {
                                  const vendorItem = vendorItems.find(p => p.name === value);
                                  if (vendorItem) {
                                    handleVendorItemSelect(item.id, vendorItem.id);
                                  }
                                }}
                              >
                                <SelectTrigger className="text-sm" data-testid={`select-item-${item.id}`}>
                                  <SelectValue placeholder={loadingItems ? "Loading items..." : "Select an item"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {loadingItems ? (
                                    <SelectItem value="loading" disabled>Loading items...</SelectItem>
                                  ) : vendorItems.length === 0 ? (
                                    <SelectItem value="none" disabled>No items available</SelectItem>
                                  ) : (
                                    vendorItems.map(vi => {
                                      const displayPrice = parseRateValue(vi.rate) || vi.costPrice || vi.sellingPrice || 0;
                                      return (
                                        <SelectItem key={vi.id} value={vi.name}>
                                          {vi.name} {vi.usageUnit ? `(${vi.usageUnit})` : ''} - ₹{displayPrice.toLocaleString('en-IN')}
                                          {vi.availableQuantity !== undefined ? ` [Qty: ${vi.availableQuantity}]` : ''}
                                        </SelectItem>
                                      );
                                    })
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <AccountSelectDropdown
                                value={item.account}
                                onValueChange={(value) => updateItem(item.id, 'account', value)}
                                placeholder="Select an account"
                                triggerClassName="text-sm"
                                testId={`select-account-${item.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                  className={`text-sm text-center ${qtyError ? 'border-red-500' : ''}`}
                                  min={0}
                                  step={0.01}
                                  data-testid={`input-quantity-${item.id}`}
                                />
                                {availQty !== null && (
                                  <p className="text-[10px] text-slate-400 mt-0.5 text-center" data-testid={`text-avail-qty-${item.id}`}>
                                    Avail: {availQty}
                                  </p>
                                )}
                                {qtyError && (
                                  <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-0.5" data-testid={`text-qty-error-${item.id}`}>
                                    <AlertCircle className="h-3 w-3" />
                                    {qtyError}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.rate}
                                onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                className="text-sm text-right"
                                min={0}
                                step={0.01}
                                data-testid={`input-rate-${item.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.tax || ""}
                                onValueChange={(value) => updateItem(item.id, 'tax', value)}
                              >
                                <SelectTrigger className="text-sm" data-testid={`select-tax-${item.id}`}>
                                  <SelectValue placeholder="Select a Tax" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Tax</SelectItem>
                                  {taxes.map(tax => (
                                    <SelectItem key={tax.id} value={tax.name}>
                                      {tax.name} ({tax.rate}%)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ₹{item.amount.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.id)}
                                data-testid={`button-remove-item-${item.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                <div className="p-3 border-t">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-add-new-row">
                        <Plus className="h-4 w-4" />
                        Add New Row
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={addItem}>Add Item</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-80 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Sub Total</span>
                    <span className="font-medium">
                      ₹{calculateSubTotal().toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-600 shrink-0">Discount</span>
                    <div className="flex-1 flex gap-2">
                      <Input
                        type="number"
                        className="h-8"
                        value={formData.discountValue}
                        onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                      />
                      <Select value={formData.discountType} onValueChange={(v) => setFormData({ ...formData, discountType: v })}>
                        <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">%</SelectItem>
                          <SelectItem value="amount">₹</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="text-sm font-medium w-24 text-right">
                      -₹{calculateDiscount().toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Tax Total</span>
                    <span className="font-medium">
                      ₹{calculateTaxTotal().toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="space-y-1 pl-4 border-l-2 border-slate-100">
                    {Object.entries(getGSTSplits()).map(([label, amount]) => (
                      <div key={label} className="flex justify-between text-xs text-slate-500">
                        <span>{label}</span>
                        <span>₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-600 shrink-0">Adjustment</span>
                    <Input
                      type="number"
                      className="h-8 flex-1"
                      value={formData.adjustment}
                      onChange={(e) => setFormData({ ...formData, adjustment: parseFloat(e.target.value) || 0 })}
                    />
                    <span className="text-sm font-medium w-24 text-right">
                      ₹{formData.adjustment.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-slate-200 mt-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label className="text-xs text-slate-500 uppercase font-semibold">TCS</Label>
                        <div className="flex gap-2">
                          <Select value={formData.tcsType} onValueChange={(v) => setFormData({ ...formData, tcsType: v })}>
                            <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="TCS">TCS</SelectItem></SelectContent>
                          </Select>
                          <Input type="number" className="h-8 flex-1" value={formData.tcsValue} onChange={(e) => setFormData({ ...formData, tcsValue: parseFloat(e.target.value) || 0 })} />
                        </div>
                      </div>
                      <span className="text-sm font-medium w-24 text-right pt-6">
                        ₹{(Number(formData.tcsValue) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-lg font-semibold text-slate-900">Total (₹)</span>
                      <span className="text-lg font-bold text-slate-900">
                        ₹{calculateTotal().toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 pt-2 border-t border-dashed border-slate-200">
                      <div className="flex-1">
                        <Label className="text-xs text-slate-500 uppercase font-semibold">TDS</Label>
                        <div className="flex gap-2">
                          <Select value={formData.taxType} onValueChange={(v) => setFormData({ ...formData, taxType: v })}>
                            <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="TDS">TDS</SelectItem></SelectContent>
                          </Select>
                          <Input type="number" className="h-8 flex-1" value={formData.tdsValue} onChange={(e) => setFormData({ ...formData, tdsValue: parseFloat(e.target.value) || 0 })} />
                        </div>
                      </div>
                      <span className="text-sm font-medium w-24 text-right pt-6 text-red-600">
                        -₹{(Number(formData.tdsValue) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 bg-sidebar/5 p-2 rounded-md">
                      <span className="text-base font-semibold text-sidebar">Balance Due (₹)</span>
                      <span className="text-base font-bold text-sidebar">
                        ₹{calculateBalanceDue().toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="pt-4 flex flex-col gap-2">
                      <Button 
                        type="button"
                        variant="outline"
                        className="w-full text-xs font-bold uppercase tracking-wider text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => handleSubmit("Submitted")}
                        disabled={isSubmitting}
                      >
                        Send to Customer (Admin)
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-6 p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Enter notes"
                    className="mt-1 resize-none bg-white"
                    data-testid="input-notes"
                  />
                  <p className="text-xs text-slate-500 mt-1">It will not be shown in PDF</p>
                </div>
                <div>
                  <Label>Attach File(s) to Bill</Label>
                  <div className="mt-1 border-2 border-dashed border-slate-200 rounded-lg p-4 text-center bg-white relative">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploading}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                    <Button variant="outline" size="sm" className="gap-1.5" disabled={uploading}>
                      <Upload className="h-4 w-4" />
                      {uploading ? "Uploading..." : "Upload File"}
                    </Button>
                    <p className="text-xs text-slate-500 mt-2">You can upload a maximum of 5 files, 10MB each</p>
                  </div>
                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachments.map((file: any) => (
                        <div key={file.id} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-md border border-slate-100">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <span className="text-xs text-slate-600 truncate">{file.fileName}</span>
                            <span className="text-[10px] text-slate-400">({(file.fileSize / 1024 / 1024).toFixed(2)} MB)</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAttachment(file.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6 p-4 bg-white rounded-lg shadow-sm border border-slate-200">
            <Button
              variant="outline"
              onClick={() => setLocation("/vendor/bills")}
              data-testid="button-cancel"
              className="font-display"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50 font-display"
              onClick={() => handleSubmit("DRAFT")}
              disabled={loading}
              data-testid="button-save-draft"
            >
              {loading ? "Saving..." : "Save as Draft"}
            </Button>
            <Button
              className="bg-sidebar hover:bg-sidebar/90 font-display text-white"
              onClick={() => handleSubmit("Submitted")}
              disabled={loading}
              data-testid="button-submit"
            >
              {loading ? "Submitting..." : "Save and Submit"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
