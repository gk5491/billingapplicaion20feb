import { useState, useEffect, type MouseEvent } from "react";
import { Plus, MoreHorizontal, ChevronDown, ArrowUpDown, RefreshCw, Search, X } from "lucide-react";
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
  createdAt: string;
  updatedAt: string;
}

const emptyForm = {
  name: "",
  type: "goods",
  hsnSac: "",
  usageUnit: "",
  rate: "",
  purchaseRate: "",
  description: "",
  salesDescription: "",
  purchaseDescription: "",
  taxPreference: "taxable",
  intraStateTax: "",
  interStateTax: "",
  salesAccount: "",
  purchaseAccount: "",
  availableQuantity: 0,
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
      params.set("page", page.toString());
      params.set("limit", "50");

      const response = await fetch(`/api/vendor/items?${params.toString()}`, { headers });
      if (response.ok) {
        const result = await response.json();
        setItems(result.data?.items || []);
        setTotalItems(result.data?.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch vendor items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    const fieldA = (a as any)[sortBy] || "";
    const fieldB = (b as any)[sortBy] || "";
    if (fieldA < fieldB) return sortOrder === "asc" ? -1 : 1;
    if (fieldA > fieldB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map((item) => item.id));
    }
  };

  const toggleSelectItem = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter((i) => i !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setShowFormDialog(true);
  };

  const openEditDialog = (item: VendorItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name || "",
      type: item.type || "goods",
      hsnSac: item.hsnSac || "",
      usageUnit: item.usageUnit || "",
      rate: item.rate || "",
      purchaseRate: item.purchaseRate || "",
      description: item.description || "",
      salesDescription: item.salesDescription || "",
      purchaseDescription: item.purchaseDescription || "",
      taxPreference: item.taxPreference || "taxable",
      intraStateTax: item.intraStateTax || "",
      interStateTax: item.interStateTax || "",
      salesAccount: item.salesAccount || "",
      purchaseAccount: item.purchaseAccount || "",
      availableQuantity: item.availableQuantity ?? 0,
    });
    setShowFormDialog(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Validation Error", description: "Item name is required.", variant: "destructive" });
      return;
    }
    if (formData.availableQuantity < 0) {
      toast({ title: "Validation Error", description: "Available quantity cannot be negative.", variant: "destructive" });
      return;
    }

    setFormSubmitting(true);
    try {
      const url = editingItem ? `/api/vendor/items/${editingItem.id}` : "/api/vendor/items";
      const method = editingItem ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        toast({
          title: editingItem ? "Item Updated" : "Item Created",
          description: `"${formData.name}" has been ${editingItem ? "updated" : "created"} successfully.`,
        });
        setShowFormDialog(false);
        setEditingItem(null);
        setFormData(emptyForm);
        fetchItems();
      } else {
        const err = await response.json();
        throw new Error(err.message || "Failed to save item");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save item.", variant: "destructive" });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: VendorItem) => {
    try {
      const response = await fetch(`/api/vendor/items/${item.id}/status`, {
        method: "PATCH",
        headers,
      });
      if (response.ok) {
        toast({
          title: item.isActive ? "Item Deactivated" : "Item Activated",
          description: `"${item.name}" has been marked as ${item.isActive ? "inactive" : "active"}.`,
        });
        fetchItems();
      } else {
        throw new Error("Failed to toggle status");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update item status.", variant: "destructive" });
    }
  };

  const handleDeleteItem = (item: VendorItem) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const response = await fetch(`/api/vendor/items/${itemToDelete.id}`, {
        method: "DELETE",
        headers,
      });
      if (response.ok) {
        toast({ title: "Item Deleted", description: `"${itemToDelete.name}" has been deleted.` });
        setShowDeleteDialog(false);
        setItemToDelete(null);
        fetchItems();
      } else {
        throw new Error("Failed to delete item");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 w-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-10 min-h-[73px] h-auto px-6">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 text-lg font-bold text-sidebar hover:text-primary transition-colors text-left whitespace-normal font-display group"
                data-testid="dropdown-filter-items"
              >
                <span className="line-clamp-2">{activeFilter} Items</span>
                <ChevronDown className="h-4 w-4 text-sidebar/40 group-hover:text-primary shrink-0 transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => { setActiveFilter("All"); setPage(1); }} data-testid="filter-all">
                All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setActiveFilter("Active"); setPage(1); }} data-testid="filter-active">
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setActiveFilter("Inactive"); setPage(1); }} data-testid="filter-inactive">
                Inactive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setTypeFilter("goods"); setPage(1); }} data-testid="filter-goods">
                Goods
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setTypeFilter("service"); setPage(1); }} data-testid="filter-service">
                Services
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setTypeFilter("all"); setPage(1); }} data-testid="filter-all-types">
                All Types
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-9 w-48"
              data-testid="input-search-items"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-slate-400" />
              </button>
            )}
          </div>
          <Button
            onClick={openAddDialog}
            className="bg-sidebar hover:bg-sidebar/90 text-white gap-1 sm:gap-1.5 font-display font-semibold transition-all shadow-sm"
            data-testid="button-new-item"
          >
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-more-options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  Sort by
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => handleSort("name")}>Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort("rate")}>Rate</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort("availableQuantity")}>Available Qty</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort("hsnSac")}>HSN/SAC</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort("updatedAt")}>Last Modified</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={fetchItems}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-hide">
        {loading ? (
          <div className="p-8 text-center text-slate-500" data-testid="text-loading">Loading items...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500" data-testid="text-empty">
            <p>No items found.</p>
            <Button
              onClick={openAddDialog}
              className="mt-4 bg-sidebar hover:bg-sidebar/90 font-display font-semibold transition-all shadow-sm"
              data-testid="button-create-first-item"
            >
              <Plus className="h-4 w-4 mr-2" /> Create your first item
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm table-fixed border-separate border-spacing-0" data-testid="table-vendor-items">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="w-10 px-2 md:px-4 py-3 border-b text-center">
                  <Checkbox
                    checked={selectedItems.length === items.length && items.length > 0}
                    onCheckedChange={toggleSelectAll}
                    className="data-[state=checked]:bg-sidebar data-[state=checked]:border-sidebar border-slate-300"
                    data-testid="checkbox-select-all"
                  />
                </th>
                <th className="px-2 md:px-4 py-3 border-b text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider font-display">
                  NAME
                </th>
                <th className="hidden md:table-cell px-2 md:px-4 py-3 border-b text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider font-display">
                  TYPE
                </th>
                <th className="hidden lg:table-cell px-2 md:px-4 py-3 border-b text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider font-display">
                  HSN/SAC
                </th>
                <th className="px-2 md:px-4 py-3 border-b text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider font-display">
                  RATE
                </th>
                <th className="hidden md:table-cell px-2 md:px-4 py-3 border-b text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider font-display">
                  AVAIL. QTY
                </th>
                <th className="hidden lg:table-cell px-2 md:px-4 py-3 border-b text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider font-display">
                  STATUS
                </th>
                <th className="w-16 px-2 md:px-4 py-3 border-b text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider font-display">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {sortedItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 cursor-pointer transition-colors group"
                  onClick={() => openEditDialog(item)}
                  data-testid={`row-item-${item.id}`}
                >
                  <td className="px-2 md:px-4 py-3 border-b border-slate-100 text-center">
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => {}}
                      onClick={(e) => toggleSelectItem(item.id, e as MouseEvent)}
                      className="data-[state=checked]:bg-sidebar data-[state=checked]:border-sidebar border-slate-300"
                      data-testid={`checkbox-item-${item.id}`}
                    />
                  </td>
                  <td className="px-2 md:px-4 py-3 border-b border-slate-100">
                    <div className="text-sm font-medium text-sidebar group-hover:text-primary transition-colors truncate font-display" data-testid={`text-item-name-${item.id}`}>
                      {item.name}
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-2 md:px-4 py-3 border-b border-slate-100">
                    <div className="text-sm text-slate-600 capitalize" data-testid={`text-item-type-${item.id}`}>
                      {item.type || "-"}
                    </div>
                  </td>
                  <td className="hidden lg:table-cell px-2 md:px-4 py-3 border-b border-slate-100">
                    <div className="text-sm text-slate-900 font-display" data-testid={`text-item-hsn-${item.id}`}>
                      {item.hsnSac || "-"}
                    </div>
                  </td>
                  <td className="px-2 md:px-4 py-3 text-right border-b border-slate-100">
                    <div className="text-sm text-sidebar font-semibold font-display" data-testid={`text-item-rate-${item.id}`}>
                      {item.rate ? `₹${item.rate}` : "₹0.00"}
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-2 md:px-4 py-3 text-right border-b border-slate-100">
                    <div className="text-sm text-slate-900 font-display" data-testid={`text-item-qty-${item.id}`}>
                      {item.availableQuantity ?? 0}
                    </div>
                  </td>
                  <td className="hidden lg:table-cell px-2 md:px-4 py-3 border-b border-slate-100 text-center">
                    <Badge
                      variant={item.isActive !== false ? "default" : "secondary"}
                      className={item.isActive !== false ? "bg-green-100 text-green-800 no-default-hover-elevate no-default-active-elevate" : "bg-slate-100 text-slate-600 no-default-hover-elevate no-default-active-elevate"}
                      data-testid={`badge-status-${item.id}`}
                    >
                      {item.isActive !== false ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-2 md:px-4 py-3 border-b border-slate-100 text-center" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-actions-${item.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(item)} data-testid={`action-edit-${item.id}`}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(item)} data-testid={`action-toggle-${item.id}`}>
                          {item.isActive !== false ? "Mark Inactive" : "Mark Active"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteItem(item)}
                          className="text-red-600"
                          data-testid={`action-delete-${item.id}`}
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
        )}
      </div>

      {totalItems > 50 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white">
          <span className="text-sm text-slate-500" data-testid="text-pagination-info">
            Showing {(page - 1) * 50 + 1}-{Math.min(page * 50, totalItems)} of {totalItems}
          </span>
          <div className="flex items-center gap-2">
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
      )}

      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-form-title">{editingItem ? "Edit Item" : "New Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the item details below." : "Fill in the details to create a new item."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hsnSac">HSN/SAC</Label>
                <Input
                  id="hsnSac"
                  value={formData.hsnSac}
                  onChange={(e) => setFormData({ ...formData, hsnSac: e.target.value })}
                  placeholder="HSN/SAC code"
                  data-testid="input-item-hsnsac"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usageUnit">Usage Unit</Label>
                <Input
                  id="usageUnit"
                  value={formData.usageUnit}
                  onChange={(e) => setFormData({ ...formData, usageUnit: e.target.value })}
                  placeholder="e.g., pcs, kg, hrs"
                  data-testid="input-item-unit"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate">Selling Price / Rate</Label>
                <Input
                  id="rate"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  placeholder="0.00"
                  type="number"
                  data-testid="input-item-rate"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchaseRate">Cost Price / Purchase Rate</Label>
                <Input
                  id="purchaseRate"
                  value={formData.purchaseRate}
                  onChange={(e) => setFormData({ ...formData, purchaseRate: e.target.value })}
                  placeholder="0.00"
                  type="number"
                  data-testid="input-item-purchase-rate"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="availableQuantity">Available Quantity *</Label>
              <Input
                id="availableQuantity"
                value={formData.availableQuantity}
                onChange={(e) => setFormData({ ...formData, availableQuantity: Number(e.target.value) || 0 })}
                placeholder="0"
                type="number"
                min="0"
                data-testid="input-item-available-qty"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="General description"
                rows={2}
                data-testid="input-item-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salesDescription">Sales Description</Label>
                <Textarea
                  id="salesDescription"
                  value={formData.salesDescription}
                  onChange={(e) => setFormData({ ...formData, salesDescription: e.target.value })}
                  placeholder="Sales description"
                  rows={2}
                  data-testid="input-item-sales-desc"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchaseDescription">Purchase Description</Label>
                <Textarea
                  id="purchaseDescription"
                  value={formData.purchaseDescription}
                  onChange={(e) => setFormData({ ...formData, purchaseDescription: e.target.value })}
                  placeholder="Purchase description"
                  rows={2}
                  data-testid="input-item-purchase-desc"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxPreference">Tax Preference</Label>
                <Select value={formData.taxPreference} onValueChange={(val) => setFormData({ ...formData, taxPreference: val })}>
                  <SelectTrigger data-testid="select-tax-preference">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="taxable">Taxable</SelectItem>
                    <SelectItem value="non-taxable">Non-Taxable</SelectItem>
                    <SelectItem value="exempt">Exempt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="intraStateTax">Intra-State Tax</Label>
                <Input
                  id="intraStateTax"
                  value={formData.intraStateTax}
                  onChange={(e) => setFormData({ ...formData, intraStateTax: e.target.value })}
                  placeholder="e.g., GST18"
                  data-testid="input-intra-tax"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interStateTax">Inter-State Tax</Label>
                <Input
                  id="interStateTax"
                  value={formData.interStateTax}
                  onChange={(e) => setFormData({ ...formData, interStateTax: e.target.value })}
                  placeholder="e.g., IGST18"
                  data-testid="input-inter-tax"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salesAccount">Sales Account</Label>
                <Input
                  id="salesAccount"
                  value={formData.salesAccount}
                  onChange={(e) => setFormData({ ...formData, salesAccount: e.target.value })}
                  placeholder="Sales account"
                  data-testid="input-sales-account"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchaseAccount">Purchase Account</Label>
                <Input
                  id="purchaseAccount"
                  value={formData.purchaseAccount}
                  onChange={(e) => setFormData({ ...formData, purchaseAccount: e.target.value })}
                  placeholder="Purchase account"
                  data-testid="input-purchase-account"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)} data-testid="button-cancel-form">
              Cancel
            </Button>
            <Button
              onClick={handleFormSubmit}
              disabled={formSubmitting}
              className="bg-sidebar hover:bg-sidebar/90"
              data-testid="button-save-item"
            >
              {formSubmitting ? "Saving..." : editingItem ? "Update Item" : "Create Item"}
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
