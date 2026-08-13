"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MODULE_LABELS,
  MODULE_STANDARD_ACTIONS,
  MODULE_SPECIAL_ACTIONS,
  SPECIAL_ACTION_LABELS,
  DEFAULT_SUB_ADMIN_PERMISSIONS,
} from "@/lib/permissions";
import {
  PermissionModule,
  PermissionAction,
  Permissions,
  StandardAction,
  SpecialAction,
} from "@/types/permissions";
import { Loader2, Eye, EyeOff } from "lucide-react";

interface AdminFormData {
  email: string;
  password: string;
  name: string;
  isActive: boolean;
  permissions: Permissions;
}

interface AdminFormProps {
  initialData?: Partial<AdminFormData> & { _id?: string };
  onSubmit: (data: AdminFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  isEditing?: boolean;
  isSuperAdminEdit?: boolean;
}

const MODULES_ORDER: PermissionModule[] = [
  "dashboard",
  "products",
  "gifts",
  "employees",
  "customers",
  "productRequests",
  "sales",
  "invoices",
  "requests",
];

const STANDARD_ACTION_LABELS: Record<StandardAction, string> = {
  read: "Read",
  create: "Create",
  update: "Update",
  delete: "Delete",
};

export function AdminForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  isEditing = false,
  isSuperAdminEdit = false,
}: AdminFormProps) {
  const [formData, setFormData] = useState<AdminFormData>({
    email: initialData?.email || "",
    password: "",
    name: initialData?.name || "",
    isActive: initialData?.isActive ?? true,
    permissions: initialData?.permissions || DEFAULT_SUB_ADMIN_PERMISSIONS,
  });
  const [showPassword, setShowPassword] = useState(false);

  const handlePermissionToggle = (
    module: PermissionModule,
    action: PermissionAction,
    checked: boolean
  ) => {
    setFormData((prev) => {
      const currentActions = prev.permissions[module] || [];
      let newActions: PermissionAction[];

      if (checked) {
        newActions = [...currentActions, action];
      } else {
        newActions = currentActions.filter((a) => a !== action);
      }

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [module]: newActions.length > 0 ? newActions : undefined,
        },
      };
    });
  };

  const handleSelectAll = (module: PermissionModule) => {
    const standardActions = MODULE_STANDARD_ACTIONS[module];
    const specialActions = MODULE_SPECIAL_ACTIONS[module];
    // Select all standard and special actions
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: [...standardActions, ...specialActions],
      },
    }));
  };

  const handleClearAll = (module: PermissionModule) => {
    // Clear all permissions for the module
    setFormData((prev) => {
      const newPermissions = { ...prev.permissions };
      delete newPermissions[module];
      return { ...prev, permissions: newPermissions };
    });
  };

  const hasPermission = (
    module: PermissionModule,
    action: PermissionAction
  ): boolean => {
    return formData.permissions[module]?.includes(action) || false;
  };

  const hasAllPermissions = (module: PermissionModule): boolean => {
    const allActions = [
      ...MODULE_STANDARD_ACTIONS[module],
      ...MODULE_SPECIAL_ACTIONS[module],
    ];
    const current = formData.permissions[module] || [];
    return allActions.every((a) => current.includes(a));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Admin name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="admin@example.com"
              required
              disabled={isEditing}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">
            {isEditing
              ? "New Password (leave blank to keep current)"
              : "Password *"}
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder={
                isEditing ? "Leave blank to keep current" : "Min 6 characters"
              }
              required={!isEditing}
              minLength={!isEditing ? 6 : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {!isSuperAdminEdit && (
          <div className="flex items-center gap-3">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: checked })
              }
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active Account
            </Label>
          </div>
        )}
      </div>

      {/* Permissions - hidden for super admin */}
      {!isSuperAdminEdit && (
        <div className="space-y-4">
          <Label className="text-base font-semibold">Permissions</Label>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-slate-600">
                    Module
                  </th>
                  <th className="text-center p-3 text-sm font-medium text-slate-600 w-16">
                    Read
                  </th>
                  <th className="text-center p-3 text-sm font-medium text-slate-600 w-16">
                    Create
                  </th>
                  <th className="text-center p-3 text-sm font-medium text-slate-600 w-16">
                    Update
                  </th>
                  <th className="text-center p-3 text-sm font-medium text-slate-600 w-16">
                    Delete
                  </th>
                  <th className="text-center p-3 text-sm font-medium text-slate-600 w-16">
                    All
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-slate-600">
                    Special Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {MODULES_ORDER.map((module, index) => {
                  const standardActions = MODULE_STANDARD_ACTIONS[module];
                  const specialActions = MODULE_SPECIAL_ACTIONS[module];

                  return (
                    <motion.tr
                      key={module}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b last:border-b-0 hover:bg-slate-50/50"
                    >
                      <td className="p-3 text-sm font-medium text-slate-700">
                        {MODULE_LABELS[module]}
                      </td>
                      {(
                        [
                          "read",
                          "create",
                          "update",
                          "delete",
                        ] as StandardAction[]
                      ).map((action) => {
                        const isAvailable = standardActions.includes(action);
                        return (
                          <td key={action} className="text-center p-3">
                            {isAvailable ? (
                              <Checkbox
                                checked={hasPermission(module, action)}
                                onCheckedChange={(checked) =>
                                  handlePermissionToggle(
                                    module,
                                    action,
                                    checked as boolean
                                  )
                                }
                              />
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center p-3">
                        <Checkbox
                          checked={hasAllPermissions(module)}
                          onCheckedChange={(checked) =>
                            checked
                              ? handleSelectAll(module)
                              : handleClearAll(module)
                          }
                        />
                      </td>
                      <td className="p-3">
                        {specialActions.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {specialActions.map((action) => (
                              <label
                                key={action}
                                className="inline-flex items-center gap-1.5 text-xs cursor-pointer"
                              >
                                <Checkbox
                                  checked={hasPermission(module, action)}
                                  onCheckedChange={(checked) =>
                                    handlePermissionToggle(
                                      module,
                                      action,
                                      checked as boolean
                                    )
                                  }
                                />
                                <span className="text-slate-600">
                                  {SPECIAL_ACTION_LABELS[action]}
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? "Update Admin" : "Create Admin"}
        </Button>
      </div>
    </form>
  );
}
