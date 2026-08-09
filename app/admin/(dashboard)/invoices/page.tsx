"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Loader2,
  FileText,
  Filter,
  X,
  Settings,
  IndianRupee,
  Clock,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { InvoiceList, Invoice } from "@/components/invoices/InvoiceList";
import {
  InvoiceForm,
  InvoiceFormData,
} from "@/components/invoices/InvoiceForm";
import { InvoicePreview } from "@/components/invoices/InvoicePreview";
import { OrganizationSettingsForm } from "@/components/invoices/OrganizationSettingsForm";
import { PermissionGate } from "@/components/ui/permission-gate";
import { toast } from "sonner";

type StatusFilter = "all" | "Draft" | "Sent" | "Paid" | "Overdue";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected invoice for edit/preview
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceFormData | null>(
    null
  );

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleCreate = () => {
    setEditingInvoice(null);
    setIsFormOpen(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice({
      _id: invoice._id,
      dateOfIssue: invoice.dateOfIssue,
      dueDate: invoice.dueDate,
      customer: invoice.customer,
      items: invoice.items.map((item) => ({
        ...item,
        product:
          typeof item.product === "string"
            ? item.product
            : (item.product as { _id?: string } | undefined)?._id,
      })),
      taxRate: invoice.taxRate || 0,
      discount: invoice.discount || 0,
      notes: invoice.notes || "",
      status: invoice.status,
    });
    setIsFormOpen(true);
  };

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPreviewOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Invoice deleted successfully");
        fetchInvoices();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete invoice");
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice");
    }
  };

  const handleSubmit = async (data: InvoiceFormData) => {
    setIsSubmitting(true);
    try {
      const url = editingInvoice?._id
        ? `/api/invoices/${editingInvoice._id}`
        : "/api/invoices";
      const method = editingInvoice?._id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success(
          editingInvoice?._id
            ? "Invoice updated successfully"
            : "Invoice created successfully"
        );
        setIsFormOpen(false);
        setEditingInvoice(null);
        fetchInvoices();
      } else {
        const error = await res.json();
        toast.error(error.error || "An error occurred");
      }
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.error("An error occurred while saving the invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate stats
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const paidAmount = invoices
    .filter((inv) => inv.status === "Paid")
    .reduce((sum, inv) => sum + inv.total, 0);
  const pendingAmount = invoices
    .filter((inv) => inv.status !== "Paid")
    .reduce((sum, inv) => sum + inv.amountDue, 0);
  const overdueCount = invoices.filter(
    (inv) => inv.status === "Overdue"
  ).length;

  const clearFilters = () => {
    setStatusFilter("all");
    setSearchQuery("");
  };

  const hasActiveFilters = statusFilter !== "all" || searchQuery;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-8"
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
            <h1 className="text-3xl font-bold text-slate-800">Invoices</h1>
            <p className="text-slate-600">
              Create and manage invoices
              {invoices.length > 0 && (
                <span className="ml-2 text-indigo-600 font-medium">
                  ({invoices.length} total)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PermissionGate module="invoices" action="orgSettings">
              <Button
                variant="outline"
                onClick={() => setIsSettingsOpen(true)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Organization</span>
              </Button>
            </PermissionGate>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleCreate}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
              >
                <Plus className="h-4 w-4" />
                New Invoice
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Invoiced</p>
                  <p className="text-lg font-bold text-slate-800">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Paid</p>
                  <p className="text-lg font-bold text-slate-800">
                    {formatCurrency(paidAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Pending</p>
                  <p className="text-lg font-bold text-slate-800">
                    {formatCurrency(pendingAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Overdue</p>
                  <p className="text-lg font-bold text-slate-800">
                    {overdueCount} invoice{overdueCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`gap-2 ${
                showFilters ? "bg-indigo-50 border-indigo-300" : ""
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 w-2 h-2 rounded-full bg-indigo-600"></span>
              )}
            </Button>
          </div>

          {/* Expanded Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 font-medium">
                      Status:
                    </span>
                    <Select
                      value={statusFilter}
                      onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                    >
                      <SelectTrigger className="w-32 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Sent">Sent</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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

        {/* Invoice List */}
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
              <p className="text-slate-500">Loading invoices...</p>
            </motion.div>
          ) : invoices.length === 0 && !hasActiveFilters ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200"
            >
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-indigo-600" />
              </div>
              <p className="text-slate-600 text-lg font-medium mb-2">
                No invoices yet
              </p>
              <p className="text-slate-400 text-sm mb-4">
                Get started by creating your first invoice
              </p>
              <Button
                onClick={handleCreate}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                New Invoice
              </Button>
            </motion.div>
          ) : invoices.length === 0 && hasActiveFilters ? (
            <motion.div
              key="no-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <Search className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-600 text-lg">No invoices found</p>
              <p className="text-slate-400 text-sm">
                Try different filters or search term
              </p>
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                Clear Filters
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <InvoiceList
                invoices={invoices}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invoice Form Modal */}
        <InvoiceForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingInvoice(null);
          }}
          onSubmit={handleSubmit}
          initialData={editingInvoice}
          isSubmitting={isSubmitting}
        />

        {/* Invoice Preview Modal */}
        <InvoicePreview
          invoice={selectedInvoice}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setSelectedInvoice(null);
          }}
        />

        {/* Organization Settings Modal */}
        <OrganizationSettingsForm
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSave={() => {
            toast.success("Organization settings saved");
          }}
        />
      </div>
    </motion.div>
  );
}
