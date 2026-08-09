"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Eye,
  Trash2,
  Edit2,
  FileText,
  Download,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { PermissionGate } from "@/components/ui/permission-gate";
import { usePermissions } from "@/hooks/usePermissions";

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  dateOfIssue: string;
  dueDate: string;
  customer: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone?: string;
    email?: string;
  };
  items: Array<{
    product?: string | { _id?: string };
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    gstName?: string;
    gstRate?: number;
    gstAmount?: number;
    lineTotal?: number;
  }>;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
  total: number;
  amountDue: number;
  notes?: string;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
}

interface InvoiceListProps {
  invoices: Invoice[];
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (id: string) => void;
}

const statusStyles = {
  Draft: "bg-slate-100 text-slate-700 border-slate-200",
  Sent: "bg-blue-50 text-blue-700 border-blue-200",
  Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Overdue: "bg-red-50 text-red-700 border-red-200",
};

export function InvoiceList({
  invoices,
  onView,
  onEdit,
  onDelete,
}: InvoiceListProps) {
  const { can } = usePermissions();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (invoices.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
            <FileText className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-slate-600">No invoices found</p>
          <p className="text-sm text-slate-500">
            Click &quot;New Invoice&quot; to create your first invoice
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
      transition: { delay: i * 0.05, duration: 0.3 },
    }),
  };

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="font-semibold text-slate-700">
              Invoice #
            </TableHead>
            <TableHead className="font-semibold text-slate-700">
              Customer
            </TableHead>
            <TableHead className="font-semibold text-slate-700">Date</TableHead>
            <TableHead className="font-semibold text-slate-700">
              Due Date
            </TableHead>
            <TableHead className="font-semibold text-slate-700 text-right">
              Amount
            </TableHead>
            <TableHead className="font-semibold text-slate-700">
              Status
            </TableHead>
            <TableHead className="font-semibold text-slate-700 text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice, index) => (
            <motion.tr
              key={invoice._id}
              custom={index}
              variants={rowVariants}
              initial="hidden"
              animate="visible"
              className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
            >
              <TableCell className="font-medium text-indigo-600">
                {invoice.invoiceNumber}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-slate-800">
                    {invoice.customer.name}
                  </p>
                  {invoice.customer.email && (
                    <p className="text-xs text-slate-500">
                      {invoice.customer.email}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-slate-600">
                {format(new Date(invoice.dateOfIssue), "dd MMM yyyy")}
              </TableCell>
              <TableCell className="text-slate-600">
                {format(new Date(invoice.dueDate), "dd MMM yyyy")}
              </TableCell>
              <TableCell className="text-right font-semibold text-slate-800">
                {formatCurrency(invoice.total)}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                    statusStyles[invoice.status]
                  }`}
                >
                  {invoice.status}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white">
                    <DropdownMenuItem onClick={() => onView(invoice)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    {can("invoices", "update") && (
                      <DropdownMenuItem onClick={() => onEdit(invoice)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {can("invoices", "delete") && (
                      <DropdownMenuItem
                        onClick={() => onDelete(invoice._id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
