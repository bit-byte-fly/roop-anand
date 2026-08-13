"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift, Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type DataTableColumnDef } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PermissionGate } from "@/components/ui/permission-gate";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type GiftType = "Cash" | "TV" | "Fridge" | "Other";
interface Product { _id: string; title: string; photo?: string }
interface GiftScheme {
  _id: string;
  products: Product[];
  giftType: GiftType;
  giftName: string;
  cashAmount?: number;
  minQuantity: number;
  maxQuantity: number;
  status: "Active" | "Inactive";
  expiresAt?: string;
}
interface EligibleCustomer {
  id: string;
  customer: { name: string; phone: string; email?: string };
  products: Array<{ id: string; title: string; photo?: string }>;
  purchasedQuantity: number;
  minQuantity: number;
  maxQuantity: number;
  giftType: GiftType;
  giftName: string;
  cashAmount?: number;
}

const emptyForm = {
  products: [] as string[],
  giftType: "Cash" as GiftType,
  giftName: "",
  cashAmount: "",
  minQuantity: "",
  maxQuantity: "",
  status: "Active" as "Active" | "Inactive",
  expiresAt: "",
};

const giftLabel = (gift: { giftType: GiftType; giftName: string; cashAmount?: number }) =>
  gift.giftType === "Cash"
    ? `₹${new Intl.NumberFormat("en-IN").format(gift.cashAmount || 0)} Cash`
    : gift.giftName;

export default function GiftsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [schemes, setSchemes] = useState<GiftScheme[]>([]);
  const [eligibleCustomers, setEligibleCustomers] = useState<EligibleCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GiftScheme | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [giftResponse, productResponse] = await Promise.all([
        fetch("/api/gift-schemes"),
        fetch("/api/products"),
      ]);
      if (!giftResponse.ok) throw new Error("Unable to load gift schemes");
      const giftData = await giftResponse.json();
      setSchemes(giftData.schemes || []);
      setEligibleCustomers(giftData.eligibleCustomers || []);
      if (productResponse.ok) setProducts(await productResponse.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load gifts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (scheme: GiftScheme) => {
    setEditing(scheme);
    setForm({
      products: scheme.products.map((product) => product._id),
      giftType: scheme.giftType,
      giftName: scheme.giftType === "Other" ? scheme.giftName : "",
      cashAmount: scheme.cashAmount?.toString() || "",
      minQuantity: scheme.minQuantity.toString(),
      maxQuantity: scheme.maxQuantity.toString(),
      status: scheme.status,
      expiresAt: scheme.expiresAt?.slice(0, 10) || "",
    });
    setOpen(true);
  };

  const toggleProduct = (productId: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      products: checked
        ? [...current.products, productId]
        : current.products.filter((id) => id !== productId),
    }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.products.length === 0) return toast.error("Select at least one product");
    setSaving(true);
    try {
      const response = await fetch(editing ? `/api/gift-schemes/${editing._id}` : "/api/gift-schemes", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          giftName: form.giftType === "Other" ? form.giftName : form.giftType,
          minQuantity: Number(form.minQuantity),
          maxQuantity: Number(form.maxQuantity),
          cashAmount: form.giftType === "Cash" ? Number(form.cashAmount) : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save gift scheme");
      toast.success(editing ? "Gift scheme updated" : "Gift scheme created");
      setOpen(false);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save gift scheme");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (scheme: GiftScheme) => {
    if (!confirm(`Delete the ${giftLabel(scheme)} scheme?`)) return;
    const response = await fetch(`/api/gift-schemes/${scheme._id}`, { method: "DELETE" });
    if (!response.ok) return toast.error("Unable to delete gift scheme");
    toast.success("Gift scheme deleted");
    fetchData();
  };

  const schemeColumns: DataTableColumnDef<GiftScheme>[] = [
    {
      id: "products", accessorFn: (scheme) => scheme.products.map((product) => product.title).join(", "), header: "Products",
      cell: ({ row }) => <div className="flex max-w-md flex-wrap gap-1.5">{row.original.products.map((product) => <span key={product._id} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{product.title}</span>)}</div>,
    },
    { id: "range", accessorFn: (scheme) => scheme.minQuantity, header: "Quantity Range", cell: ({ row }) => <span className="font-medium text-slate-700">{row.original.minQuantity}–{row.original.maxQuantity} units</span> },
    { id: "gift", accessorFn: (scheme) => giftLabel(scheme), header: "Gift", cell: ({ row }) => <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700"><Gift className="h-3.5 w-3.5" />{giftLabel(row.original)}</span> },
    { id: "expiresAt", accessorFn: (scheme) => scheme.expiresAt ? new Date(scheme.expiresAt).getTime() : Number.MAX_SAFE_INTEGER, header: "Expires", cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.expiresAt ? new Date(row.original.expiresAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Never"}</span> },
    { id: "status", accessorFn: (scheme) => scheme.status, header: "Status", cell: ({ row }) => { const expired = row.original.expiresAt ? new Date(row.original.expiresAt).getTime() < Date.now() : false; const label = expired ? "Expired" : row.original.status; return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${expired ? "bg-red-100 text-red-700" : row.original.status === "Active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{label}</span>; } },
    {
      id: "actions", header: "Actions", enableSorting: false, meta: { className: "text-right" },
      cell: ({ row }) => <div className="flex justify-end gap-1"><PermissionGate module="gifts" action="update"><Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button></PermissionGate><PermissionGate module="gifts" action="delete"><Button variant="ghost" size="icon" onClick={() => remove(row.original)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button></PermissionGate></div>,
    },
  ];

  const customerColumns: DataTableColumnDef<EligibleCustomer>[] = [
    { id: "customer", accessorFn: (entry) => entry.customer.name, header: "Customer", cell: ({ row }) => <div><p className="font-medium text-slate-800">{row.original.customer.name || "Saved customer"}</p><p className="text-xs text-slate-500">{row.original.customer.phone}</p></div> },
    { id: "products", accessorFn: (entry) => entry.products.map((product) => product.title).join(", "), header: "Qualifying Products", cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.products.map((product) => product.title).join(", ")}</span> },
    { id: "quantity", accessorFn: (entry) => entry.purchasedQuantity, header: "Purchased", cell: ({ row }) => <span className="font-semibold text-emerald-700">{row.original.purchasedQuantity} units</span> },
    { id: "gift", accessorFn: (entry) => giftLabel(entry), header: "Eligible Gift", cell: ({ row }) => <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800"><Gift className="h-3.5 w-3.5" />{giftLabel(row.original)}</span> },
  ];

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><h1 className="text-3xl font-bold text-slate-800">Gift Schemes</h1><p className="mt-1 text-slate-600">Reward customers based on combined purchase quantities from selected products.</p></div>
          <PermissionGate module="gifts" action="create"><Button onClick={openCreate} className="gap-2 bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4" />Add Gift Scheme</Button></PermissionGate>
        </div>

        {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div> : (
          <>
            <section className="space-y-3"><div className="flex items-center gap-2"><Gift className="h-5 w-5 text-amber-500" /><h2 className="text-lg font-semibold text-slate-800">Schemes</h2></div><DataTable columns={schemeColumns} data={schemes} title="Gift schemes" getRowId={(scheme) => scheme._id} emptyState={<Card className="py-12 text-center text-slate-500">No gift schemes created yet.</Card>} /></section>
            <section className="space-y-3"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-emerald-600" /><h2 className="text-lg font-semibold text-slate-800">Eligible Customers</h2><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{eligibleCustomers.length}</span></div><DataTable columns={customerColumns} data={eligibleCustomers} title="Customers who earned gifts" getRowId={(entry) => entry.id} emptyState={<Card className="py-12 text-center text-slate-500">No customer has reached a gift quantity yet.</Card>} /></section>
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Gift Scheme" : "Add Gift Scheme"}</DialogTitle><DialogDescription>Select multiple products. Their sold quantities are combined when checking eligibility.</DialogDescription></DialogHeader>
          <form onSubmit={save} className="space-y-5">
            <div className="space-y-2"><Label>Products *</Label><div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border p-2">{products.map((product) => <label key={product._id} className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-slate-50"><Checkbox checked={form.products.includes(product._id)} onCheckedChange={(checked) => toggleProduct(product._id, checked === true)} /><span className="text-sm text-slate-700">{product.title}</span></label>)}</div><p className="text-xs text-slate-500">{form.products.length} product(s) selected</p></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Minimum Quantity *</Label><Input type="number" min="1" step="1" value={form.minQuantity} onChange={(event) => setForm((current) => ({ ...current, minQuantity: event.target.value }))} required /></div><div className="space-y-2"><Label>Maximum Quantity *</Label><Input type="number" min="1" step="1" value={form.maxQuantity} onChange={(event) => setForm((current) => ({ ...current, maxQuantity: event.target.value }))} required /></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Gift Type *</Label><Select value={form.giftType} onValueChange={(giftType: GiftType) => setForm((current) => ({ ...current, giftType }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="TV">TV</SelectItem><SelectItem value="Fridge">Fridge</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>{form.giftType === "Cash" ? <div className="space-y-2"><Label>Cash Amount *</Label><Input type="number" min="1" value={form.cashAmount} onChange={(event) => setForm((current) => ({ ...current, cashAmount: event.target.value }))} required /></div> : form.giftType === "Other" ? <div className="space-y-2"><Label>Gift Name *</Label><Input value={form.giftName} onChange={(event) => setForm((current) => ({ ...current, giftName: event.target.value }))} placeholder="e.g. Mixer Grinder" required /></div> : <div className="space-y-2"><Label>Gift</Label><Input value={form.giftType} disabled /></div>}</div>
            <div className="space-y-2"><Label>Gift Expiry Date (Optional)</Label><Input type="date" min={new Date().toISOString().slice(0, 10)} value={form.expiresAt} onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))} /><p className="text-xs text-slate-500">Leave empty for an offer that never expires. When selected, customers can qualify through the end of that date.</p></div>
            <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(status: "Active" | "Inactive") => setForm((current) => ({ ...current, status }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></div>
            <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Update Scheme" : "Create Scheme"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
