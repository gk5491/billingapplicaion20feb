import { useState, useEffect, type MouseEvent } from "react";
import { Plus, MoreHorizontal, ChevronDown, ArrowUpDown, RefreshCw, Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/authStore";

interface VendorItem {
  id: string;
  vendorId: string;
  name: string;
  type: string;
  hsnSac: string;
  usageUnit: string;
  rate: string;
  purchaseRate: string;
  description: string;
  salesDescription: string;
  purchaseDescription: string;
  taxPreference: string;
  intraStateTax: string;
  interStateTax: string;
  salesAccount: string;
  purchaseAccount: string;
  availableQuantity: number;
  isActive: boolean;
  sku?: string;
  unit?: string;
  taxable?: boolean;
  incomeAccount?: string;
  expenseAccount?: string;
  trackInventory?: boolean;
  inventoryAccount?: string;
  reorderPoint?: number;
  createdAt: string;
  updatedAt: string;
}

const emptyForm = {
  name: "",
  type: "goods",
  sku: "",
  hsnSac: "",
  usageUnit: "",
  unit: "pcs",
  rate: "",
  purchaseRate: "",
  description: "",
  salesDescription: "",
  purchaseDescription: "",
  taxPreference: "taxable",
  taxable: true,
  intraStateTax: "",
  interStateTax: "",
  salesAccount: "",
  purchaseAccount: "",
  incomeAccount: "Sales",
  expenseAccount: "Cost of Goods Sold",
  availableQuantity: 0,
  trackInventory: false,
  inventoryAccount: "Inventory Asset",
  reorderPoint: 0,
};

export default function VendorItemsPage() {
  const { toast } = useToast();
  const { token } = useAuthStore();
  const [items, setItems] = useState<VendorItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<VendorItem | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<VendorItem | null>(null);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    fetchItems();
  }, [searchQuery, activeFilter, typeFilter, page]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (activeFilter === "Active") params.set("status", "active");
      if (activeFilter === "Inactive") params.set("status", "inactive");
      if (typeFilter !== "all") params.set("type", typeFilter);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("page", page.toString());
      params.set("limit", "50");

      const response = await fetch(`/api/vendor/items?${params.toString()}`, { headers });
      const result = await response.json();
      if (result.success) {
        setItems(result.data);
        setTotalItems(result.total || result.data.length);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async () => {
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Item name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setFormSubmitting(true);
      const url = editingItem ? `/api/vendor/items/${editingItem.id}` : "/api/vendor/items";
      const method = editingItem ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Success",
          description: editingItem ? "Item updated successfully" : "Item created successfully",
        });
        setShowFormDialog(false);
        fetchItems();
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save item",
        variant: "destructive",
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const response = await fetch(`/api/vendor/items/${itemToDelete.id}`, {
        method: "DELETE",
        headers,
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Success",
          description: "Item deleted successfully",
        });
        fetchItems();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    } finally {
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  const toggleItemStatus = async (item: VendorItem) => {
    try {
      const response = await fetch(`/api/vendor/items/${item.id}/status`, {
        method: "PATCH",
        headers,
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: "Success",
          description: `Item ${result.data.isActive ? "activated" : "deactivated"}`,
        });
        fetchItems();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-sidebar">Items & Services</h1>
          <p className="text-slate-500">Manage your products and services</p>
        </div>
        <Button
          onClick={() => {
            setEditingItem(null);
            setFormData(emptyForm);
            setShowFormDialog(true);
          }}
          className="bg-sidebar hover:bg-sidebar/90 text-white"
          data-testid="button-new-item"
        >
          <Plus className="mr-2 h-4 w-4" /> New Item
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex flex-1 min-w-[300px] items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search items by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => fetchItems()} data-testid="button-refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="flex gap-2">
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px]" data-testid="select-type-filter">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="goods">Goods</SelectItem>
              <SelectItem value="service">Service</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-sidebar" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-lg border-2 border-dashed">
          <p className="text-slate-500">No items found matching your criteria.</p>
          <Button
            variant="link"
            onClick={() => {
              setFormData(emptyForm);
              setShowFormDialog(true);
            }}
          >
            Create your first item
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-600 font-medium">
              <tr>
                <th className="px-4 py-3">NAME</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">TYPE</th>
                <th className="px-4 py-3">HSN/SAC</th>
                <th className="px-4 py-3">RATE</th>
                <th className="px-4 py-3">STOCK</th>
                <th className="px-4 py-3">STATUS</th>
                <th className="px-4 py-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-sidebar">{item.name}</td>
                  <td className="px-4 py-3 text-slate-500">{item.sku || "-"}</td>
                  <td className="px-4 py-3 uppercase text-[10px] font-bold">
                    <Badge variant="outline">{item.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{item.hsnSac || "-"}</td>
                  <td className="px-4 py-3">₹{parseFloat(item.rate || "0").toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {item.trackInventory ? (
                      <span className={item.availableQuantity <= (item.reorderPoint || 0) ? "text-red-600 font-bold" : ""}>
                        {item.availableQuantity} {item.unit}
                      </span>
                    ) : (
                      <span className="text-slate-400">Not tracked</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={item.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}>
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-actions-${item.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingItem(item);
                            setFormData({ ...emptyForm, ...item });
                            setShowFormDialog(true);
                          }}
                          data-testid={`menu-edit-${item.id}`}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleItemStatus(item)} data-testid={`menu-status-${item.id}`}>
                          Mark as {item.isActive ? "Inactive" : "Active"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => {
                            setItemToDelete(item);
                            setShowDeleteDialog(true);
                          }}
                          data-testid={`menu-delete-${item.id}`}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 bg-slate-50 border-t flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing {items.length} of {totalItems} items
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                data-testid="button-prev-page"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 50 >= totalItems}
                onClick={() => setPage(page + 1)}
                data-testid="button-next-page"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-form-title">{editingItem ? "Edit Item" : "New Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the item details below." : "Fill in the details to create a new item."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Item name"
                    data-testid="input-item-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="SKU"
                    data-testid="input-item-sku"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                    <SelectTrigger data-testid="select-item-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="goods">Goods</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={formData.unit} onValueChange={(val) => setFormData({ ...formData, unit: val })}>
                    <SelectTrigger data-testid="select-item-unit">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">pcs</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="mtr">mtr</SelectItem>
                      <SelectItem value="box">box</SelectItem>
                      <SelectItem value="nos">nos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Sales Information */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-sidebar uppercase tracking-wider">Sales Information</h4>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="taxable" 
                    checked={formData.taxable}
                    onCheckedChange={(checked) => setFormData({ ...formData, taxable: !!checked })}
                  />
                  <Label htmlFor="taxable" className="text-xs font-medium cursor-pointer">Taxable</Label>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rate">Selling Price (₹)</Label>
                  <Input
                    id="rate"
                    type="number"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    placeholder="0.00"
                    data-testid="input-item-rate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incomeAccount">Account</Label>
                  <Select value={formData.incomeAccount} onValueChange={(val) => setFormData({ ...formData, incomeAccount: val })}>
                    <SelectTrigger data-testid="select-income-account">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Other Income">Other Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salesDescription">Description</Label>
                <Textarea
                  id="salesDescription"
                  value={formData.salesDescription}
                  onChange={(e) => setFormData({ ...formData, salesDescription: e.target.value })}
                  placeholder="Description for invoices"
                  className="min-h-[80px]"
                  data-testid="textarea-sales-description"
                />
              </div>
            </div>

            {/* Purchase Information */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-bold text-sm text-sidebar uppercase tracking-wider">Purchase Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchaseRate">Cost Price (₹)</Label>
                  <Input
                    id="purchaseRate"
                    type="number"
                    value={formData.purchaseRate}
                    onChange={(e) => setFormData({ ...formData, purchaseRate: e.target.value })}
                    placeholder="0.00"
                    data-testid="input-purchase-rate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expenseAccount">Account</Label>
                  <Select value={formData.expenseAccount} onValueChange={(val) => setFormData({ ...formData, expenseAccount: val })}>
                    <SelectTrigger data-testid="select-expense-account">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cost of Goods Sold">Cost of Goods Sold</SelectItem>
                      <SelectItem value="Material Purchases">Material Purchases</SelectItem>
                      <SelectItem value="Operating Expenses">Operating Expenses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchaseDescription">Description</Label>
                <Textarea
                  id="purchaseDescription"
                  value={formData.purchaseDescription}
                  onChange={(e) => setFormData({ ...formData, purchaseDescription: e.target.value })}
                  placeholder="Description for bills"
                  className="min-h-[80px]"
                  data-testid="textarea-purchase-description"
                />
              </div>
            </div>

            {/* Inventory Tracking */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="trackInventory" 
                  checked={formData.trackInventory}
                  onCheckedChange={(checked) => setFormData({ ...formData, trackInventory: !!checked })}
                  data-testid="checkbox-track-inventory"
                />
                <Label htmlFor="trackInventory" className="font-bold text-sm text-sidebar uppercase tracking-wider cursor-pointer">Track Inventory for this item</Label>
              </div>
              
              {formData.trackInventory && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="space-y-2">
                    <Label htmlFor="inventoryAccount">Inventory Account</Label>
                    <Select value={formData.inventoryAccount} onValueChange={(val) => setFormData({ ...formData, inventoryAccount: val })}>
                      <SelectTrigger data-testid="select-inventory-account">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inventory Asset">Inventory Asset</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorderPoint">Reorder Point</Label>
                    <Input
                      id="reorderPoint"
                      type="number"
                      value={formData.reorderPoint}
                      onChange={(e) => setFormData({ ...formData, reorderPoint: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      data-testid="input-reorder-point"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="availableQuantity">Opening Stock</Label>
                    <Input
                      id="availableQuantity"
                      type="number"
                      value={formData.availableQuantity}
                      onChange={(e) => setFormData({ ...formData, availableQuantity: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      data-testid="input-opening-stock"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tax Information */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-bold text-sm text-sidebar uppercase tracking-wider">Tax Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hsnSac">HSN/SAC</Label>
                  <Input
                    id="hsnSac"
                    value={formData.hsnSac}
                    onChange={(e) => setFormData({ ...formData, hsnSac: e.target.value })}
                    placeholder="HSN/SAC code"
                    data-testid="input-hsn-sac"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxPreference">Tax Preference</Label>
                  <Select value={formData.taxPreference} onValueChange={(val) => setFormData({ ...formData, taxPreference: val })}>
                    <SelectTrigger data-testid="select-tax-preference">
                      <SelectValue placeholder="Select preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="taxable">Taxable</SelectItem>
                      <SelectItem value="non-taxable">Non-Taxable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t">
            <Button variant="outline" onClick={() => setShowFormDialog(false)} disabled={formSubmitting} data-testid="button-cancel">
              Cancel
            </Button>
            <Button onClick={handleFormSubmit} disabled={formSubmitting} className="bg-sidebar hover:bg-sidebar/90 text-white min-w-[100px]" data-testid="button-save">
              {formSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingItem ? "Update Item" : "Save Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)} data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
