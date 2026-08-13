"use client";

import { format } from "date-fns";
import { Eye, Loader2, Package, Pencil, Trash2, User } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumnDef } from "@/components/ui/data-table";
import { PermissionGate } from "@/components/ui/permission-gate";

interface EmployeeProduct { _id: string; product: string; quantity: number }
interface Employee {
  _id: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  gender: "Male" | "Female" | "Other";
  age: number;
  dateOfJoining: string;
  profilePhoto?: string;
  status: "Online" | "Offline";
  products?: EmployeeProduct[];
  createdAt: string;
  updatedAt: string;
}

interface EmployeeTableProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onAssignProducts: (employee: Employee) => void;
  togglingStatusId?: string | null;
}

export function EmployeeTable({ employees, onEdit, onDelete, onToggleStatus, onAssignProducts, togglingStatusId }: EmployeeTableProps) {
  const columns: DataTableColumnDef<Employee>[] = [
    {
      id: "photo", header: "Photo", enableSorting: false, meta: { className: "w-[80px]" },
      cell: ({ row }) => {
        const employee = row.original;
        return (
          <div className="relative w-fit">
            <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
              {employee.profilePhoto && <AvatarImage src={employee.profilePhoto} alt={employee.fullName} />}
              <AvatarFallback className="bg-indigo-500 font-medium text-white">{employee.fullName.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${employee.status === "Online" ? "bg-green-500" : "bg-slate-400"}`} />
          </div>
        );
      },
    },
    { id: "name", accessorFn: (employee) => employee.fullName, header: "Name", cell: ({ row }) => <span className="font-medium text-slate-800">{row.original.fullName}</span> },
    {
      id: "status", accessorFn: (employee) => employee.status, header: "Status", meta: { className: "w-[100px]" },
      cell: ({ row }) => {
        const employee = row.original;
        const badge = (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${employee.status === "Online" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
            {togglingStatusId === employee._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className={`h-2 w-2 rounded-full ${employee.status === "Online" ? "bg-green-500" : "bg-slate-400"}`} />}
            {employee.status}
          </span>
        );
        return (
          <PermissionGate module="employees" action="toggleStatus" fallback={badge}>
            <button onClick={() => onToggleStatus(employee._id, employee.status)} disabled={togglingStatusId === employee._id}>{badge}</button>
          </PermissionGate>
        );
      },
    },
    { id: "phone", accessorFn: (employee) => employee.phoneNumber, header: "Phone", cell: ({ row }) => <span className="text-slate-600">{row.original.phoneNumber}</span> },
    { id: "email", accessorFn: (employee) => employee.email ?? "", header: "Email", meta: { className: "hidden md:table-cell" }, cell: ({ row }) => <span className="text-slate-500">{row.original.email || "—"}</span> },
    {
      id: "products", accessorFn: (employee) => employee.products?.length ?? 0, header: "Products", meta: { className: "hidden sm:table-cell" },
      cell: ({ row }) => {
        const content = <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700"><Package className="h-3 w-3" />{row.original.products?.length || 0} items</span>;
        return <PermissionGate module="employees" action="assignProducts" fallback={content}><button onClick={() => onAssignProducts(row.original)}>{content}</button></PermissionGate>;
      },
    },
    { id: "joined", accessorFn: (employee) => new Date(employee.dateOfJoining).getTime(), header: "Joined", meta: { className: "hidden lg:table-cell" }, cell: ({ row }) => <span className="text-slate-500">{format(new Date(row.original.dateOfJoining), "MMM d, yyyy")}</span> },
    {
      id: "actions", header: "Actions", enableSorting: false, meta: { className: "text-right" },
      cell: ({ row }) => {
        const employee = row.original;
        return (
          <div className="flex justify-end gap-1">
            <Link href={`/admin/employees/${employee._id}`}><Button variant="ghost" size="icon" title="View details" className="h-8 w-8 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"><Eye className="h-4 w-4" /></Button></Link>
            <PermissionGate module="employees" action="assignProducts"><Button variant="ghost" size="icon" onClick={() => onAssignProducts(employee)} title="Assign products" className="h-8 w-8 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"><Package className="h-4 w-4" /></Button></PermissionGate>
            <PermissionGate module="employees" action="update"><Button variant="ghost" size="icon" onClick={() => onEdit(employee)} className="h-8 w-8 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"><Pencil className="h-4 w-4" /></Button></PermissionGate>
            <PermissionGate module="employees" action="delete"><Button variant="ghost" size="icon" onClick={() => onDelete(employee._id)} className="h-8 w-8 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button></PermissionGate>
          </div>
        );
      },
    },
  ];

  const emptyState = (
    <Card className="p-12 text-center"><div className="flex flex-col items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100"><User className="h-6 w-6 text-slate-400" /></div><p className="text-slate-600">No employees found</p><p className="text-sm text-slate-500">Click &quot;Add Employee&quot; to create your first employee record</p></div></Card>
  );

  return <DataTable columns={columns} data={employees} title="Employees" emptyState={emptyState} getRowId={(employee) => employee._id} />;
}
