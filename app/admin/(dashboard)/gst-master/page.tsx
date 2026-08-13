"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Percent, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { DataTable, type DataTableColumnDef } from "@/components/ui/data-table";
import { PermissionGate } from "@/components/ui/permission-gate";

interface GstMaster {
  _id: string;
  name: string;
  rate: number;
  description?: string;
  status: "Active" | "Inactive";
}

const emptyForm = {
  name: "",
  rate: "",
  description: "",
  status: "Active" as "Active" | "Inactive",
};

export default function GstMasterPage() {
  const [gstMasters, setGstMasters] = useState<GstMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GstMaster | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchGstMasters = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/gst-masters");
      if (response.ok) setGstMasters(await response.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGstMasters();
  }, [fetchGstMasters]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (gst: GstMaster) => {
    setEditing(gst);
    setForm({
      name: gst.name,
      rate: gst.rate.toString(),
      description: gst.description || "",
      status: gst.status,
    });
    setOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const rate = Number(form.rate);
    if (!form.name.trim() || !Number.isFinite(rate) || rate < 0 || rate > 100) {
      alert("Enter a GST name and a rate between 0 and 100.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editing ? `/api/gst-masters/${editing._id}` : "/api/gst-masters",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, rate }),
        }
      );
      if (!response.ok) {
        const result = await response.json();
        alert(result.error || "Unable to save GST master");
        return;
      }
      setOpen(false);
      await fetchGstMasters();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (gst: GstMaster) => {
    if (!confirm(`Delete ${gst.name}?`)) return;
    const response = await fetch(`/api/gst-masters/${gst._id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const result = await response.json();
      alert(result.error || "Unable to delete GST master");
      return;
    }
    fetchGstMasters();
  };

  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">GST Master</h1>
            <p className="mt-1 text-slate-600">
              Create GST rates and assign them to individual products.
            </p>
          </div>
          <PermissionGate module="products" action="create">
            <Button onClick={openCreate} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> Add GST
            </Button>
          </PermissionGate>
        </div>

        {loading ? (
          <Card className="py-10 text-center text-slate-500">Loading GST masters…</Card>
        ) : (
          <DataTable
            title="GST rates"
            data={gstMasters}
            getRowId={(gst) => gst._id}
            columns={[
              { id: "name", accessorFn: (gst) => gst.name, header: "Name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
              { id: "rate", accessorFn: (gst) => gst.rate, header: "Rate", cell: ({ row }) => <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700"><Percent className="h-3.5 w-3.5" />{row.original.rate}</span> },
              { id: "description", accessorFn: (gst) => gst.description ?? "", header: "Description", cell: ({ row }) => <span className="text-slate-500">{row.original.description || "—"}</span> },
              { id: "status", accessorFn: (gst) => gst.status, header: "Status", cell: ({ row }) => <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.original.status === "Active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{row.original.status}</span> },
              { id: "actions", header: "Actions", enableSorting: false, meta: { className: "text-right" }, cell: ({ row }) => <div className="flex justify-end gap-1"><PermissionGate module="products" action="update"><Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button></PermissionGate><PermissionGate module="products" action="delete"><Button variant="ghost" size="icon" onClick={() => remove(row.original)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button></PermissionGate></div> },
            ] satisfies DataTableColumnDef<GstMaster>[]}
            emptyState={<Card className="py-10 text-center text-slate-500">No GST rates created yet.</Card>}
          />
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit GST" : "Add GST"}</DialogTitle>
            <DialogDescription>This rate can be selected while creating or editing a product.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="gstName">Name *</Label><Input id="gstName" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="GST 18%" required /></div>
            <div className="space-y-2"><Label htmlFor="gstRate">Rate (%) *</Label><Input id="gstRate" type="number" min="0" max="100" step="0.01" value={form.rate} onChange={(e) => setForm((current) => ({ ...current, rate: e.target.value }))} required /></div>
            <div className="space-y-2"><Label htmlFor="gstDescription">Description</Label><Input id="gstDescription" value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="Optional description" /></div>
            <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(status: "Active" | "Inactive") => setForm((current) => ({ ...current, status }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></div>
            <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">{saving ? "Saving…" : "Save GST"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
