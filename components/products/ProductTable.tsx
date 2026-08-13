"use client";

import { format } from "date-fns";
import { ImageOff, Package, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DataTable,
  type DataTableColumnDef,
} from "@/components/ui/data-table";
import { PermissionGate } from "@/components/ui/permission-gate";

interface Product {
  _id: string;
  photo?: string;
  title: string;
  description?: string;
  price: { base: number; lowestSellingPrice: number };
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

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

export function ProductTable({
  products,
  onEdit,
  onDelete,
  onToggleStatus,
}: ProductTableProps) {
  const columns: DataTableColumnDef<Product>[] = [
    {
      id: "photo",
      header: "Photo",
      enableSorting: false,
      meta: { className: "w-[80px]" },
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-slate-100 ring-2 ring-white shadow-sm flex items-center justify-center">
            {product.photo ? (
              <img src={product.photo} alt={product.title} className="h-full w-full object-cover" />
            ) : (
              <ImageOff className="h-5 w-5 text-slate-400" />
            )}
            <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${product.status === "Active" ? "bg-green-500" : "bg-slate-400"}`} />
          </div>
        );
      },
    },
    {
      id: "title",
      accessorFn: (product) => product.title,
      header: "Title",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-slate-800 line-clamp-1">{row.original.title}</p>
          {row.original.description && <p className="text-xs text-slate-500 line-clamp-1">{row.original.description}</p>}
        </div>
      ),
    },
    {
      id: "status",
      accessorFn: (product) => product.status,
      header: "Status",
      meta: { className: "w-[100px]" },
      cell: ({ row }) => {
        const product = row.original;
        const badge = (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${product.status === "Active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
            <span className={`h-2 w-2 rounded-full ${product.status === "Active" ? "bg-green-500" : "bg-slate-400"}`} />
            {product.status}
          </span>
        );
        return (
          <PermissionGate module="products" action="toggleStatus" fallback={badge}>
            <button onClick={() => onToggleStatus(product._id, product.status)} className="cursor-pointer">{badge}</button>
          </PermissionGate>
        );
      },
    },
    {
      id: "basePrice",
      accessorFn: (product) => product.price.base,
      header: "Base Price",
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => <span className="font-medium text-slate-600">{formatCurrency(row.original.price.base)}</span>,
    },
    {
      id: "minPrice",
      accessorFn: (product) => product.price.lowestSellingPrice,
      header: "Min Price",
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => <span className="text-slate-500">{formatCurrency(row.original.price.lowestSellingPrice)}</span>,
    },
    {
      id: "gst",
      accessorFn: (product) => product.gst?.rate ?? -1,
      header: "GST",
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{row.original.gst ? `${row.original.gst.name} (${row.original.gst.rate}%)` : "No GST"}</span>,
    },
    {
      id: "stock",
      accessorFn: (product) => product.stockQuantity,
      header: "Stock",
      cell: ({ row }) => {
        const stock = row.original.stockQuantity;
        return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${stock === 0 ? "bg-red-100 text-red-700" : stock < 10 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{stock}</span>;
      },
    },
    {
      id: "createdAt",
      accessorFn: (product) => new Date(product.createdAt).getTime(),
      header: "Added",
      meta: { className: "hidden lg:table-cell" },
      cell: ({ row }) => <span className="text-slate-500">{format(new Date(row.original.createdAt), "MMM d, yyyy")}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      meta: { className: "text-right" },
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <PermissionGate module="products" action="update">
            <Button variant="ghost" size="icon" onClick={() => onEdit(row.original)} className="h-8 w-8 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"><Pencil className="h-4 w-4" /></Button>
          </PermissionGate>
          <PermissionGate module="products" action="delete">
            <Button variant="ghost" size="icon" onClick={() => onDelete(row.original._id)} className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  const emptyState = (
    <Card className="p-12 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100"><Package className="h-6 w-6 text-slate-400" /></div>
        <p className="text-slate-600">No products found</p>
        <p className="text-sm text-slate-500">Click &quot;Add Product&quot; to create your first product</p>
      </div>
    </Card>
  );

  return <DataTable columns={columns} data={products} title="Products" emptyState={emptyState} getRowId={(product) => product._id} />;
}
