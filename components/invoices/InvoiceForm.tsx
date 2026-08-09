"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Loader2,
  User,
  MapPin,
  Package,
  Calculator,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/card";

interface Product {
  _id: string;
  title: string;
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

interface InvoiceItem {
  product?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  gstName?: string;
  gstRate?: number;
  gstAmount?: number;
  lineTotal?: number;
}

interface Customer {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  email?: string;
}

interface InvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InvoiceFormData) => Promise<void>;
  initialData?: InvoiceFormData | null;
  isSubmitting: boolean;
}

export interface InvoiceFormData {
  _id?: string;
  dateOfIssue: string;
  dueDate: string;
  customer: Customer;
  items: InvoiceItem[];
  taxRate: number;
  discount: number;
  notes: string;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
}

export function InvoiceForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting,
}: InvoiceFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [formData, setFormData] = useState<InvoiceFormData>({
    dateOfIssue: format(new Date(), "yyyy-MM-dd"),
    dueDate: format(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      "yyyy-MM-dd"
    ),
    customer: {
      name: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
      email: "",
    },
    items: [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }],
    taxRate: 0,
    discount: 0,
    notes: "",
    status: "Draft",
  });

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      if (initialData) {
        setFormData({
          ...initialData,
          dateOfIssue: initialData.dateOfIssue
            ? format(new Date(initialData.dateOfIssue), "yyyy-MM-dd")
            : format(new Date(), "yyyy-MM-dd"),
          dueDate: initialData.dueDate
            ? format(new Date(initialData.dueDate), "yyyy-MM-dd")
            : format(
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                "yyyy-MM-dd"
              ),
        });
      } else {
        setFormData({
          dateOfIssue: format(new Date(), "yyyy-MM-dd"),
          dueDate: format(
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            "yyyy-MM-dd"
          ),
          customer: {
            name: "",
            address: "",
            city: "",
            state: "",
            pincode: "",
            phone: "",
            email: "",
          },
          items: [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }],
          taxRate: 0,
          discount: 0,
          notes: "",
          status: "Draft",
        });
      }
    }
  }, [isOpen, initialData]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleCustomerChange = (field: keyof Customer, value: string) => {
    setFormData((prev) => ({
      ...prev,
      customer: { ...prev.customer, [field]: value },
    }));
  };

  const handleItemChange = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      // Recalculate amount if quantity or unitPrice changes
      if (field === "quantity" || field === "unitPrice") {
        newItems[index].amount =
          newItems[index].quantity * newItems[index].unitPrice;
      }

      return { ...prev, items: newItems };
    });
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p._id === productId);
    if (product) {
      setFormData((prev) => {
        const newItems = [...prev.items];
        newItems[index] = {
          ...newItems[index],
          product: productId,
          description: product.title,
          unitPrice: product.price.base,
          amount: newItems[index].quantity * product.price.base,
          gstName: product.gst?.name,
          gstRate: product.gst?.rate || 0,
        };
        return { ...prev, items: newItems };
      });
    }
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { description: "", quantity: 1, unitPrice: 0, amount: 0 },
      ],
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
    }
  };

  const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = formData.items.reduce(
    (sum, item) => sum + (item.amount * (item.gstRate || 0)) / 100,
    0
  );
  const total = subtotal + taxAmount - formData.discount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer.name.trim()) {
      alert("Customer name is required");
      return;
    }

    if (!formData.customer.address.trim()) {
      alert("Billing address is required");
      return;
    }

    if (
      formData.items.length === 0 ||
      !formData.items.some((i) => i.description)
    ) {
      alert("At least one item is required");
      return;
    }

    await onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-indigo-600" />
            {initialData ? "Edit Invoice" : "Create Invoice"}
          </DialogTitle>
          <DialogDescription>
            Fill in the details to {initialData ? "update" : "create"} an
            invoice.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dates and Status */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dateOfIssue">Date of Issue</Label>
              <Input
                id="dateOfIssue"
                type="date"
                value={formData.dateOfIssue}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    dateOfIssue: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: v as InvoiceFormData["status"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Customer Section */}
          <Card className="p-4 border-slate-200">
            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-slate-700">
              <User className="h-4 w-4" />
              Bill To
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customer.name}
                  onChange={(e) => handleCustomerChange("name", e.target.value)}
                  placeholder="Customer name"
                  required
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="customerAddress">Billing Address *</Label>
                <Input
                  id="customerAddress"
                  value={formData.customer.address}
                  onChange={(e) =>
                    handleCustomerChange("address", e.target.value)
                  }
                  placeholder="Street address"
                  required
                />
              </div>
              <div>
                <Label htmlFor="customerCity">City</Label>
                <Input
                  id="customerCity"
                  value={formData.customer.city}
                  onChange={(e) => handleCustomerChange("city", e.target.value)}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="customerState">State</Label>
                <Input
                  id="customerState"
                  value={formData.customer.state}
                  onChange={(e) =>
                    handleCustomerChange("state", e.target.value)
                  }
                  placeholder="State"
                />
              </div>
              <div>
                <Label htmlFor="customerPincode">Pincode</Label>
                <Input
                  id="customerPincode"
                  value={formData.customer.pincode}
                  onChange={(e) =>
                    handleCustomerChange("pincode", e.target.value)
                  }
                  placeholder="Pincode"
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Phone</Label>
                <Input
                  id="customerPhone"
                  value={formData.customer.phone || ""}
                  onChange={(e) =>
                    handleCustomerChange("phone", e.target.value)
                  }
                  placeholder="Phone number"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customer.email || ""}
                  onChange={(e) =>
                    handleCustomerChange("email", e.target.value)
                  }
                  placeholder="Email address"
                />
              </div>
            </div>
          </Card>

          {/* Items Section */}
          <Card className="p-4 border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Package className="h-4 w-4" />
                Items
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-1">
                <div className="col-span-5">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-1"></div>
              </div>

              <AnimatePresence>
                {formData.items.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-12 gap-2 items-center"
                  >
                    <div className="col-span-5">
                      <Select
                        value={item.product || "custom"}
                        onValueChange={(v) => {
                          if (v === "custom") {
                            handleItemChange(index, "product", "");
                            handleItemChange(index, "description", "");
                            handleItemChange(index, "gstName", "");
                            handleItemChange(index, "gstRate", 0);
                          } else {
                            handleProductSelect(index, v);
                          }
                        }}
                      >
                        <SelectTrigger className="mb-1">
                          <SelectValue placeholder="Select product or custom" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Custom Item</SelectItem>
                          {products.map((product) => (
                            <SelectItem key={product._id} value={product._id}>
                              {product.title} -{" "}
                              {formatCurrency(product.price.base)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(index, "description", e.target.value)
                        }
                        placeholder="Item description"
                      />
                      {(item.gstRate || 0) > 0 && (
                        <p className="mt-1 text-xs text-indigo-600">
                          {item.gstName || "GST"} {item.gstRate}%
                        </p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "quantity",
                            parseInt(e.target.value) || 1
                          )
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            "unitPrice",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="px-3 py-2 bg-slate-50 rounded-md text-sm font-medium">
                        {formatCurrency(
                          item.amount * (1 + (item.gstRate || 0) / 100)
                        )}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={formData.items.length === 1}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </Card>

          {/* Totals Section */}
          <Card className="p-4 border-slate-200">
            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-slate-700">
              <Calculator className="h-4 w-4" />
              Summary
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-slate-600">GST (product-specific)</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">Discount (₹)</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        discount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-24"
                  />
                </div>
                <span className="font-medium text-red-600">
                  -{formatCurrency(formData.discount)}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="text-lg font-semibold text-slate-800">
                  Total
                </span>
                <span className="text-lg font-bold text-indigo-600">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </Card>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Additional notes for this invoice..."
              className="w-full min-h-[80px] px-3 py-2 border border-slate-200 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {initialData ? "Updating..." : "Creating..."}
                </>
              ) : initialData ? (
                "Update Invoice"
              ) : (
                "Create Invoice"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
