"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import type { PaginationState, SortingState } from "@tanstack/react-table";
import {
  Banknote,
  CreditCard,
  Download,
  Eye,
  ImageOff,
  Loader2,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DataTable,
  DataTableColumnDef,
} from "@/components/ui/data-table";
import { PermissionGate } from "@/components/ui/permission-gate";
import { downloadSaleInvoice } from "@/components/sales/SaleDetails";

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

interface SalePayment {
  amount: number;
  method: "Cash" | "Online";
  collectedAt: string;
}

export interface Sale {
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
  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus?: "Paid" | "Partial" | "Unpaid";
  payments?: SalePayment[];
  createdAt: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);

const getCollectedAmount = (sale: Sale) => {
  const payments = sale.payments || [];
  const historyTotal = payments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const isLegacyPaidSale =
    (sale.paymentStatus === "Paid" || sale.paymentStatus === undefined) &&
    (sale.paidAmount === 0 || sale.paidAmount === undefined) &&
    payments.length === 0;
  return isLegacyPaidSale
    ? sale.totalAmount
    : (sale.paidAmount ?? historyTotal);
};

interface SalesTableProps {
  sales: Sale[];
  pagination: PaginationState;
  sorting: SortingState;
  total: number;
  onPaginationChange: (pagination: PaginationState) => void;
  onSortingChange: (sorting: SortingState) => void;
  onView: (sale: Sale) => void;
  onDelete: (id: string) => void;
}

export function SalesTable({
  sales,
  pagination,
  sorting,
  total,
  onPaginationChange,
  onSortingChange,
  onView,
  onDelete,
}: SalesTableProps) {
  const [downloadingSaleId, setDownloadingSaleId] = useState<string | null>(
    null,
  );

  const handleDownloadInvoice = useCallback(async (sale: Sale) => {
    if (downloadingSaleId) return;
    setDownloadingSaleId(sale._id);
    try {
      await downloadSaleInvoice(sale);
    } finally {
      setDownloadingSaleId(null);
    }
  }, [downloadingSaleId]);

  const columns = useMemo<DataTableColumnDef<Sale>[]>(
    () => [
      {
        id: "date",
        accessorFn: (sale) => new Date(sale.createdAt).getTime(),
        header: "Date",
        cell: ({ row }) => (
          <div className="text-slate-600">
            <p className="font-medium">
              {format(new Date(row.original.createdAt), "MMM d, yyyy")}
            </p>
            <p className="text-xs text-slate-400">
              {format(new Date(row.original.createdAt), "h:mm a")}
            </p>
          </div>
        ),
      },
      {
        id: "employee",
        accessorFn: (sale) => sale.employee?.fullName || "",
        header: "Employee",
        cell: ({ row }) => {
          const employee = row.original.employee;
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                {employee?.profilePhoto && (
                  <AvatarImage src={employee.profilePhoto} />
                )}
                <AvatarFallback className="bg-indigo-100 text-xs text-indigo-600">
                  {employee?.fullName
                    ?.split(" ")
                    .map((name) => name[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[100px] truncate text-sm font-medium text-slate-700">
                {employee?.fullName}
              </span>
            </div>
          );
        },
      },
      {
        id: "customer",
        accessorFn: (sale) => sale.customer.name,
        header: "Customer",
        cell: ({ row }) => (
          <div>
            <p className="max-w-[120px] truncate font-medium text-slate-700">
              {row.original.customer.name}
            </p>
            <p className="text-xs text-slate-500">
              {row.original.customer.phone}
            </p>
          </div>
        ),
      },
      {
        id: "items",
        header: "Items",
        enableSorting: false,
        meta: { className: "hidden md:table-cell" },
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {row.original.items.slice(0, 2).map((item, index) => (
              <div
                key={`${item.productTitle}-${index}`}
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-slate-100"
                title={`${item.productTitle} x${item.quantity}`}
              >
                {item.product?.photo ? (
                  <img
                    src={item.product.photo}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageOff className="h-3 w-3 text-slate-400" />
                )}
              </div>
            ))}
            {row.original.items.length > 2 && (
              <span className="ml-1 text-xs text-slate-500">
                +{row.original.items.length - 2}
              </span>
            )}
          </div>
        ),
      },
      {
        id: "payment",
        accessorKey: "paymentMethod",
        header: "Payment",
        enableSorting: false,
        cell: ({ row }) => {
          const cash = row.original.paymentMethod === "Cash";
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                cash
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {cash ? (
                <Banknote className="h-3 w-3" />
              ) : (
                <CreditCard className="h-3 w-3" />
              )}
              {row.original.paymentMethod}
            </span>
          );
        },
      },
      {
        id: "total",
        accessorKey: "totalAmount",
        header: "Total",
        cell: ({ row }) => (
          <span className="font-semibold text-slate-800">
            {formatCurrency(row.original.totalAmount)}
          </span>
        ),
      },
      {
        id: "collected",
        accessorFn: getCollectedAmount,
        header: "Collected",
        cell: ({ row }) => {
          const collected = getCollectedAmount(row.original);
          const due = Math.max(0, row.original.totalAmount - collected);
          return (
            <div>
              <p className="font-semibold text-emerald-700">
                {formatCurrency(collected)}
              </p>
              {due > 0 && (
                <p className="text-xs text-amber-600">
                  {formatCurrency(due)} due
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        meta: { className: "text-right" },
        cell: ({ row }) => {
          const sale = row.original;
          return (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onView(sale)}
                title="View sale"
                className="h-8 w-8 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDownloadInvoice(sale)}
                disabled={downloadingSaleId !== null}
                title="Download invoice"
                className="h-8 w-8 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
              >
                {downloadingSaleId === sale._id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              <PermissionGate module="sales" action="delete">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(sale._id)}
                  title="Delete sale"
                  className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </PermissionGate>
            </div>
          );
        },
      },
    ],
    [downloadingSaleId, handleDownloadInvoice, onDelete, onView],
  );

  const emptyState = (
    <Card className="p-12 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <ShoppingBag className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-slate-600">No sales found</p>
      </div>
    </Card>
  );

  return (
    <DataTable
      columns={columns}
      data={sales}
      title="Sales records"
      emptyState={emptyState}
      getRowId={(sale) => sale._id}
      serverState={{
        pagination,
        rowCount: total,
        sorting,
        onPaginationChange,
        onSortingChange,
      }}
    />
  );
}
