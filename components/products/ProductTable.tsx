"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import { Pencil, Trash2, Package, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
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

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
}

export function ProductTable({
  products,
  onEdit,
  onDelete,
  onToggleStatus,
}: ProductTableProps) {
  if (products.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
            <Package className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-slate-600">No products found</p>
          <p className="text-sm text-slate-500">
            Click &quot;Add Product&quot; to create your first product
          </p>
        </div>
      </Card>
    );
  }

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
      },
    }),
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="w-[80px]">Photo</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="hidden md:table-cell">Base Price</TableHead>
            <TableHead className="hidden md:table-cell">Min Price</TableHead>
            <TableHead className="hidden md:table-cell">GST</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead className="hidden lg:table-cell">Added</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product, index) => (
            <motion.tr
              key={product._id}
              custom={index}
              variants={rowVariants}
              initial="hidden"
              animate="visible"
              className="border-b transition-colors hover:bg-slate-50/80 data-[state=selected]:bg-slate-100"
            >
              <TableCell>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="relative"
                >
                  <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-100 ring-2 ring-white shadow-sm flex items-center justify-center">
                    {product.photo ? (
                      <img
                        src={product.photo}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageOff className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  {/* Status indicator */}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      product.status === "Active"
                        ? "bg-green-500"
                        : "bg-slate-400"
                    }`}
                  />
                </motion.div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-slate-800 line-clamp-1">
                    {product.title}
                  </p>
                  {product.description && (
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {product.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <PermissionGate
                  module="products"
                  action="toggleStatus"
                  fallback={
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        product.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          product.status === "Active"
                            ? "bg-green-500"
                            : "bg-slate-400"
                        }`}
                      />
                      {product.status}
                    </span>
                  }
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onToggleStatus(product._id, product.status)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                      product.status === "Active"
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        product.status === "Active"
                          ? "bg-green-500"
                          : "bg-slate-400"
                      }`}
                    />
                    {product.status}
                  </motion.button>
                </PermissionGate>
              </TableCell>
              <TableCell className="hidden md:table-cell text-slate-600 font-medium">
                {formatCurrency(product.price.base)}
              </TableCell>
              <TableCell className="hidden md:table-cell text-slate-500">
                {formatCurrency(product.price.lowestSellingPrice)}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                  {product.gst ? `${product.gst.name} (${product.gst.rate}%)` : "No GST"}
                </span>
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    product.stockQuantity === 0
                      ? "bg-red-100 text-red-700"
                      : product.stockQuantity < 10
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {product.stockQuantity}
                </span>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-slate-500">
                {format(new Date(product.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <PermissionGate module="products" action="update">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(product)}
                        className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </PermissionGate>
                  <PermissionGate module="products" action="delete">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(product._id)}
                        className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </PermissionGate>
                </div>
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
