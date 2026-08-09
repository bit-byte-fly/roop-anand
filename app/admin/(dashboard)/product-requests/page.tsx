"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  ShoppingCart,
  Filter,
  ArrowUpDown,
  X,
  Package,
  User,
  Clock,
  CheckCircle,
  Truck,
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  Send,
  Edit2,
  Trash2,
  UserCheck,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProductInRequest {
  product: {
    _id: string;
    title: string;
    photo?: string;
    price?: { base: number };
  };
  quantity: number;
}

interface Note {
  by: "admin" | "customer";
  content: string;
  createdAt: string;
}

interface EmployeeOption {
  _id: string;
  fullName: string;
  phoneNumber: string;
  status: "Online" | "Offline";
  profilePhoto?: string;
}

interface ProductRequest {
  _id: string;
  customer: {
    _id: string;
    name: string;
    email?: string;
    phone: string;
    authType: "guest" | "registered";
  };
  products: ProductInRequest[];
  assignedEmployee?: EmployeeOption | null;
  assignedAt?: string;
  status: "pending" | "ongoing" | "delivered";
  customerDetails: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  notes: Note[];
  createdAt: string;
  updatedAt: string;
}

interface StatusCounts {
  pending: number;
  ongoing: number;
  delivered: number;
  total: number;
}

type SortField = "createdAt" | "status";
type SortOrder = "asc" | "desc";
type StatusFilter = "all" | "pending" | "ongoing" | "delivered";

interface EmployeeAssignmentSelectProps {
  employees: EmployeeOption[];
  value?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  onChange: (employeeId: string) => void;
}

function EmployeeAssignmentSelect({
  employees,
  value,
  disabled,
  loading,
  className = "w-48",
  onChange,
}: EmployeeAssignmentSelectProps) {
  const [employeeSearch, setEmployeeSearch] = useState("");
  const selectedEmployee = employees.find((employee) => employee._id === value);
  const normalizedSearch = employeeSearch.trim().toLowerCase();
  const filteredEmployees = employees.filter(
    (employee) =>
      employee.fullName.toLowerCase().includes(normalizedSearch) ||
      employee.phoneNumber.includes(normalizedSearch)
  );

  return (
    <DropdownMenu onOpenChange={(open) => !open && setEmployeeSearch("")}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={`${className} justify-between bg-white font-normal`}
        >
          {loading ? (
            <span className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Assigning...
            </span>
          ) : (
            <span className="truncate">
              {selectedEmployee?.fullName || "Unassigned"}
            </span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <div
          className="relative p-2"
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={employeeSearch}
            onChange={(event) => setEmployeeSearch(event.target.value)}
            placeholder="Search name or phone..."
            className="h-9 pl-9"
            autoFocus
          />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => onChange("unassigned")}
          className="gap-2"
        >
          <span className="flex-1">Unassigned</span>
          {!value && <Check className="h-4 w-4 text-indigo-600" />}
        </DropdownMenuItem>
        {filteredEmployees.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-slate-500">
            No employees found
          </p>
        ) : (
          filteredEmployees.map((employee) => (
            <DropdownMenuItem
              key={employee._id}
              onSelect={() => onChange(employee._id)}
              className="gap-2"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  employee.status === "Online" ? "bg-green-500" : "bg-slate-300"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{employee.fullName}</span>
                <span className="block text-xs text-slate-500">
                  {employee.phoneNumber}
                </span>
              </span>
              {employee._id === value && (
                <Check className="h-4 w-4 text-indigo-600" />
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  ongoing: {
    label: "Ongoing",
    icon: Truck,
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle,
    className: "bg-green-100 text-green-700 border-green-200",
  },
};

export default function ProductRequestsPage() {
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [assigningRequestId, setAssigningRequestId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<ProductRequest | null>(
    null
  );
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    pending: 0,
    ongoing: 0,
    delivered: 0,
    total: 0,
  });

  // Filter and Sort states
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showFilters, setShowFilters] = useState(false);

  // Notes thread states
  const [newNote, setNewNote] = useState("");
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("sortBy", sortField);
      params.append("sortOrder", sortOrder);

      const res = await fetch(`/api/product-requests?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
        setStatusCounts(
          data.counts || { pending: 0, ongoing: 0, delivered: 0, total: 0 }
        );
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, sortField, sortOrder]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch("/api/employees");
        if (!response.ok) return;
        const data = (await response.json()) as EmployeeOption[];
        setEmployees(data);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };

    fetchEmployees();
  }, []);

  const selectedRequestId = selectedRequest?._id;

  // Polling for notes when dialog is open
  useEffect(() => {
    if (!isDetailsOpen || !selectedRequestId) return;

    const pollNotes = async () => {
      try {
        const res = await fetch(`/api/product-requests/${selectedRequestId}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedRequest(data.request);
        }
      } catch (error) {
        console.error("Error polling notes:", error);
      }
    };

    const intervalId = setInterval(pollNotes, 1000);
    return () => clearInterval(intervalId);
  }, [isDetailsOpen, selectedRequestId]);

  const handleViewDetails = async (request: ProductRequest) => {
    try {
      const res = await fetch(`/api/product-requests/${request._id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRequest(data.request);
        setIsDetailsOpen(true);
      }
    } catch (error) {
      console.error("Error fetching request details:", error);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/product-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchRequests();
        if (selectedRequest?._id === id) {
          setSelectedRequest({
            ...selectedRequest,
            status: newStatus as ProductRequest["status"],
          });
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleAssignmentUpdate = async (
    requestId: string,
    employeeId: string
  ) => {
    setAssigningRequestId(requestId);
    try {
      const response = await fetch(`/api/product-requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedEmployeeId:
            employeeId === "unassigned" ? null : employeeId,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Failed to assign employee");
        return;
      }

      setRequests((current) =>
        current.map((item) =>
          item._id === requestId ? data.request : item
        )
      );
      if (selectedRequest?._id === requestId) {
        setSelectedRequest(data.request);
      }
      toast.success(
        employeeId === "unassigned"
          ? "Employee unassigned"
          : "Request assigned to employee"
      );
    } catch (error) {
      console.error("Error assigning employee:", error);
      toast.error("Failed to assign employee");
    } finally {
      setAssigningRequestId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this request?")) return;

    try {
      const res = await fetch(`/api/product-requests/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchRequests();
        if (selectedRequest?._id === id) {
          setIsDetailsOpen(false);
        }
      }
    } catch (error) {
      console.error("Error deleting request:", error);
    }
  };

  // Note handlers
  const handleAddNote = async () => {
    if (!selectedRequest || !newNote.trim()) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/product-requests/${selectedRequest._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedRequest(data.request);
        setNewNote("");
      }
    } catch (error) {
      console.error("Error adding note:", error);
    } finally {
      setNoteSaving(false);
    }
  };

  const handleUpdateNote = async (noteIndex: number) => {
    if (!selectedRequest || !editingNoteContent.trim()) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/product-requests/${selectedRequest._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          noteIndex,
          content: editingNoteContent.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedRequest(data.request);
        setEditingNoteIndex(null);
        setEditingNoteContent("");
      }
    } catch (error) {
      console.error("Error updating note:", error);
    } finally {
      setNoteSaving(false);
    }
  };

  const handleDeleteNote = async (noteIndex: number) => {
    if (!selectedRequest) return;
    if (!confirm("Delete this note?")) return;
    try {
      const res = await fetch(`/api/product-requests/${selectedRequest._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", noteIndex }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedRequest(data.request);
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setSortField("createdAt");
    setSortOrder("desc");
    setSearchQuery("");
  };

  const hasActiveFilters =
    statusFilter !== "all" ||
    sortField !== "createdAt" ||
    sortOrder !== "desc" ||
    searchQuery;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const StatusBadge = ({ status }: { status: ProductRequest["status"] }) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-8"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Product Requests
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-1">
              <p className="text-slate-600">
                Manage customer product requests
                {statusCounts.total > 0 && (
                  <span className="ml-2 text-indigo-600 font-medium">
                    ({statusCounts.total} total)
                  </span>
                )}
              </p>
              {statusCounts.total > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span className="text-slate-600">
                      {statusCounts.pending} Pending
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="text-slate-600">
                      {statusCounts.ongoing} Ongoing
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-slate-600">
                      {statusCounts.delivered} Delivered
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 transition-all focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`gap-2 ${
                showFilters ? "bg-indigo-50 border-indigo-300" : ""
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 w-2 h-2 rounded-full bg-indigo-600"></span>
              )}
            </Button>
          </div>

          {/* Expanded Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  {/* Status Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 font-medium">
                      Status:
                    </span>
                    <Select
                      value={statusFilter}
                      onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                    >
                      <SelectTrigger className="w-36 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            Pending
                          </span>
                        </SelectItem>
                        <SelectItem value="ongoing">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Ongoing
                          </span>
                        </SelectItem>
                        <SelectItem value="delivered">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Delivered
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort By */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 font-medium">
                      Sort by:
                    </span>
                    <Select
                      value={sortField}
                      onValueChange={(v) => setSortField(v as SortField)}
                    >
                      <SelectTrigger className="w-36 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdAt">Date</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort Order */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                    }
                    className="gap-2"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    {sortOrder === "asc" ? "Ascending" : "Descending"}
                  </Button>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="gap-1 text-slate-500 hover:text-slate-700"
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Table */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-4" />
              <p className="text-slate-500">Loading requests...</p>
            </motion.div>
          ) : requests.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200"
            >
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingCart className="h-8 w-8 text-indigo-600" />
              </div>
              <p className="text-slate-600 text-lg font-medium mb-2">
                No product requests yet
              </p>
              <p className="text-slate-400 text-sm mb-4">
                Requests will appear here when customers submit them
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-semibold">Customer</TableHead>
                      <TableHead className="font-semibold">Products</TableHead>
                      <TableHead className="font-semibold">Assigned To</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="text-right font-semibold">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow
                        key={request._id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {request.customerDetails.name
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">
                                {request.customerDetails.name}
                              </p>
                              <p className="text-sm text-slate-500">
                                {request.customerDetails.phone}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-600">
                              {request.products.length} product(s)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <EmployeeAssignmentSelect
                            employees={employees}
                            value={request.assignedEmployee?._id}
                            onChange={(employeeId) =>
                              handleAssignmentUpdate(request._id, employeeId)
                            }
                            disabled={assigningRequestId === request._id}
                            loading={assigningRequestId === request._id}
                          />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="cursor-pointer hover:opacity-80 transition-opacity">
                                <StatusBadge status={request.status} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusUpdate(request._id, "pending")
                                }
                                className="gap-2"
                              >
                                <Clock className="h-4 w-4 text-amber-500" />
                                Pending
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusUpdate(request._id, "ongoing")
                                }
                                className="gap-2"
                              >
                                <Truck className="h-4 w-4 text-blue-500" />
                                Ongoing
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusUpdate(request._id, "delivered")
                                }
                                className="gap-2"
                              >
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Delivered
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-slate-600">
                            {formatDate(request.createdAt)}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(request)}
                            >
                              View
                            </Button>
                            {request.status !== "delivered" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(request._id)}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Request Details Modal */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-6">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <StatusBadge status={selectedRequest.status} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Update Status
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          handleStatusUpdate(selectedRequest._id, "pending")
                        }
                        className="gap-2"
                      >
                        <Clock className="h-4 w-4 text-amber-500" />
                        Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleStatusUpdate(selectedRequest._id, "ongoing")
                        }
                        className="gap-2"
                      >
                        <Truck className="h-4 w-4 text-blue-500" />
                        Ongoing
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleStatusUpdate(selectedRequest._id, "delivered")
                        }
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Delivered
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Employee Assignment */}
                <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-indigo-600" />
                    <h3 className="font-semibold text-slate-800">
                      Assigned Employee
                    </h3>
                  </div>
                  <EmployeeAssignmentSelect
                    employees={employees}
                    value={selectedRequest.assignedEmployee?._id}
                    onChange={(employeeId) =>
                      handleAssignmentUpdate(selectedRequest._id, employeeId)
                    }
                    disabled={assigningRequestId === selectedRequest._id}
                    loading={assigningRequestId === selectedRequest._id}
                    className="w-full"
                  />
                  {selectedRequest.assignedAt && (
                    <p className="mt-2 text-xs text-slate-500">
                      Assigned {formatDate(selectedRequest.assignedAt)}
                    </p>
                  )}
                </div>

                {/* Customer Details */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-slate-500" />
                    <h3 className="font-semibold text-slate-800">
                      Customer Details
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Name</p>
                      <p className="font-medium">
                        {selectedRequest.customerDetails.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Phone</p>
                      <p className="font-medium flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedRequest.customerDetails.phone}
                      </p>
                    </div>
                    {selectedRequest.customerDetails.email && (
                      <div>
                        <p className="text-sm text-slate-500">Email</p>
                        <p className="font-medium flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {selectedRequest.customerDetails.email}
                        </p>
                      </div>
                    )}
                    {selectedRequest.customerDetails.address && (
                      <div className="col-span-2">
                        <p className="text-sm text-slate-500">Address</p>
                        <p className="font-medium flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {selectedRequest.customerDetails.address}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Products */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-slate-500" />
                    <h3 className="font-semibold text-slate-800">Products</h3>
                  </div>
                  <div className="space-y-3">
                    {selectedRequest.products.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg"
                      >
                        {item.product.photo ? (
                          <img
                            src={item.product.photo}
                            alt={item.product.title}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center">
                            <Package className="h-6 w-6 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">
                            {item.product.title}
                          </p>
                          <p className="text-sm text-slate-500">
                            Quantity: {item.quantity}
                          </p>
                        </div>
                        {item.product.price && (
                          <p className="font-semibold text-indigo-600">
                            ₹{item.product.price.base}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes Thread */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4 text-slate-500" />
                    <h3 className="font-semibold text-slate-800">
                      Notes Thread
                    </h3>
                    <span className="text-xs text-slate-500">
                      ({selectedRequest.notes?.length || 0} messages)
                    </span>
                  </div>

                  {/* Notes List */}
                  <div className="space-y-3 mb-3">
                    {selectedRequest.notes?.length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-4">
                        No notes yet. Start the conversation below.
                      </p>
                    )}
                    {selectedRequest.notes?.map((note, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          note.by === "admin"
                            ? "bg-indigo-50 border border-indigo-100 ml-8"
                            : "bg-slate-50 border border-slate-100 mr-8"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  note.by === "admin"
                                    ? "bg-indigo-100 text-indigo-700"
                                    : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {note.by === "admin" ? "Admin" : "Customer"}
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatDate(note.createdAt)}
                              </span>
                            </div>
                            {editingNoteIndex === index ? (
                              <div className="flex gap-2 mt-2">
                                <Input
                                  value={editingNoteContent}
                                  onChange={(e) =>
                                    setEditingNoteContent(e.target.value)
                                  }
                                  className="flex-1"
                                  disabled={noteSaving}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateNote(index)}
                                  disabled={noteSaving}
                                >
                                  {noteSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Save"
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingNoteIndex(null);
                                    setEditingNoteContent("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-700">
                                {note.content}
                              </p>
                            )}
                          </div>
                          {note.by === "admin" &&
                            editingNoteIndex !== index && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingNoteIndex(index);
                                    setEditingNoteContent(note.content);
                                  }}
                                  className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                  title="Edit note"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteNote(index)}
                                  className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                  title="Delete note"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Note Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Write a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddNote();
                        }
                      }}
                      disabled={noteSaving}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || noteSaving}
                      className="gap-2"
                    >
                      {noteSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="text-sm text-slate-500 pt-4 border-t">
                  <p>Created: {formatDate(selectedRequest.createdAt)}</p>
                  <p>Updated: {formatDate(selectedRequest.updatedAt)}</p>
                </div>

                {/* Actions */}
                {selectedRequest.status !== "delivered" && (
                  <div className="pt-4 flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(selectedRequest._id)}
                    >
                      Delete Request
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
}
