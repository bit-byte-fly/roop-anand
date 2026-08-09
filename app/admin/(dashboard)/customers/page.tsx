"use client";

import React from "react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  UserCircle,
  Filter,
  ArrowUpDown,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit3,
  Trash2,
  ShoppingCart,
  Clock,
  CheckCircle,
  UserCheck,
  Truck,
  Eye,
  Lock,
  Save,
  Package,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProductInRequest {
  product: {
    _id: string;
    title: string;
    photo?: string;
    price?: { base: number };
  };
  quantity: number;
}

interface CustomerRequest {
  _id: string;
  products: ProductInRequest[];
  status: "pending" | "assigned" | "ongoing" | "delivered";
  customerDetails: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  _id: string;
  deviceId?: string;
  email?: string;
  name: string;
  phone: string;
  address?: string;
  authType: "guest" | "registered";
  createdAt: string;
  updatedAt: string;
  requestCount?: number;
}

type SortField = "createdAt" | "name";
type SortOrder = "asc" | "desc";

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-100 text-amber-700",
  },
  assigned: {
    label: "Assigned",
    icon: UserCheck,
    className: "bg-purple-100 text-purple-700",
  },
  ongoing: {
    label: "Ongoing",
    icon: Truck,
    className: "bg-blue-100 text-blue-700",
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle,
    className: "bg-green-100 text-green-700",
  },
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [customerRequests, setCustomerRequests] = useState<CustomerRequest[]>(
    []
  );
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<CustomerRequest | null>(null);
  const [isRequestDetailsOpen, setIsRequestDetailsOpen] = useState(false);
  const [isUpdatingRequest, setIsUpdatingRequest] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    password: "",
  });

  // Sort states
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showFilters, setShowFilters] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      params.append("sortBy", sortField);
      params.append("sortOrder", sortOrder);

      const res = await fetch(`/api/customers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, sortField, sortOrder]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleViewDetails = async (customer: Customer) => {
    try {
      const res = await fetch(`/api/customers/${customer._id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCustomer(data.customer);
        setCustomerRequests(data.requests || []);
        setEditForm({
          name: data.customer.name || "",
          phone: data.customer.phone || "",
          email: data.customer.email || "",
          address: data.customer.address || "",
          password: "",
        });
        setIsEditing(false);
        setIsDetailsOpen(true);
      }
    } catch (error) {
      console.error("Error fetching customer details:", error);
      toast.error("Failed to fetch customer details");
    }
  };

  const handleSave = async () => {
    if (!selectedCustomer) return;

    setIsSaving(true);
    try {
      const updateData: Record<string, string> = {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email,
        address: editForm.address,
      };

      if (editForm.password && editForm.password.length >= 6) {
        updateData.password = editForm.password;
      }

      const res = await fetch(`/api/customers/${selectedCustomer._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Customer updated successfully");
        setSelectedCustomer(data.customer);
        setIsEditing(false);
        setEditForm((prev) => ({ ...prev, password: "" }));
        fetchCustomers();
      } else {
        toast.error(data.message || "Failed to update customer");
      }
    } catch (error) {
      console.error("Error updating customer:", error);
      toast.error("Failed to update customer");
    } finally {
      setIsSaving(false);
    }
  };

  // Show delete confirmation
  const showDeleteConfirm = (id: string) => {
    setCustomerToDelete(id);
    setDeleteConfirmOpen(true);
  };

  // Actually delete the customer
  const confirmDelete = async () => {
    if (!customerToDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/customers/${customerToDelete}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Customer deleted successfully");
        if (selectedCustomer?._id === customerToDelete) {
          setIsDetailsOpen(false);
          setSelectedCustomer(null);
        }
        fetchCustomers();
      } else {
        toast.error(data.message || "Failed to delete customer");
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error("Failed to delete customer");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setCustomerToDelete(null);
    }
  };

  const clearFilters = () => {
    setSortField("createdAt");
    setSortOrder("desc");
    setSearchQuery("");
  };

  const hasActiveFilters =
    sortField !== "createdAt" || sortOrder !== "desc" || searchQuery;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getProductNames = (products: ProductInRequest[]) => {
    return products.map((p) => p.product.title).join(", ");
  };

  const getProductImages = (products: ProductInRequest[]) => {
    return products.filter((p) => p.product.photo).map((p) => p.product.photo!);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Customers
            </h1>
            <p className="text-slate-600 mt-2">
              Manage customer records
              {customers.length > 0 && (
                <span className="ml-2 text-indigo-600 font-medium">
                  ({customers.length} total)
                </span>
              )}
            </p>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-slate-200 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`gap-2 bg-white ${
                showFilters
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                  : ""
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 w-2 h-2 rounded-full bg-indigo-600"></span>
              )}
            </Button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 font-medium">
                      Sort by:
                    </span>
                    <Select
                      value={sortField}
                      onValueChange={(v) => setSortField(v as SortField)}
                    >
                      <SelectTrigger className="w-36 bg-slate-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdAt">Date Added</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                    }
                    className="gap-2"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    {sortOrder === "asc" ? "Ascending" : "Descending"}
                  </Button>

                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="gap-1 text-slate-500 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Table */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
              <p className="text-slate-500">Loading customers...</p>
            </motion.div>
          ) : customers.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                <UserCircle className="h-10 w-10 text-indigo-600" />
              </div>
              <p className="text-slate-700 text-lg font-semibold mb-2">
                No customers yet
              </p>
              <p className="text-slate-400 text-sm">
                Customers will appear here when they sign up via the mobile app
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100">
                      <TableHead className="font-semibold text-slate-700">
                        Name
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        Contact
                      </TableHead>
                      <TableHead className="font-semibold text-slate-700">
                        Joined
                      </TableHead>
                      <TableHead className="text-right font-semibold text-slate-700">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer, index) => (
                      <motion.tr
                        key={customer._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-slate-50/50 transition-colors border-b border-slate-100"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
                              {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">
                                {customer.name}
                              </p>
                              {customer.address && (
                                <p className="text-sm text-slate-500 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {customer.address.substring(0, 30)}
                                  {customer.address.length > 30 && "..."}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm text-slate-700 flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-slate-400" />
                              {customer.phone}
                            </p>
                            {customer.email && (
                              <p className="text-sm text-slate-500 flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 text-slate-400" />
                                {customer.email}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-slate-600">
                            {formatDate(customer.createdAt)}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
                              onClick={() => handleViewDetails(customer)}
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => showDeleteConfirm(customer._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Delete Customer?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this customer and all their product
                requests. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Customer Details Modal */}
        <Dialog
          open={isDetailsOpen}
          onOpenChange={(open) => {
            setIsDetailsOpen(open);
            if (!open) setIsEditing(false);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Customer Details
                </span>
                {selectedCustomer && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedCustomer && (
              <div className="space-y-6">
                {/* Customer Avatar */}
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800">
                      {selectedCustomer.name}
                    </h3>
                    <p className="text-slate-500 text-sm">
                      Customer since {formatDate(selectedCustomer.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Edit Form or Details */}
                {isEditing ? (
                  <div className="space-y-4 p-4 bg-slate-50 rounded-xl">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="name"
                          className="text-slate-700 font-medium"
                        >
                          Name *
                        </Label>
                        <Input
                          id="name"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="phone"
                          className="text-slate-700 font-medium"
                        >
                          Phone *
                        </Label>
                        <Input
                          id="phone"
                          value={editForm.phone}
                          onChange={(e) =>
                            setEditForm({ ...editForm, phone: e.target.value })
                          }
                          className="bg-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-slate-700 font-medium"
                      >
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm({ ...editForm, email: e.target.value })
                        }
                        className="bg-white"
                        placeholder="customer@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="address"
                        className="text-slate-700 font-medium"
                      >
                        Address
                      </Label>
                      <Textarea
                        id="address"
                        value={editForm.address}
                        onChange={(e) =>
                          setEditForm({ ...editForm, address: e.target.value })
                        }
                        className="bg-white resize-none"
                        rows={2}
                        placeholder="Full address"
                      />
                    </div>
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <Label
                        htmlFor="password"
                        className="text-slate-700 font-medium flex items-center gap-2"
                      >
                        <Lock className="h-4 w-4" />
                        New Password
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={editForm.password}
                        onChange={(e) =>
                          setEditForm({ ...editForm, password: e.target.value })
                        }
                        className="bg-white"
                        placeholder="Min 6 characters (leave empty to keep current)"
                      />
                      <p className="text-xs text-slate-500">
                        Leave empty to keep the current password
                      </p>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 gap-1.5"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                        <Phone className="h-4 w-4" />
                        Phone
                      </div>
                      <p className="font-semibold text-slate-700">
                        {selectedCustomer.phone}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                        <Mail className="h-4 w-4" />
                        Email
                      </div>
                      <p className="font-semibold text-slate-700">
                        {selectedCustomer.email || "Not provided"}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl col-span-2">
                      <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                        <MapPin className="h-4 w-4" />
                        Address
                      </div>
                      <p className="font-semibold text-slate-700">
                        {selectedCustomer.address || "Not provided"}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl col-span-2">
                      <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                        <Calendar className="h-4 w-4" />
                        Member Since
                      </div>
                      <p className="font-semibold text-slate-700">
                        {formatDateTime(selectedCustomer.createdAt)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Customer Requests */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-indigo-600" />
                    <h4 className="font-bold text-slate-800">
                      Product Requests ({customerRequests.length})
                    </h4>
                  </div>

                  {customerRequests.length === 0 ? (
                    <div className="p-6 bg-slate-50 rounded-xl text-center">
                      <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">No requests yet</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {customerRequests.map((request) => {
                        const StatusIcon = statusConfig[request.status].icon;
                        const productImages = getProductImages(
                          request.products
                        );
                        const productNames = getProductNames(request.products);

                        return (
                          <motion.div
                            key={request._id}
                            whileHover={{ scale: 1.01 }}
                            className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsRequestDetailsOpen(true);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                {/* Overlapped Product Images */}
                                <div className="flex items-center">
                                  {productImages.length > 0 ? (
                                    <div className="flex -space-x-3">
                                      {productImages
                                        .slice(0, 3)
                                        .map((photo, idx) => (
                                          <div
                                            key={idx}
                                            className="w-12 h-12 rounded-lg border-2 border-white shadow-md overflow-hidden"
                                            style={{ zIndex: 10 - idx }}
                                          >
                                            <img
                                              src={photo}
                                              alt="Product"
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                        ))}
                                      {productImages.length > 3 && (
                                        <div
                                          className="w-12 h-12 rounded-lg border-2 border-white shadow-md bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-sm"
                                          style={{ zIndex: 7 }}
                                        >
                                          +{productImages.length - 3}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                                      <Package className="h-6 w-6 text-indigo-600" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p
                                    className="font-semibold text-slate-800 truncate max-w-[200px]"
                                    title={productNames}
                                  >
                                    {productNames}
                                  </p>
                                  <p className="text-sm text-slate-500">
                                    {formatDate(request.createdAt)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                    statusConfig[request.status].className
                                  }`}
                                >
                                  <StatusIcon className="h-3.5 w-3.5" />
                                  {statusConfig[request.status].label}
                                </span>
                                <Eye className="h-4 w-4 text-slate-400" />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Delete Button */}
                <div className="pt-4 border-t border-slate-200 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => showDeleteConfirm(selectedCustomer._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Customer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Request Details Modal */}
        <Dialog
          open={isRequestDetailsOpen}
          onOpenChange={setIsRequestDetailsOpen}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Request Details
              </DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 font-medium">
                    Update Status
                  </span>
                  <Select
                    value={selectedRequest.status}
                    onValueChange={async (
                      value:
                        | "pending"
                        | "assigned"
                        | "ongoing"
                        | "delivered"
                    ) => {
                      setIsUpdatingRequest(true);
                      try {
                        const res = await fetch(
                          `/api/product-requests/${selectedRequest._id}`,
                          {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: value }),
                          }
                        );
                        const data = await res.json();
                        if (res.ok && data.success) {
                          toast.success("Request status updated");
                          setSelectedRequest({
                            ...selectedRequest,
                            status: value,
                            updatedAt: new Date().toISOString(),
                          });
                          setCustomerRequests(
                            customerRequests.map((r) =>
                              r._id === selectedRequest._id
                                ? {
                                    ...r,
                                    status: value,
                                    updatedAt: new Date().toISOString(),
                                  }
                                : r
                            )
                          );
                        } else {
                          toast.error(
                            data.message || "Failed to update status"
                          );
                        }
                      } catch (error) {
                        console.error("Error updating request:", error);
                        toast.error("Failed to update status");
                      } finally {
                        setIsUpdatingRequest(false);
                      }
                    }}
                    disabled={isUpdatingRequest}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold ${
                            statusConfig[selectedRequest.status].className
                          }`}
                        >
                          {React.createElement(
                            statusConfig[selectedRequest.status].icon,
                            { className: "h-3 w-3" }
                          )}
                          {statusConfig[selectedRequest.status].label}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-amber-600" />
                          Pending
                        </span>
                      </SelectItem>
                      <SelectItem value="ongoing">
                        <span className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-blue-600" />
                          Ongoing
                        </span>
                      </SelectItem>
                      <SelectItem value="assigned">
                        <span className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-purple-600" />
                          Assigned
                        </span>
                      </SelectItem>
                      <SelectItem value="delivered">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Delivered
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {isUpdatingRequest && (
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-slate-800 mb-3">
                    Products
                  </h4>
                  <div className="space-y-2">
                    {selectedRequest.products.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
                      >
                        {item.product.photo ? (
                          <img
                            src={item.product.photo}
                            alt={item.product.title}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-slate-200 rounded-lg flex items-center justify-center">
                            <Package className="h-5 w-5 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">
                            {item.product.title}
                          </p>
                          <p className="text-sm text-slate-500">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        {item.product.price && (
                          <p className="font-bold text-indigo-600">
                            ₹{item.product.price.base}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* {selectedRequest.notes && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-sm font-medium text-amber-800">Notes</p>
                    <p className="text-amber-700">{selectedRequest.notes}</p>
                  </div>
                )} */}

                <div className="text-sm flex justify-between items-center text-slate-500 pt-2 border-t border-slate-200">
                  <p>Created: {formatDateTime(selectedRequest.createdAt)}</p>
                  <p>Updated: {formatDateTime(selectedRequest.updatedAt)}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
}
