"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useMemo } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Sidebar } from "@/components/ui/sidebar";
import { AdminHeader } from "@/components/ui/admin-header";
import { Toaster } from "sonner";
import { PermissionModule } from "@/types/permissions";
import {
  canAccessModule,
  isSuperAdmin as checkSuperAdmin,
} from "@/lib/permissions";

// Module to path mapping
const MODULE_PATHS: Record<PermissionModule, string> = {
  dashboard: "/admin",
  products: "/admin/products",
  gifts: "/admin/gifts",
  employees: "/admin/employees",
  customers: "/admin/customers",
  productRequests: "/admin/product-requests",
  sales: "/admin/sales",
  invoices: "/admin/invoices",
  requests: "/admin/requests",
  admins: "/admin/admins",
};

// Order of modules to check for first accessible page
const MODULE_ORDER: PermissionModule[] = [
  "products",
  "gifts",
  "employees",
  "customers",
  "productRequests",
  "sales",
  "invoices",
  "requests",
  "dashboard",
];

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  // Extract stable values from session
  const role = session?.user?.role;
  const permissions = session?.user?.permissions || {};
  const isSuperAdmin = checkSuperAdmin(role);

  // Check if sub-admin has dashboard access
  const hasDashboardAccess = useMemo(() => {
    if (isSuperAdmin) return true;
    return canAccessModule(permissions, "dashboard");
  }, [permissions, isSuperAdmin]);

  // Check if sub-admin has ANY permissions at all
  const hasAnyPermission = useMemo(() => {
    if (isSuperAdmin) return true;
    // Check dashboard and all other modules
    if (canAccessModule(permissions, "dashboard")) return true;
    return MODULE_ORDER.some((module) => canAccessModule(permissions, module));
  }, [permissions, isSuperAdmin]);

  useEffect(() => {
    // Wait for session to load
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/admin/login");
      return;
    }

    // If we don't have session data yet, wait
    if (!session?.user) return;

    // Super admins can access dashboard directly
    if (isSuperAdmin) return;

    // If sub-admin has no permissions at all, don't redirect - show no access
    if (!hasAnyPermission) return;

    // For sub-admins on the main dashboard who DON'T have dashboard access
    // redirect to first accessible page
    if (
      pathname === "/admin" &&
      !hasDashboardAccess &&
      !hasRedirected.current
    ) {
      // Find first accessible module (non-dashboard)
      const firstAccessible = MODULE_ORDER.find((module) =>
        canAccessModule(permissions, module)
      );

      if (firstAccessible) {
        hasRedirected.current = true;
        router.replace(MODULE_PATHS[firstAccessible]);
      }
    }
  }, [
    status,
    pathname,
    isSuperAdmin,
    session,
    permissions,
    router,
    hasAnyPermission,
    hasDashboardAccess,
  ]);

  // Reset redirect flag when pathname changes
  useEffect(() => {
    hasRedirected.current = false;
  }, [pathname]);

  // Show loading while session is loading
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/admin/login");
    return null;
  }

  // Show no access message for sub-admins with no permissions
  if (!isSuperAdmin && !hasAnyPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Access Restricted
          </h1>
          <p className="text-slate-600 mb-6">
            You don&apos;t have access to any modules yet. Please contact your
            administrator to grant you the necessary permissions.
          </p>
          <button
            onClick={() => {
              import("next-auth/react").then(({ signOut }) => {
                signOut({ callbackUrl: "/admin/login" });
              });
            }}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
        <Toaster richColors position="top-right" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen max-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
        <AdminHeader />
        <main className="flex-1 overflow-auto bg-white">{children}</main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
