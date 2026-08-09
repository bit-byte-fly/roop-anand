"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { OrganizationSettingsForm } from "@/components/invoices/OrganizationSettingsForm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/hooks/usePermissions";

const routeLabels: Record<string, string> = {
  employees: "Employees",
  customers: "Customers",
  products: "Products",
  "gst-master": "GST Master",
  "product-requests": "Product Requests",
  sales: "Sales",
  requests: "Requests",
  invoices: "Direct Invoices",
  admins: "Admins",
};

const formatSegment = (segment: string) => {
  if (/^[a-f0-9]{24}$/i.test(segment)) return "Details";
  return (
    routeLabels[segment] ||
    segment
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
};

export function AdminHeader() {
  const { data: session } = useSession();
  const { can, canAccess } = usePermissions();
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const pathSegments = pathname
    .split("/")
    .filter(Boolean)
    .slice(1);
  const breadcrumbItems = pathSegments.map((segment, index) => ({
    label: formatSegment(segment),
    href: `/admin/${pathSegments.slice(0, index + 1).join("/")}`,
  }));

  const adminName = session?.user?.name || "Admin";
  const adminEmail = session?.user?.email || "";
  const adminInitials = adminName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-2 backdrop-blur">
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1.5 text-sm"
        >
          {canAccess("dashboard") ? (
            <Link
              href="/admin"
              aria-current={breadcrumbItems.length === 0 ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 transition-colors hover:text-indigo-600 ${
                breadcrumbItems.length === 0
                  ? "font-semibold text-slate-900"
                  : "font-medium text-slate-500"
              }`}
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          ) : (
            <span className="flex shrink-0 items-center gap-1.5 font-medium text-slate-500">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </span>
          )}

          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;
            return (
              <div key={item.href} className="flex min-w-0 items-center gap-1.5">
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                {isLast ? (
                  <span
                    aria-current="page"
                    className="truncate font-semibold text-slate-900"
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="truncate font-medium text-slate-500 transition-colors hover:text-indigo-600"
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-11 gap-2 px-2 sm:px-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-indigo-100 text-xs font-semibold text-indigo-700">
                  {adminInitials || "AD"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden max-w-36 text-left sm:block">
                <p className="truncate text-sm font-medium text-slate-800">
                  {adminName}
                </p>
                <p className="truncate text-xs text-slate-500">Profile menu</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <p className="font-medium text-slate-900">{adminName}</p>
              {adminEmail && (
                <p className="truncate text-xs font-normal text-slate-500">
                  {adminEmail}
                </p>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {can("invoices", "orgSettings") && (
              <DropdownMenuItem onSelect={() => setIsSettingsOpen(true)}>
                <Settings />
                Business Profile
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-medium text-slate-500">
              Shortcuts
            </DropdownMenuLabel>
            {canAccess("dashboard") && (
              <DropdownMenuItem asChild>
                <Link href="/admin">
                  <LayoutDashboard />
                  Dashboard
                </Link>
              </DropdownMenuItem>
            )}
            {canAccess("sales") && (
              <DropdownMenuItem asChild>
                <Link href="/admin/sales">
                  <ShoppingBag />
                  Sales
                </Link>
              </DropdownMenuItem>
            )}
            {canAccess("invoices") && (
              <DropdownMenuItem asChild>
                <Link href="/admin/invoices">
                  <FileText />
                  Direct Invoices
                </Link>
              </DropdownMenuItem>
            )}
            {canAccess("products") && (
              <DropdownMenuItem asChild>
                <Link href="/admin/products">
                  <Package />
                  Products
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => signOut({ callbackUrl: "/admin/login" })}
              className="text-red-600 focus:bg-red-50 focus:text-red-700"
            >
              <LogOut />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <OrganizationSettingsForm
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={() => {
          toast.success("Business profile updated for all invoices");
        }}
      />
    </>
  );
}
