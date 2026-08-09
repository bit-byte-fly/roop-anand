"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Pencil,
  Package,
  Banknote,
  CreditCard,
  Wallet,
  TrendingUp,
  ImageOff,
  ShoppingBag,
  Plus,
  MapPin,
} from "lucide-react";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { ProductAssignment } from "@/components/employees/ProductAssignment";
import { EmployeeSales } from "@/components/employees/EmployeeSales";

interface Product {
  _id: string;
  title: string;
  photo?: string;
  price: {
    base: number;
    lowestSellingPrice: number;
  };
}

interface EmployeeProduct {
  _id: string;
  product: Product;
  quantity: number;
  assignedAt: string;
}

interface Employee {
  _id: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  gender: "Male" | "Female" | "Other";
  age: number;
  dateOfJoining: string;
  profilePhoto?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  status: "Online" | "Offline";
  products: EmployeeProduct[];
  holdings: {
    cash: number;
    online: number;
    total: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Sale {
  _id: string;
  items: { productTitle: string; quantity: number; totalPrice: number }[];
  customer: { name: string; phone: string };
  paymentMethod: "Cash" | "Online";
  totalAmount: number;
  createdAt: string;
}

export default function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchEmployeeDetails();
  }, [id]);

  const fetchEmployeeDetails = async () => {
    try {
      const res = await fetch(`/api/employees/${id}/products`);
      if (res.ok) {
        const data = await res.json();
        setEmployee(data);
      }
    } catch (error) {
      console.error("Error fetching employee:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setIsEditOpen(false);
        fetchEmployeeDetails();
      }
    } catch (error) {
      console.error("Error updating employee:", error);
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

  const formatDate = (dateStr: string | undefined, formatStr: string) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "N/A";
      return format(date, formatStr);
    } catch {
      return "N/A";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center py-16">
          <User className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">
            Employee not found
          </h2>
          <Link href="/admin/employees">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Employees
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalProductValue =
    employee.products?.reduce((sum, ep) => {
      return sum + (ep.product?.price?.base || 0) * ep.quantity;
    }, 0) || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-8"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Link href="/admin/employees">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                Employee Details
              </h1>
              <p className="text-slate-500">
                View and manage employee information
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsProductDialogOpen(true)}
            >
              <Package className="h-4 w-4" />
              Assign Products
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsEditOpen(true)}
            >
              <Pencil className="h-4 w-4" />
              Edit Employee
            </Button>
          </div>
        </motion.div>

        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-8 overflow-hidden border-0 shadow-xl">
            <div className="h-32 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500" />
            <CardContent className="relative px-8 pb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 -mt-16">
                <motion.div whileHover={{ scale: 1.05 }} className="relative">
                  <Avatar className="h-32 w-32 ring-4 ring-white shadow-xl">
                    {employee.profilePhoto ? (
                      <AvatarImage
                        src={employee.profilePhoto}
                        alt={employee.fullName}
                      />
                    ) : null}
                    <AvatarFallback className="text-3xl bg-linear-to-br from-indigo-400 to-indigo-600 text-white">
                      {employee.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-4 border-white ${
                      employee.status === "Online"
                        ? "bg-green-500"
                        : "bg-slate-400"
                    }`}
                  />
                </motion.div>

                <div className="flex-1 pt-4 sm:pt-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-slate-800">
                      {employee.fullName}
                    </h2>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        employee.status === "Online"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {employee.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {employee.phoneNumber}
                    </span>
                    {employee.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-4 w-4 text-slate-400" />
                        {employee.email}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      Joined {formatDate(employee.dateOfJoining, "MMM d, yyyy")}
                    </span>
                    {employee.address && (
                      <span className="flex items-start gap-1.5 sm:basis-full">
                        <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        {[
                          employee.address.street,
                          employee.address.city,
                          employee.address.state,
                          employee.address.pincode,
                          employee.address.country,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Holdings Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-indigo-600" />
            Holdings
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="h-1.5 bg-linear-to-r from-green-400 to-green-600" />
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Cash Holdings</p>
                    <p className="text-3xl font-bold text-slate-800">
                      {formatCurrency(employee.holdings?.cash || 0)}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                    <Banknote className="h-7 w-7 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="h-1.5 bg-linear-to-r from-blue-400 to-blue-600" />
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">
                      Online Holdings
                    </p>
                    <p className="text-3xl font-bold text-slate-800">
                      {formatCurrency(employee.holdings?.online || 0)}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                    <CreditCard className="h-7 w-7 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="h-1.5 bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400" />
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">
                      Total Holdings
                    </p>
                    <p className="text-3xl font-bold text-indigo-600">
                      {formatCurrency(employee.holdings?.total || 0)}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-full bg-linear-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                    <TrendingUp className="h-7 w-7 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
        >
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">
                {employee.age || "N/A"}
              </p>
              <p className="text-sm text-slate-500">Age</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">
                {employee.gender || "N/A"}
              </p>
              <p className="text-sm text-slate-500">Gender</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">
                {employee.products?.length || 0}
              </p>
              <p className="text-sm text-slate-500">Products Assigned</p>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Assigned Products */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-lg h-full">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-indigo-600" />
                    Assigned Products
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-normal text-slate-500">
                      Value: {formatCurrency(totalProductValue)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setIsProductDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {!employee.products || employee.products.length === 0 ? (
                  <div className="py-8 text-center">
                    <Package className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500">No products assigned</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-2"
                      onClick={() => setIsProductDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Assign Products
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {employee.products.map((ep, index) => (
                      <motion.div
                        key={ep._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="h-12 w-12 rounded-lg overflow-hidden bg-white shrink-0 flex items-center justify-center shadow-sm">
                          {ep.product?.photo ? (
                            <img
                              src={ep.product.photo}
                              alt={ep.product.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageOff className="h-5 w-5 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-700 truncate">
                            {ep.product?.title || "Unknown Product"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatCurrency(ep.product?.price?.base || 0)} each
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-800">
                            ×{ep.quantity}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatCurrency(
                              (ep.product?.price?.base || 0) * ep.quantity
                            )}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Sales History - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <EmployeeSales employeeId={employee._id} />
        </motion.div>

        {/* Edit Employee Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
            </DialogHeader>
            <EmployeeForm
              employee={employee}
              onSubmit={handleEditSubmit}
              isSubmitting={isSubmitting}
              onCancel={() => setIsEditOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Product Assignment Dialog */}
        <ProductAssignment
          employeeId={employee._id}
          employeeName={employee.fullName}
          isOpen={isProductDialogOpen}
          onClose={() => setIsProductDialogOpen(false)}
          onUpdate={fetchEmployeeDetails}
        />
      </div>
    </motion.div>
  );
}
