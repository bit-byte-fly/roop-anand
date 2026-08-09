"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
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
  Download,
  ImageOff,
  Loader2,
  Share2,
} from "lucide-react";

interface SaleItem {
  product?: {
    _id: string;
    title: string;
    photo?: string;
  } | null;
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

interface OrganizationSettings {
  companyName: string;
  logo?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
}

const defaultOrganization: OrganizationSettings = {
  companyName: "Roop Anand",
  logo: "/roop-anand-logo.png",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getInvoiceNumber = (sale: Sale) =>
  `RA-${sale._id.slice(-8).toUpperCase()}`;

const getInvoiceFileName = (sale: Sale) =>
  `Roop-Anand-Invoice-${getInvoiceNumber(sale)}`;

async function getOrganizationSettings(): Promise<OrganizationSettings> {
  let settings = defaultOrganization;

  try {
    const response = await fetch("/api/organization-settings");
    if (response.ok) {
      settings = (await response.json()) as OrganizationSettings;
    }
  } catch {
    // The built-in app branding is used when organization settings are unavailable.
  }

  return {
    ...defaultOrganization,
    ...settings,
    companyName: settings.companyName || defaultOrganization.companyName,
    logo: new URL("/roop-anand-logo.png", window.location.origin).href,
  };
}

async function waitForInvoiceImages(invoiceWindow: Window) {
  const images = Array.from(invoiceWindow.document.images);

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          const finish = () => {
            image.removeEventListener("load", finish);
            image.removeEventListener("error", finish);
            window.clearTimeout(timeoutId);
            resolve();
          };

          image.addEventListener("load", finish, { once: true });
          image.addEventListener("error", finish, { once: true });
          const timeoutId = window.setTimeout(finish, 3000);
        })
    )
  );
}

function buildSaleInvoiceHtml(
  sale: Sale,
  organization: OrganizationSettings
) {
  const subtotal =
    sale.subtotal ??
    sale.items.reduce(
      (sum, item) =>
        sum + (item.taxableAmount ?? item.pricePerUnit * item.quantity),
      0
    );
  const totalGst =
    sale.totalGst ??
    sale.items.reduce((sum, item) => sum + (item.gstAmount || 0), 0);
  const organizationAddress = [
    organization.address?.street,
    organization.address?.city,
    organization.address?.state,
    organization.address?.pincode,
    organization.address?.country,
  ]
    .filter(Boolean)
    .join(", ");
  const billingAddress =
    sale.customer.billingAddress || sale.customer.address || "Not provided";
  const itemRows = sale.items
    .map((item, index) => {
      const taxableAmount =
        item.taxableAmount ?? item.pricePerUnit * item.quantity;
      const gstLabel = (item.gstRate || 0) > 0
        ? `${item.gstName || "GST"} (${item.gstRate}%)`
        : "No GST";

      return `
        <tr>
          <td class="center">${index + 1}</td>
          <td><strong>${escapeHtml(item.productTitle)}</strong></td>
          <td class="center">${item.quantity}</td>
          <td class="right">${escapeHtml(formatCurrency(item.pricePerUnit))}</td>
          <td class="right">${escapeHtml(formatCurrency(taxableAmount))}</td>
          <td class="right">
            ${escapeHtml(gstLabel)}
            <div class="muted">${escapeHtml(formatCurrency(item.gstAmount || 0))}</div>
          </td>
          <td class="right strong">${escapeHtml(formatCurrency(item.totalPrice))}</td>
        </tr>`;
    })
    .join("");

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(getInvoiceFileName(sale))}</title>
      <style>
        @page { size: A4; margin: 14mm; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #fff; color: #172033; font-family: Arial, Helvetica, sans-serif; font-size: 12px; }
        .invoice { max-width: 900px; margin: 0 auto; padding: 28px; }
        .header { display: flex; justify-content: space-between; gap: 30px; padding-bottom: 24px; border-bottom: 3px solid #4f46e5; }
        .brand { display: flex; align-items: flex-start; gap: 16px; }
        .logo { width: 82px; height: 82px; object-fit: contain; }
        .company { margin: 0 0 7px; font-size: 24px; line-height: 1.1; color: #111827; }
        .meta { color: #64748b; line-height: 1.55; }
        .title { text-align: right; }
        .title h1 { margin: 0 0 10px; font-size: 31px; letter-spacing: 2px; color: #4f46e5; }
        .title div { margin-top: 5px; }
        .label { color: #64748b; }
        .details { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; margin: 26px 0; }
        .box { min-height: 118px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 9px; }
        .box h2 { margin: 0 0 11px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #4f46e5; }
        .box p { margin: 5px 0; line-height: 1.45; }
        table { width: 100%; border-collapse: collapse; }
        thead { background: #eef2ff; }
        th { padding: 11px 8px; text-align: left; color: #3730a3; font-size: 10px; text-transform: uppercase; letter-spacing: .35px; }
        td { padding: 12px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .center { text-align: center; }
        .right { text-align: right; white-space: nowrap; }
        .strong { font-weight: 700; }
        .muted { margin-top: 4px; color: #64748b; font-size: 10px; }
        .totals { width: 330px; margin: 24px 0 0 auto; }
        .totals td { padding: 8px 4px; border: 0; }
        .grand td { padding-top: 13px; border-top: 2px solid #4f46e5; color: #312e81; font-size: 16px; font-weight: 700; }
        .footer { margin-top: 42px; padding-top: 18px; border-top: 1px solid #e2e8f0; color: #64748b; text-align: center; }
        @media print {
          .invoice { max-width: none; padding: 0; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <main class="invoice">
        <header class="header">
          <div class="brand">
            ${organization.logo ? `<img class="logo" src="${escapeHtml(organization.logo)}" alt="Company logo" />` : ""}
            <div>
              <h2 class="company">${escapeHtml(organization.companyName)}</h2>
              <div class="meta">
                ${organizationAddress ? `<div>${escapeHtml(organizationAddress)}</div>` : ""}
                ${organization.phone ? `<div>Phone: ${escapeHtml(organization.phone)}</div>` : ""}
                ${organization.email ? `<div>Email: ${escapeHtml(organization.email)}</div>` : ""}
                ${organization.gstin ? `<div>GSTIN: ${escapeHtml(organization.gstin)}</div>` : ""}
                ${organization.pan ? `<div>PAN: ${escapeHtml(organization.pan)}</div>` : ""}
              </div>
            </div>
          </div>
          <div class="title">
            <h1>TAX INVOICE</h1>
            <div><span class="label">Invoice:</span> <strong>${escapeHtml(getInvoiceNumber(sale))}</strong></div>
            <div><span class="label">Date:</span> ${escapeHtml(format(new Date(sale.createdAt), "dd MMM yyyy, h:mm a"))}</div>
            <div><span class="label">Payment:</span> ${escapeHtml(sale.paymentMethod)}</div>
          </div>
        </header>

        <section class="details">
          <div class="box">
            <h2>Bill To</h2>
            <p><strong>${escapeHtml(sale.customer.name)}</strong></p>
            <p>${escapeHtml(sale.customer.phone)}</p>
            ${sale.customer.email ? `<p>${escapeHtml(sale.customer.email)}</p>` : ""}
            <p>${escapeHtml(billingAddress)}</p>
          </div>
          <div class="box">
            <h2>Sale Details</h2>
            <p><span class="label">Sold by:</span> ${escapeHtml(sale.employee?.fullName || "Admin")}</p>
            <p><span class="label">Items:</span> ${sale.items.length}</p>
            <p><span class="label">Payment method:</span> ${escapeHtml(sale.paymentMethod)}</p>
          </div>
        </section>

        <table>
          <thead>
            <tr>
              <th class="center">#</th>
              <th>Product</th>
              <th class="center">Qty</th>
              <th class="right">Unit price</th>
              <th class="right">Taxable</th>
              <th class="right">GST</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <table class="totals">
          <tr><td class="label">Subtotal</td><td class="right">${escapeHtml(formatCurrency(subtotal))}</td></tr>
          <tr><td class="label">GST</td><td class="right">${escapeHtml(formatCurrency(totalGst))}</td></tr>
          <tr class="grand"><td>Grand Total</td><td class="right">${escapeHtml(formatCurrency(sale.totalAmount))}</td></tr>
        </table>

        <footer class="footer">Thank you for your business.</footer>
      </main>
    </body>
  </html>`;
}

function buildShareText(sale: Sale) {
  const itemLines = sale.items.map(
    (item) =>
      `${item.productTitle} x ${item.quantity}: ${formatCurrency(item.totalPrice)}`
  );

  return [
    `Invoice ${getInvoiceNumber(sale)}`,
    `Customer: ${sale.customer.name}`,
    ...itemLines,
    `GST: ${formatCurrency(sale.totalGst || 0)}`,
    `Total: ${formatCurrency(sale.totalAmount)}`,
    `Payment: ${sale.paymentMethod}`,
  ].join("\n");
}

export async function downloadSaleInvoice(sale: Sale) {
  const invoiceWindow = window.open("", "_blank", "width=1000,height=800");
  if (!invoiceWindow) {
    toast.error("Please allow popups to download the invoice");
    return;
  }

  invoiceWindow.document.write(
    "<p style='font-family:Arial;padding:24px'>Preparing invoice...</p>"
  );

  try {
    const organization = await getOrganizationSettings();
    const invoiceHtml = buildSaleInvoiceHtml(sale, organization);
    invoiceWindow.document.open();
    invoiceWindow.document.write(invoiceHtml);
    invoiceWindow.document.close();
    invoiceWindow.document.title = getInvoiceFileName(sale);
    await waitForInvoiceImages(invoiceWindow);
    invoiceWindow.focus();
    invoiceWindow.print();
    toast.success("Invoice ready — choose Save as PDF in the print dialog");
  } catch {
    invoiceWindow.close();
    toast.error("Unable to prepare the invoice");
  }
}

export function SaleDetails({ sale, isOpen, onClose }: SaleDetailsProps) {
  const [invoiceAction, setInvoiceAction] = useState<
    "share" | "download" | null
  >(null);

  if (!sale) return null;

  const handleDownloadInvoice = async () => {
    setInvoiceAction("download");
    try {
      await downloadSaleInvoice(sale);
    } finally {
      setInvoiceAction(null);
    }
  };

  const handleShareInvoice = async () => {
    setInvoiceAction("share");

    try {
      const organization = await getOrganizationSettings();
      const shareText = buildShareText(sale);
      const invoiceHtml = buildSaleInvoiceHtml(sale, organization);
      const invoiceFile = new File(
        [invoiceHtml],
        `${getInvoiceFileName(sale)}.html`,
        { type: "text/html" }
      );

      if (navigator.share) {
        const canShareFile = navigator.canShare?.({ files: [invoiceFile] });
        await navigator.share({
          title: `Invoice ${getInvoiceNumber(sale)}`,
          text: shareText,
          ...(canShareFile ? { files: [invoiceFile] } : {}),
        });
        return;
      }

      await navigator.clipboard.writeText(shareText);
      toast.success("Invoice details copied. You can paste and share them.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Unable to share the invoice");
    } finally {
      setInvoiceAction(null);
    }
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

          {/* Invoice Actions */}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleShareInvoice}
              disabled={invoiceAction !== null}
              className="gap-2"
            >
              {invoiceAction === "share" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              Share Invoice
            </Button>
            <Button
              onClick={handleDownloadInvoice}
              disabled={invoiceAction !== null}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              {invoiceAction === "download" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download Invoice
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
