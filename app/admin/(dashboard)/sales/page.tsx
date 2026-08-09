"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Loader2, ShoppingBag, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { SaleForm } from "@/components/sales/SaleForm";
import { SalesTable } from "@/components/sales/SalesTable";
import { SaleDetails } from "@/components/sales/SaleDetails";

interface SaleItem {
  product: {
    _id: string;
    title: string;
    photo?: string;
  };
  productTitle: string;
  quantity: number;
  pricePerUnit: number;
  taxableAmount?: number;
  gstName?: string;
  gstRate?: number;
  gstAmount?: number;
  totalPrice: number;
}

interface Sale {
  _id: string;
  employee: {
    _id: string;
    fullName: string;
    profilePhoto?: string;
  };
  items: SaleItem[];
  customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    billingAddress?: string;
  };
  paymentMethod: "Cash" | "Online";
  subtotal?: number;
  totalGst?: number;
  totalAmount: number;
  createdAt: string;
}

type PaymentFilter = "all" | "Cash" | "Online";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Filters
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sales");
      if (res.ok) {
        const data = await res.json();
        setSales(data);
      }
    } catch (error) {
      console.error("Error fetching sales:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleCreate = () => {
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
  };

  const handleView = (sale: Sale) => {
    setViewingSale(sale);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setTimeout(() => setViewingSale(null), 200);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sale record?")) return;

    try {
      const res = await fetch(`/api/sales/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchSales();
      }
    } catch (error) {
      console.error("Error deleting sale:", error);
    }
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        handleCloseForm();
        fetchSales();
      } else {
        const error = await res.json();
        alert(error.error || "An error occurred");
      }
    } catch (error) {
      console.error("Error creating sale:", error);
      alert("An error occurred while creating the sale");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter sales
  const filteredSales = sales.filter((sale) => {
    // Search filter
    const matchesSearch =
      sale.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customer.phone.includes(searchQuery) ||
      sale.employee?.fullName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());

    // Payment filter
    const matchesPayment =
      paymentFilter === "all" || sale.paymentMethod === paymentFilter;

    return matchesSearch && matchesPayment;
  });

  const cashTotal = sales
    .filter((s) => s.paymentMethod === "Cash")
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const onlineTotal = sales
    .filter((s) => s.paymentMethod === "Online")
    .reduce((sum, s) => sum + s.totalAmount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const clearFilters = () => {
    setPaymentFilter("all");
    setSearchQuery("");
  };

  const hasActiveFilters = paymentFilter !== "all" || searchQuery;

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
            <h1 className="text-3xl font-bold text-slate-800">Sales</h1>
            <div className="flex flex-wrap items-center gap-4 mt-1">
              <p className="text-slate-600">
                Manage sales records
                {sales.length > 0 && (
                  <span className="ml-2 text-indigo-600 font-medium">
                    ({sales.length} records)
                  </span>
                )}
              </p>
              {sales.length > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-slate-600">
                      Cash: {formatCurrency(cashTotal)}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="text-slate-600">
                      Online: {formatCurrency(onlineTotal)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={handleCreate}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
            >
              <Plus className="h-4 w-4" />
              New Sale
            </Button>
          </motion.div>
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
                placeholder="Search by customer or employee..."
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
                      Payment:
                    </span>
                    <Select
                      value={paymentFilter}
                      onValueChange={(v) =>
                        setPaymentFilter(v as PaymentFilter)
                      }
                    >
                      <SelectTrigger className="w-32 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Online">Online</SelectItem>
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
              <p className="text-slate-500">Loading sales...</p>
            </motion.div>
          ) : filteredSales.length === 0 && hasActiveFilters ? (
            <motion.div
              key="no-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <Search className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-600 text-lg">No sales found</p>
              <p className="text-slate-400 text-sm">
                Try different filters or search term
              </p>
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                Clear Filters
              </Button>
            </motion.div>
          ) : sales.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200"
            >
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="h-8 w-8 text-indigo-600" />
              </div>
              <p className="text-slate-600 text-lg font-medium mb-2">
                No sales yet
              </p>
              <p className="text-slate-400 text-sm mb-4">
                Get started by creating your first sale
              </p>
              <Button
                onClick={handleCreate}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                New Sale
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SalesTable
                sales={filteredSales}
                onView={handleView}
                onDelete={handleDelete}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Sale Dialog */}
        <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Create New Sale</DialogTitle>
              <DialogDescription>
                Select an employee, add products, and enter customer details.
              </DialogDescription>
            </DialogHeader>
            <SaleForm
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              onCancel={handleCloseForm}
            />
          </DialogContent>
        </Dialog>

        {/* Sale Details Dialog */}
        <SaleDetails
          sale={viewingSale}
          isOpen={isDetailsOpen}
          onClose={handleCloseDetails}
        />
      </div>
    </motion.div>
  );
}
