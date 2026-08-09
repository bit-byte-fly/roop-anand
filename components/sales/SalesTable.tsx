"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Eye,
  Trash2,
  ShoppingBag,
  User,
  CreditCard,
  Banknote,
  ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface SalesTableProps {
  sales: Sale[];
  onView: (sale: Sale) => void;
  onDelete: (id: string) => void;
}

export function SalesTable({ sales, onView, onDelete }: SalesTableProps) {
  if (sales.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
            <ShoppingBag className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-slate-600">No sales found</p>
          <p className="text-sm text-slate-500">
            Click &quot;New Sale&quot; to create your first sale record
          </p>
        </div>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.3 },
    }),
  };

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead>Date</TableHead>
            <TableHead>Employee</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="hidden md:table-cell">Items</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Total</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale, index) => (
            <motion.tr
              key={sale._id}
              custom={index}
              variants={rowVariants}
              initial="hidden"
              animate="visible"
              className="border-b transition-colors hover:bg-slate-50/80"
            >
              <TableCell className="text-slate-600">
                <div>
                  <p className="font-medium">
                    {format(new Date(sale.createdAt), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-slate-400">
                    {format(new Date(sale.createdAt), "h:mm a")}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    {sale.employee?.profilePhoto && (
                      <AvatarImage src={sale.employee.profilePhoto} />
                    )}
                    <AvatarFallback className="text-xs bg-indigo-100 text-indigo-600">
                      {sale.employee?.fullName
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-slate-700 truncate max-w-[100px]">
                    {sale.employee?.fullName}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-slate-700 truncate max-w-[120px]">
                    {sale.customer.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {sale.customer.phone}
                  </p>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-1">
                  {sale.items.slice(0, 2).map((item, i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded bg-slate-100 overflow-hidden flex items-center justify-center"
                      title={`${item.productTitle} x${item.quantity}`}
                    >
                      {item.product?.photo ? (
                        <img
                          src={item.product.photo}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageOff className="h-3 w-3 text-slate-400" />
                      )}
                    </div>
                  ))}
                  {sale.items.length > 2 && (
                    <span className="text-xs text-slate-500 ml-1">
                      +{sale.items.length - 2}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    sale.paymentMethod === "Cash"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {sale.paymentMethod === "Cash" ? (
                    <Banknote className="h-3 w-3" />
                  ) : (
                    <CreditCard className="h-3 w-3" />
                  )}
                  {sale.paymentMethod}
                </span>
              </TableCell>
              <TableCell className="font-semibold text-slate-800">
                {formatCurrency(sale.totalAmount)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(sale)}
                      className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </motion.div>
                  <PermissionGate module="sales" action="delete">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(sale._id)}
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
