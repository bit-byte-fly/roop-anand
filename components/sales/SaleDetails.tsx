"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Package,
  CreditCard,
  Banknote,
  Calendar,
  ImageOff,
} from "lucide-react";

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

interface SaleDetailsProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SaleDetails({ sale, isOpen, onClose }: SaleDetailsProps) {
  if (!sale) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-600" />
            Sale Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date and Payment */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(sale.createdAt), "MMMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                sale.paymentMethod === "Cash"
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {sale.paymentMethod === "Cash" ? (
                <Banknote className="h-4 w-4" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {sale.paymentMethod}
            </span>
          </div>

          {/* Employee */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-slate-500 mb-3">Sold By</h3>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {sale.employee?.profilePhoto && (
                  <AvatarImage src={sale.employee.profilePhoto} />
                )}
                <AvatarFallback className="bg-indigo-100 text-indigo-600">
                  {sale.employee?.fullName
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-slate-800">
                {sale.employee?.fullName}
              </span>
            </div>
          </Card>

          {/* Customer */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-slate-500 mb-3">
              Customer
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-slate-700">
                <User className="h-4 w-4 text-slate-400" />
                <span>{sale.customer.name}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{sale.customer.phone}</span>
              </div>
              {sale.customer.email && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>{sale.customer.email}</span>
                </div>
              )}
              {(sale.customer.billingAddress || sale.customer.address) && (
                <div className="flex items-center gap-2 text-slate-700 col-span-2">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{sale.customer.billingAddress || sale.customer.address}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Items */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-slate-500 mb-3">
              Items ({sale.items.length})
            </h3>
            <div className="space-y-3">
              {sale.items.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  <div className="h-12 w-12 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
                    {item.product?.photo ? (
                      <img
                        src={item.product.photo}
                        alt={item.productTitle}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageOff className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">
                      {item.productTitle}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatCurrency(item.pricePerUnit)} × {item.quantity}
                    </p>
                    {(item.gstRate || 0) > 0 && (
                      <p className="text-xs text-indigo-600">
                        {item.gstName || "GST"} {item.gstRate}% · {formatCurrency(item.gstAmount || 0)}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold text-slate-700">
                    {formatCurrency(item.totalPrice)}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-4 space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{formatCurrency(sale.subtotal ?? sale.totalAmount)}</span></div>
              <div className="flex justify-between text-sm text-slate-600"><span>GST</span><span>{formatCurrency(sale.totalGst || 0)}</span></div>
              <div className="flex justify-between items-center border-t pt-2"><span className="text-lg font-medium text-slate-600">Total Amount</span><span className="text-2xl font-bold text-indigo-600">{formatCurrency(sale.totalAmount)}</span></div>
            </div>
          </Card>

          {/* Close Button */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
