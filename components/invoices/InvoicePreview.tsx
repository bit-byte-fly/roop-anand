"use client";

import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, Loader2 } from "lucide-react";

interface OrganizationSettings {
  companyName: string;
  logo?: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  gstName?: string;
  gstRate?: number;
  gstAmount?: number;
  lineTotal?: number;
}

interface Invoice {
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
  items: InvoiceItem[];
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
  total: number;
  amountDue: number;
  notes?: string;
  status: string;
}

interface InvoicePreviewProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoicePreview({
  invoice,
  isOpen,
  onClose,
}: InvoicePreviewProps) {
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchOrgSettings();
    }
  }, [isOpen]);

  const fetchOrgSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/organization-settings");
      if (res.ok) {
        const data = await res.json();
        setOrgSettings(data);
      }
    } catch (error) {
      console.error("Error fetching org settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handlePrint = () => {
    if (!invoice) return;

    const logoHtml = orgSettings?.logo
      ? `<img src="${orgSettings.logo}" alt="Logo" style="max-width: 100px; max-height: 100px; object-fit: contain;" />`
      : "";

    const fromAddress = orgSettings?.address
      ? `
        ${
          orgSettings.address.street
            ? `<div>${orgSettings.address.street}</div>`
            : ""
        }
        <div>${[
          orgSettings.address.city,
          orgSettings.address.state,
          orgSettings.address.pincode,
        ]
          .filter(Boolean)
          .join(", ")}</div>
        ${
          orgSettings.address.country
            ? `<div>${orgSettings.address.country}</div>`
            : ""
        }
      `
      : "";

    const customerAddress = `
      ${
        invoice.customer.address ? `<div>${invoice.customer.address}</div>` : ""
      }
      <div>${[
        invoice.customer.city,
        invoice.customer.state,
        invoice.customer.pincode,
      ]
        .filter(Boolean)
        .join(", ")}</div>
    `;

    const itemsRows = invoice.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 16px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500; color: #4f46e5;">${
          item.description
        }${item.gstRate ? `<div style="font-size: 11px; color: #4f46e5; margin-top: 4px;">${item.gstName || "GST"} ${item.gstRate}%</div>` : ""}</td>
        <td style="padding: 16px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151;">${
          item.quantity
        }</td>
        <td style="padding: 16px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151;">${formatCurrency(
          item.unitPrice
        )}</td>
        <td style="padding: 16px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #111827;">${formatCurrency(
          item.lineTotal ?? item.amount + (item.gstAmount || 0)
        )}</td>
      </tr>
    `
      )
      .join("");

    const taxRow =
      invoice.taxAmount && invoice.taxAmount > 0
        ? `
      <tr>
        <td style="padding: 10px 0; color: #6b7280;">GST (product-specific)</td>
        <td style="padding: 10px 0; text-align: right; color: #374151;">${formatCurrency(
          invoice.taxAmount || 0
        )}</td>
      </tr>
    `
        : "";

    const discountRow =
      invoice.discount && invoice.discount > 0
        ? `
      <tr>
        <td style="padding: 10px 0; color: #6b7280;">Discount</td>
        <td style="padding: 10px 0; text-align: right; color: #dc2626;">-${formatCurrency(
          invoice.discount
        )}</td>
      </tr>
    `
        : "";

    const notesSection = invoice.notes
      ? `
      <div style="margin-top: 40px; padding: 20px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #6366f1; page-break-inside: avoid; break-inside: avoid;">
        <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Notes</div>
        <div style="font-size: 14px; color: #374151; white-space: pre-wrap;">${invoice.notes}</div>
      </div>
    `
      : "";

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #1f2937;
              line-height: 1.6;
              background: white;
            }
            
            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
              padding: 50px;
            }
            
            @media print {
              @page {
                margin: 0.5in;
                margin-top: 0.3in;
                margin-bottom: 0.3in;
              }
              body { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
              }
              .invoice-container { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 50px; padding-bottom: 30px; border-bottom: 2px solid #e5e7eb;">
              <div>
                <h1 style="font-size: 42px; font-weight: 700; color: #111827; margin-bottom: 20px; letter-spacing: -0.02em;">INVOICE</h1>
                <table style="font-size: 14px;">
                  <tr>
                    <td style="color: #6b7280; padding-right: 16px; padding-bottom: 6px;">Invoice Number</td>
                    <td style="color: #111827; font-weight: 600; padding-bottom: 6px;">${
                      invoice.invoiceNumber
                    }</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; padding-right: 16px; padding-bottom: 6px;">Date of Issue</td>
                    <td style="color: #111827; padding-bottom: 6px;">${format(
                      new Date(invoice.dateOfIssue),
                      "MMMM dd, yyyy"
                    )}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; padding-right: 16px;">Due Date</td>
                    <td style="color: #111827;">${format(
                      new Date(invoice.dueDate),
                      "MMMM dd, yyyy"
                    )}</td>
                  </tr>
                </table>
              </div>
              <div style="text-align: right;">
                ${logoHtml}
              </div>
            </div>

            <!-- Addresses -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 50px;">
              <div style="width: 45%;">
                <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">From</div>
                <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 8px;">${
                  orgSettings?.companyName || "Your Company"
                }</div>
                <div style="font-size: 14px; color: #6b7280; line-height: 1.7;">
                  ${fromAddress}
                  ${orgSettings?.phone ? `<div>${orgSettings.phone}</div>` : ""}
                  ${orgSettings?.email ? `<div>${orgSettings.email}</div>` : ""}
                </div>
              </div>
              <div style="width: 45%;">
                <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">Bill To</div>
                <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 8px;">${
                  invoice.customer.name
                }</div>
                <div style="font-size: 14px; color: #6b7280; line-height: 1.7;">
                  ${customerAddress}
                  ${
                    invoice.customer.phone
                      ? `<div>${invoice.customer.phone}</div>`
                      : ""
                  }
                  ${
                    invoice.customer.email
                      ? `<div>${invoice.customer.email}</div>`
                      : ""
                  }
                </div>
              </div>
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 14px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e5e7eb;">Description</th>
                  <th style="padding: 14px 12px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e5e7eb;">Qty</th>
                  <th style="padding: 14px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e5e7eb;">Unit Price</th>
                  <th style="padding: 14px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e5e7eb;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <!-- Totals -->
            <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
              <table style="width: 320px; font-size: 14px;">
                <tr>
                  <td style="padding: 10px 0; color: #6b7280;">Subtotal</td>
                  <td style="padding: 10px 0; text-align: right; color: #374151;">${formatCurrency(
                    invoice.subtotal
                  )}</td>
                </tr>
                ${taxRow}
                ${discountRow}
                <tr>
                  <td style="padding: 10px 0; color: #6b7280;">Total</td>
                  <td style="padding: 10px 0; text-align: right; font-weight: 500; color: #111827;">${formatCurrency(
                    invoice.total
                  )}</td>
                </tr>
                <tr style="border-top: 2px solid #111827;">
                  <td style="padding: 16px 0; font-size: 16px; font-weight: 600; color: #111827;">Amount Due</td>
                  <td style="padding: 16px 0; text-align: right; font-size: 18px; font-weight: 700; color: #111827;">${formatCurrency(
                    invoice.amountDue
                  )}</td>
                </tr>
              </table>
            </div>

            ${notesSection}

            <!-- Footer -->
            <div style="margin-top: 60px; padding-top: 30px; border-top: 2px solid #e5e7eb; page-break-inside: avoid; break-inside: avoid;">
              <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                  <div style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 6px;">${
                    orgSettings?.companyName || ""
                  }</div>
                  ${
                    orgSettings?.gstin
                      ? `<div style="font-size: 13px; color: #6b7280;">GSTIN: ${orgSettings.gstin}</div>`
                      : ""
                  }
                  ${
                    orgSettings?.pan
                      ? `<div style="font-size: 13px; color: #6b7280;">PAN: ${orgSettings.pan}</div>`
                      : ""
                  }
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the invoice");
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    // Wait for fonts and images to load
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
        {/* Header with actions */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between">
          <DialogTitle className="text-lg font-semibold">
            Invoice Preview
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="p-8 bg-white">
            {/* Header */}
            <div className="flex justify-between items-start mb-12 pb-8 border-b-2 border-slate-200">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-5 tracking-tight">
                  INVOICE
                </h1>
                <div className="space-y-1.5 text-sm">
                  <div className="flex gap-4">
                    <span className="text-slate-500 w-28">Invoice Number</span>
                    <span className="text-slate-900 font-semibold">
                      {invoice.invoiceNumber}
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-slate-500 w-28">Date of Issue</span>
                    <span className="text-slate-700">
                      {format(new Date(invoice.dateOfIssue), "MMMM dd, yyyy")}
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-slate-500 w-28">Due Date</span>
                    <span className="text-slate-700">
                      {format(new Date(invoice.dueDate), "MMMM dd, yyyy")}
                    </span>
                  </div>
                </div>
              </div>
              {orgSettings?.logo && (
                <img
                  src={orgSettings.logo}
                  alt="Company Logo"
                  className="max-w-[100px] max-h-[100px] object-contain"
                />
              )}
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-2 gap-12 mb-12">
              {/* From */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  From
                </p>
                <p className="text-base font-semibold text-slate-900 mb-2">
                  {orgSettings?.companyName || "Your Company"}
                </p>
                {orgSettings?.address && (
                  <div className="text-sm text-slate-600 space-y-0.5">
                    {orgSettings.address.street && (
                      <p>{orgSettings.address.street}</p>
                    )}
                    <p>
                      {[
                        orgSettings.address.city,
                        orgSettings.address.state,
                        orgSettings.address.pincode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {orgSettings.address.country && (
                      <p>{orgSettings.address.country}</p>
                    )}
                    {orgSettings.phone && <p>{orgSettings.phone}</p>}
                    {orgSettings.email && <p>{orgSettings.email}</p>}
                  </div>
                )}
              </div>

              {/* Bill To */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Bill To
                </p>
                <p className="text-base font-semibold text-slate-900 mb-2">
                  {invoice.customer.name}
                </p>
                <div className="text-sm text-slate-600 space-y-0.5">
                  {invoice.customer.address && (
                    <p>{invoice.customer.address}</p>
                  )}
                  <p>
                    {[
                      invoice.customer.city,
                      invoice.customer.state,
                      invoice.customer.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {invoice.customer.phone && <p>{invoice.customer.phone}</p>}
                  {invoice.customer.email && <p>{invoice.customer.email}</p>}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-8">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b-2 border-slate-200">
                    Description
                  </th>
                  <th className="text-center py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b-2 border-slate-200">
                    Qty
                  </th>
                  <th className="text-right py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b-2 border-slate-200">
                    Unit Price
                  </th>
                  <th className="text-right py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b-2 border-slate-200">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="py-4 px-4">
                      <p className="font-medium text-indigo-600">
                        {item.description}
                      </p>
                      {(item.gstRate || 0) > 0 && (
                        <p className="mt-1 text-xs text-indigo-500">
                          {item.gstName || "GST"} {item.gstRate}%
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center text-slate-600">
                      {item.quantity}
                    </td>
                    <td className="py-4 px-4 text-right text-slate-600">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-slate-900">
                      {formatCurrency(
                        item.lineTotal ?? item.amount + (item.gstAmount || 0)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-10">
              <div className="w-80">
                <div className="flex justify-between py-2.5 text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-700">
                    {formatCurrency(invoice.subtotal)}
                  </span>
                </div>
                {(invoice.taxAmount || 0) > 0 && (
                  <div className="flex justify-between py-2.5 text-sm">
                    <span className="text-slate-500">
                      GST (product-specific)
                    </span>
                    <span className="text-slate-700">
                      {formatCurrency(invoice.taxAmount || 0)}
                    </span>
                  </div>
                )}
                {invoice.discount && invoice.discount > 0 && (
                  <div className="flex justify-between py-2.5 text-sm">
                    <span className="text-slate-500">Discount</span>
                    <span className="text-red-600">
                      -{formatCurrency(invoice.discount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2.5 text-sm">
                  <span className="text-slate-500">Total</span>
                  <span className="text-slate-900 font-medium">
                    {formatCurrency(invoice.total)}
                  </span>
                </div>
                <div className="flex justify-between py-4 mt-2 border-t-2 border-slate-900">
                  <span className="text-base font-semibold text-slate-900">
                    Amount Due
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {formatCurrency(invoice.amountDue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mb-10 p-5 bg-slate-50 rounded-lg border-l-4 border-indigo-500">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Notes
                </p>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="pt-8 border-t-2 border-slate-200">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">
                    {orgSettings?.companyName}
                  </p>
                  {orgSettings?.gstin && (
                    <p className="text-sm text-slate-500">
                      GSTIN: {orgSettings.gstin}
                    </p>
                  )}
                  {orgSettings?.pan && (
                    <p className="text-sm text-slate-500">
                      PAN: {orgSettings.pan}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
