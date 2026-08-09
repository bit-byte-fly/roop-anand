"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  Plus,
  Trash2,
  User,
  Phone,
  Mail,
  MapPin,
  Package,
  ShoppingCart,
  CreditCard,
  Banknote,
  AlertCircle,
  ImageOff,
} from "lucide-react";

interface Product {
  _id: string;
  title: string;
  photo?: string;
  price: {
    base: number;
    lowestSellingPrice: number;
  };
  gst?: {
    _id: string;
    name: string;
    rate: number;
  } | null;
}

interface EmployeeProduct {
  _id: string;
  product: Product;
  quantity: number;
}

interface Employee {
  _id: string;
  fullName: string;
  profilePhoto?: string;
  products: EmployeeProduct[];
}

interface SaleItem {
  productId: string;
  productTitle: string;
  quantity: number;
  pricePerUnit: number;
  maxQuantity: number;
  photo?: string;
  gstName?: string;
  gstRate: number;
}

interface SaleFormProps {
  onSubmit: (data: Record<string, unknown>) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

export function SaleForm({ onSubmit, isSubmitting, onCancel }: SaleFormProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Customer details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Online">("Cash");

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        // Filter employees who have products
        const employeesWithProducts = data.filter(
          (emp: Employee) => emp.products && emp.products.length > 0
        );
        setEmployees(employeesWithProducts);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = async (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setItems([]);
    setError("");

    if (!employeeId) {
      setSelectedEmployee(null);
      return;
    }

    // Fetch employee with populated products
    try {
      const res = await fetch(`/api/employees/${employeeId}/products`);
      if (res.ok) {
        const data = await res.json();
        const validProducts = (data.products || []).filter(
          (assignment: EmployeeProduct) => assignment.product?._id
        );
        setSelectedEmployee({ ...data, products: validProducts });
      }
    } catch (error) {
      console.error("Error fetching employee products:", error);
    }
  };

  const addItem = () => {
    if (!selectedEmployee || selectedEmployee.products.length === 0) return;

    const validProducts = selectedEmployee.products.filter(
      (assignment) => assignment.product?._id
    );
    const allProductsAdded = validProducts.every((assignment) =>
      items.some((item) => item.productId === assignment.product._id)
    );

    if (allProductsAdded) {
      setError("All available products have been added");
      return;
    }

    setItems((currentItems) => {
      const nextProduct = validProducts.find(
        (assignment) =>
          !currentItems.some(
            (item) => item.productId === assignment.product._id
          )
      );

      if (!nextProduct) return currentItems;

      return [
        ...currentItems,
        {
          productId: nextProduct.product._id,
          productTitle: nextProduct.product.title,
          quantity: 1,
          pricePerUnit: nextProduct.product.price.base,
          maxQuantity: nextProduct.quantity,
          photo: nextProduct.product.photo,
          gstName: nextProduct.product.gst?.name,
          gstRate: nextProduct.product.gst?.rate || 0,
        },
      ];
    });
    setError("");
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof SaleItem,
    value: string | number
  ) => {
    const newItems = [...items];

    if (field === "productId" && typeof value === "string") {
      const product = selectedEmployee?.products.find(
        (p) => p.product._id === value
      );
      if (product) {
        newItems[index] = {
          ...newItems[index],
          productId: value,
          productTitle: product.product.title,
          pricePerUnit: product.product.price.base,
          maxQuantity: product.quantity,
          quantity: Math.min(newItems[index].quantity, product.quantity),
          photo: product.product.photo,
          gstName: product.product.gst?.name,
          gstRate: product.product.gst?.rate || 0,
        };
      }
    } else if (field === "quantity") {
      newItems[index] = {
        ...newItems[index],
        quantity: Math.min(Number(value), newItems[index].maxQuantity),
      };
    } else if (field === "pricePerUnit") {
      newItems[index] = {
        ...newItems[index],
        pricePerUnit: Number(value),
      };
    }

    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce(
      (sum, item) => sum + item.quantity * item.pricePerUnit,
      0
    );
  };

  const calculateGst = () =>
    items.reduce(
      (sum, item) =>
        sum + (item.quantity * item.pricePerUnit * item.gstRate) / 100,
      0
    );

  const calculateTotal = () => calculateSubtotal() + calculateGst();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedEmployeeId) {
      setError("Please select an employee");
      return;
    }

    if (items.length === 0) {
      setError("Please add at least one product");
      return;
    }

    if (!customerName.trim()) {
      setError("Customer name is required");
      return;
    }

    if (!customerPhone.trim()) {
      setError("Customer phone is required");
      return;
    }

    if (!customerAddress.trim()) {
      setError("Billing address is required");
      return;
    }

    // Validate quantities
    for (const item of items) {
      if (item.quantity < 1) {
        setError(`Quantity must be at least 1 for ${item.productTitle}`);
        return;
      }
      if (item.quantity > item.maxQuantity) {
        setError(
          `Only ${item.maxQuantity} units available for ${item.productTitle}`
        );
        return;
      }
    }

    onSubmit({
      employeeId: selectedEmployeeId,
      items: items.map((item) => ({
        productId: item.productId,
        productTitle: item.productTitle,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
      })),
      customer: {
        name: customerName.trim(),
        phone: customerPhone.trim(),
        email: customerEmail.trim() || undefined,
        billingAddress: customerAddress.trim(),
      },
      paymentMethod,
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Employee Selection */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Label className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Select Employee *
        </Label>
        <Select value={selectedEmployeeId} onValueChange={handleEmployeeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Choose an employee" />
          </SelectTrigger>
          <SelectContent>
            {employees.length === 0 ? (
              <div className="p-2 text-sm text-slate-500 text-center">
                No employees with products
              </div>
            ) : (
              employees.map((employee) => (
                <SelectItem key={employee._id} value={employee._id}>
                  <div className="flex items-center gap-2">
                    <span>{employee.fullName}</span>
                    <span className="text-xs text-slate-500">
                      ({employee.products?.length || 0} products)
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Products Section */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Products *
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            disabled={
              !selectedEmployee || selectedEmployee.products.length === 0
            }
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        {items.length === 0 ? (
          <Card className="p-6 text-center border-dashed">
            <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              {selectedEmployee
                ? "Click 'Add Product' to add items"
                : "Select an employee first"}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {items.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card className="p-4">
                    <div className="flex gap-3">
                      {/* Product Image */}
                      <div className="h-16 w-16 rounded-lg overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                        {item.photo ? (
                          <img
                            src={item.photo}
                            alt={item.productTitle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageOff className="h-6 w-6 text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                        {/* Product Select */}
                        <div className="sm:col-span-2">
                          <Label className="text-xs text-slate-500 mb-1 block">
                            Product
                          </Label>
                          <Select
                            value={item.productId}
                            onValueChange={(v) =>
                              updateItem(index, "productId", v)
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedEmployee?.products
                                .filter(
                                  (p) =>
                                    p.product &&
                                    (p.product._id === item.productId ||
                                      !items.find(
                                        (i) => i.productId === p.product._id
                                      ))
                                )
                                .map((ep) => (
                                  <SelectItem
                                    key={ep.product._id}
                                    value={ep.product._id}
                                  >
                                    {ep.product.title} ({ep.quantity} available)
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Quantity */}
                        <div>
                          <Label className="text-xs text-slate-500 mb-1 block">
                            Qty (max: {item.maxQuantity})
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            max={item.maxQuantity}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, "quantity", e.target.value)
                            }
                            className="h-9"
                          />
                        </div>

                        {/* Price */}
                        <div>
                          <Label className="text-xs text-slate-500 mb-1 block">
                            Price before GST (₹)
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.pricePerUnit}
                            onChange={(e) =>
                              updateItem(index, "pricePerUnit", e.target.value)
                            }
                            className="h-9"
                          />
                        </div>
                      </div>

                      {/* Remove Button */}
                      <div className="flex flex-col items-end justify-between">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium text-slate-700">
                          {formatCurrency(
                            item.quantity *
                              item.pricePerUnit *
                              (1 + item.gstRate / 100)
                          )}
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Total */}
            <div className="flex justify-end p-3 bg-slate-50 rounded-lg">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(calculateSubtotal())}</span></div>
                <div className="flex justify-between text-slate-500"><span>GST</span><span>{formatCurrency(calculateGst())}</span></div>
                <div className="flex justify-between border-t pt-1 text-lg font-bold text-indigo-600"><span>Total</span><span>{formatCurrency(calculateTotal())}</span></div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Customer Details */}
      <motion.div
        variants={itemVariants}
        className="space-y-4 p-4 rounded-lg bg-slate-50 border border-slate-200"
      >
        <Label className="text-base font-medium flex items-center gap-2">
          <User className="h-4 w-4" />
          Customer Details
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customerName" className="text-sm text-slate-600">
              Name *
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPhone" className="text-sm text-slate-600">
              Phone *
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone number"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerEmail" className="text-sm text-slate-600">
              Email (Optional)
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@example.com"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerAddress" className="text-sm text-slate-600">
              Billing Address *
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="customerAddress"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Billing address"
                className="pl-10"
                required
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Payment Method */}
      <motion.div variants={itemVariants} className="space-y-2">
        <Label>Payment Method *</Label>
        <div className="flex gap-3">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setPaymentMethod("Cash")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all ${
              paymentMethod === "Cash"
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            <Banknote className="h-5 w-5" />
            Cash
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setPaymentMethod("Online")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all ${
              paymentMethod === "Online"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            <CreditCard className="h-5 w-5" />
            Online
          </motion.button>
        </div>
      </motion.div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 text-red-600 text-sm p-3 bg-red-50 rounded-lg"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <motion.div
        variants={itemVariants}
        className="flex justify-end gap-3 pt-4 border-t"
      >
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="submit"
            disabled={isSubmitting || items.length === 0}
            className="min-w-[140px] bg-indigo-600 hover:bg-indigo-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Create Sale
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </motion.form>
  );
}
