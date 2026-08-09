"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Loader2,
  Package,
  Filter,
  ArrowUpDown,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ProductForm } from "@/components/products/ProductForm";
import { ProductTable } from "@/components/products/ProductTable";
import { PermissionGate } from "@/components/ui/permission-gate";

interface Product {
  _id: string;
  photo?: string;
  title: string;
  description?: string;
  price: {
    base: number;
    lowestSellingPrice: number;
  };
  status: "Active" | "Inactive";
  stockQuantity: number;
  gst?: {
    _id: string;
    name: string;
    rate: number;
    status: "Active" | "Inactive";
  } | null;
  createdAt: string;
  updatedAt: string;
}

type SortField = "createdAt" | "title" | "stockQuantity" | "price";
type SortOrder = "asc" | "desc";
type StatusFilter = "all" | "Active" | "Inactive";
type StockFilter = "all" | "inStock" | "lowStock" | "outOfStock";

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter and Sort states
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showFilters, setShowFilters] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCreate = () => {
    setEditingProduct(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => {
      setEditingProduct(null);
    }, 200);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      const url = editingProduct
        ? `/api/products/${editingProduct._id}`
        : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        handleCloseDialog();
        fetchProducts();
      } else {
        const error = await res.json();
        alert(error.error || "An error occurred");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      alert("An error occurred while saving");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter and sort products
  const filteredAndSortedProducts = products
    .filter((product) => {
      // Search filter
      const matchesSearch =
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description &&
          product.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus =
        statusFilter === "all" || product.status === statusFilter;

      // Stock filter
      let matchesStock = true;
      if (stockFilter === "outOfStock") {
        matchesStock = product.stockQuantity === 0;
      } else if (stockFilter === "lowStock") {
        matchesStock = product.stockQuantity > 0 && product.stockQuantity < 10;
      } else if (stockFilter === "inStock") {
        matchesStock = product.stockQuantity >= 10;
      }

      return matchesSearch && matchesStatus && matchesStock;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "createdAt":
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "stockQuantity":
          comparison = a.stockQuantity - b.stockQuantity;
          break;
        case "price":
          comparison = a.price.base - b.price.base;
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

  const activeCount = products.filter((p) => p.status === "Active").length;
  const inactiveCount = products.filter((p) => p.status === "Inactive").length;
  const outOfStockCount = products.filter((p) => p.stockQuantity === 0).length;
  const lowStockCount = products.filter(
    (p) => p.stockQuantity > 0 && p.stockQuantity < 10
  ).length;

  const clearFilters = () => {
    setStatusFilter("all");
    setStockFilter("all");
    setSortField("createdAt");
    setSortOrder("desc");
    setSearchQuery("");
  };

  const hasActiveFilters =
    statusFilter !== "all" ||
    stockFilter !== "all" ||
    sortField !== "createdAt" ||
    sortOrder !== "desc" ||
    searchQuery;

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
            <h1 className="text-3xl font-bold text-slate-800">
              Products Management
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-1">
              <p className="text-slate-600">
                Manage your product inventory
                {products.length > 0 && (
                  <span className="ml-2 text-indigo-600 font-medium">
                    ({products.length} products)
                  </span>
                )}
              </p>
              {products.length > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-slate-600">{activeCount} Active</span>
                  </span>
                  {outOfStockCount > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="text-slate-600">
                        {outOfStockCount} Out of Stock
                      </span>
                    </span>
                  )}
                  {lowStockCount > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span className="text-slate-600">
                        {lowStockCount} Low Stock
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <PermissionGate module="products" action="create">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleCreate}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </motion.div>
          </PermissionGate>
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
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 transition-all focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
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
                  {/* Status Filter */}
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
                        <SelectItem value="Active">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Active
                          </span>
                        </SelectItem>
                        <SelectItem value="Inactive">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            Inactive
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stock Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 font-medium">
                      Stock:
                    </span>
                    <Select
                      value={stockFilter}
                      onValueChange={(v) => setStockFilter(v as StockFilter)}
                    >
                      <SelectTrigger className="w-36 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="inStock">In Stock (10+)</SelectItem>
                        <SelectItem value="lowStock">
                          Low Stock (&lt;10)
                        </SelectItem>
                        <SelectItem value="outOfStock">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort By */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 font-medium">
                      Sort by:
                    </span>
                    <Select
                      value={sortField}
                      onValueChange={(v) => setSortField(v as SortField)}
                    >
                      <SelectTrigger className="w-36 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdAt">Date Added</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="stockQuantity">Stock</SelectItem>
                        <SelectItem value="price">Price</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort Order */}
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

                  {/* Clear Filters */}
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
              <p className="text-slate-500">Loading products...</p>
            </motion.div>
          ) : filteredAndSortedProducts.length === 0 &&
            (searchQuery || statusFilter !== "all" || stockFilter !== "all") ? (
            <motion.div
              key="no-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <Search className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-600 text-lg">No products found</p>
              <p className="text-slate-400 text-sm">
                Try different filters or search term
              </p>
              <Button variant="outline" onClick={clearFilters} className="mt-4">
                Clear Filters
              </Button>
            </motion.div>
          ) : products.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200"
            >
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-indigo-600" />
              </div>
              <p className="text-slate-600 text-lg font-medium mb-2">
                No products yet
              </p>
              <p className="text-slate-400 text-sm mb-4">
                Get started by adding your first product
              </p>
              <PermissionGate module="products" action="create">
                <Button
                  onClick={handleCreate}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Product
                </Button>
              </PermissionGate>
            </motion.div>
          ) : (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ProductTable
                products={filteredAndSortedProducts}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? "Update the product details below."
                  : "Fill in the details below to add a new product to your inventory."}
              </DialogDescription>
            </DialogHeader>
            <ProductForm
              key={editingProduct?._id || "new"}
              product={editingProduct}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              onCancel={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
}
