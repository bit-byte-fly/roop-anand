"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Package,
  FileBarChart,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  UserCircle,
  ShoppingCart,
  Shield,
  BadgePercent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionModule } from "@/types/permissions";

interface SidebarProps {
  className?: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  module: PermissionModule;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    module: "dashboard",
  },
  {
    title: "Employees",
    href: "/admin/employees",
    icon: Users,
    module: "employees",
  },
  {
    title: "Customers",
    href: "/admin/customers",
    icon: UserCircle,
    module: "customers",
  },
  {
    title: "Products",
    href: "/admin/products",
    icon: Package,
    module: "products",
  },
  {
    title: "GST Master",
    href: "/admin/gst-master",
    icon: BadgePercent,
    module: "products",
  },
  {
    title: "Product Requests",
    href: "/admin/product-requests",
    icon: ShoppingCart,
    module: "productRequests",
  },
  {
    title: "Sales",
    href: "/admin/sales",
    icon: FileBarChart,
    module: "sales",
  },
  {
    title: "Requests",
    href: "/admin/requests",
    icon: ClipboardList,
    module: "requests",
  },
  {
    title: "Invoices",
    href: "/admin/invoices",
    icon: FileText,
    module: "invoices",
  },
];

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { canAccess, isSuperAdmin, role, isLoading } = usePermissions();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/admin/login" });
  };

  // Filter nav items based on permissions
  const visibleNavItems = navItems.filter((item) => canAccess(item.module));

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-white border-r border-neutral-200 transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Image
              src="/roop-anand-logo.png"
              alt="Roop Anand logo"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-contain"
              priority
            />
            <span className="font-semibold text-slate-800">Roop Anand</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {!isLoading &&
          visibleNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}

        {/* Admin Management - Super Admin Only */}
        {!isLoading && isSuperAdmin() && (
          <Link
            href="/admin/admins"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === "/admin/admins"
                ? "bg-indigo-50 text-indigo-600"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Shield className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Admins</span>}
          </Link>
        )}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-neutral-200">
        {/* User Info */}
        {!collapsed && !isLoading && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs">
                {isSuperAdmin() ? "SA" : "A"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">
                {isSuperAdmin() ? "Super Admin" : "Sub Admin"}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {role === "super-admin" ? "Full Access" : "Limited Access"}
              </p>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full text-red-600 hover:bg-red-50 hover:text-red-700",
            collapsed ? "justify-center px-2" : "justify-start"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="ml-3">Logout</span>}
        </Button>
      </div>
    </div>
  );
}
