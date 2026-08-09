"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  Building2,
  ChevronDown,
  FileText,
  LayoutDashboard,
  Loader2,
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

interface OrganizationProfile {
  companyName: string;
  logo?: string;
  phone?: string;
  email?: string;
}

const fallbackProfile: OrganizationProfile = {
  companyName: "Roop Anand",
  logo: "/roop-anand-logo.png",
};

export function AdminHeader() {
  const { data: session } = useSession();
  const { can, canAccess } = usePermissions();
  const [profile, setProfile] = useState<OrganizationProfile>(fallbackProfile);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/organization-settings");
      if (!response.ok) return;

      const data = (await response.json()) as OrganizationProfile;
      setProfile({
        ...fallbackProfile,
        ...data,
        companyName: data.companyName || fallbackProfile.companyName,
        logo: data.logo || fallbackProfile.logo,
      });
    } catch (error) {
      console.error("Failed to load organization profile:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            ) : profile.logo ? (
              <Image
                src={profile.logo}
                alt={`${profile.companyName} logo`}
                width={44}
                height={44}
                className="h-full w-full object-contain"
                unoptimized={profile.logo.startsWith("http")}
                priority
              />
            ) : (
              <Building2 className="h-5 w-5 text-indigo-600" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">
              {profile.companyName}
            </p>
            <p className="hidden truncate text-xs text-slate-500 sm:block">
              {[profile.phone, profile.email].filter(Boolean).join(" · ") ||
                "Admin Panel"}
            </p>
          </div>
        </div>

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
          fetchProfile();
          toast.success("Business profile updated for all invoices");
        }}
      />
    </>
  );
}
