"use client";

import { format } from "date-fns";
import { Edit2, Eye, FileText, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumnDef } from "@/components/ui/data-table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/hooks/usePermissions";

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  dateOfIssue: string;
  dueDate: string;
  customer: { name: string; address: string; city: string; state: string; pincode: string; phone?: string; email?: string };
  items: Array<{ product?: string | { _id?: string }; description: string; quantity: number; unitPrice: number; amount: number; gstName?: string; gstRate?: number; gstAmount?: number; lineTotal?: number }>;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
  total: number;
  amountDue: number;
  notes?: string;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
}

interface InvoiceListProps { invoices: Invoice[]; onView: (invoice: Invoice) => void; onEdit: (invoice: Invoice) => void; onDelete: (id: string) => void }
const statusStyles = { Draft: "bg-slate-100 text-slate-700 border-slate-200", Sent: "bg-blue-50 text-blue-700 border-blue-200", Paid: "bg-emerald-50 text-emerald-700 border-emerald-200", Overdue: "bg-red-50 text-red-700 border-red-200" };
const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(amount);

export function InvoiceList({ invoices, onView, onEdit, onDelete }: InvoiceListProps) {
  const { can } = usePermissions();
  const columns: DataTableColumnDef<Invoice>[] = [
    { id: "invoiceNumber", accessorFn: (invoice) => invoice.invoiceNumber, header: "Invoice #", cell: ({ row }) => <span className="font-medium text-indigo-600">{row.original.invoiceNumber}</span> },
    { id: "customer", accessorFn: (invoice) => invoice.customer.name, header: "Customer", cell: ({ row }) => <div><p className="font-medium text-slate-800">{row.original.customer.name}</p>{row.original.customer.email && <p className="text-xs text-slate-500">{row.original.customer.email}</p>}</div> },
    { id: "date", accessorFn: (invoice) => new Date(invoice.dateOfIssue).getTime(), header: "Date", cell: ({ row }) => <span className="text-slate-600">{format(new Date(row.original.dateOfIssue), "dd MMM yyyy")}</span> },
    { id: "dueDate", accessorFn: (invoice) => new Date(invoice.dueDate).getTime(), header: "Due Date", cell: ({ row }) => <span className="text-slate-600">{format(new Date(row.original.dueDate), "dd MMM yyyy")}</span> },
    { id: "amount", accessorFn: (invoice) => invoice.total, header: "Amount", meta: { className: "text-right" }, cell: ({ row }) => <span className="font-semibold text-slate-800">{formatCurrency(row.original.total)}</span> },
    { id: "status", accessorFn: (invoice) => invoice.status, header: "Status", cell: ({ row }) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[row.original.status]}`}>{row.original.status}</span> },
    {
      id: "actions", header: "Actions", enableSorting: false, meta: { className: "text-right" },
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white">
            <DropdownMenuItem onClick={() => onView(row.original)}><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
            {can("invoices", "update") && <DropdownMenuItem onClick={() => onEdit(row.original)}><Edit2 className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>}
            {can("invoices", "delete") && <DropdownMenuItem onClick={() => onDelete(row.original._id)} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const emptyState = <Card className="p-12 text-center"><div className="flex flex-col items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100"><FileText className="h-6 w-6 text-slate-400" /></div><p className="text-slate-600">No invoices found</p><p className="text-sm text-slate-500">Click &quot;New Invoice&quot; to create your first invoice</p></div></Card>;
  return <DataTable columns={columns} data={invoices} title="Invoices" emptyState={emptyState} getRowId={(invoice) => invoice._id} />;
}
