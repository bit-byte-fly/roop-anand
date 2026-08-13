import { Permissions, PermissionModule, PermissionAction, AdminRole, StandardAction, SpecialAction } from '@/types/permissions';

/**
 * Full permissions for super-admin - has access to everything
 */
export const SUPER_ADMIN_PERMISSIONS: Permissions = {
  dashboard: ['read'],
  products: ['read', 'create', 'update', 'delete', 'toggleStatus'],
  gifts: ['read', 'create', 'update', 'delete'],
  employees: ['read', 'create', 'update', 'delete', 'toggleStatus', 'assignProducts'],
  customers: ['read', 'update', 'delete'],
  productRequests: ['read', 'update', 'delete', 'updateStatus', 'manageNotes'],
  sales: ['read', 'create', 'delete'],
  invoices: ['read', 'create', 'update', 'delete', 'orgSettings'],
  requests: ['read', 'create', 'approve', 'reject'],
  admins: ['read', 'create', 'update', 'delete'],
};

/**
 * Default permissions for new sub-admin (read-only access to dashboard)
 */
export const DEFAULT_SUB_ADMIN_PERMISSIONS: Permissions = {
  dashboard: ['read'],
};

/**
 * Module display names for UI
 */
export const MODULE_LABELS: Record<PermissionModule, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  gifts: 'Gift Schemes',
  employees: 'Employees',
  customers: 'Customers',
  productRequests: 'Product Requests',
  sales: 'Sales',
  invoices: 'Invoices',
  requests: 'Requests (Stock/Money)',
  admins: 'Admin Management',
};

/**
 * Standard CRUD actions available per module
 */
export const MODULE_STANDARD_ACTIONS: Record<PermissionModule, StandardAction[]> = {
  dashboard: ['read'],
  products: ['read', 'create', 'update', 'delete'],
  gifts: ['read', 'create', 'update', 'delete'],
  employees: ['read', 'create', 'update', 'delete'],
  customers: ['read', 'update', 'delete'], // No create - customers sign up via mobile
  productRequests: ['read', 'update', 'delete'], // No create - requests come from customers
  sales: ['read', 'create', 'delete'], // No update - sales are immutable
  invoices: ['read', 'create', 'update', 'delete'],
  requests: ['read', 'create'], // No update/delete - only approve/reject
  admins: ['read', 'create', 'update', 'delete'],
};

/**
 * Special actions available per module
 */
export const MODULE_SPECIAL_ACTIONS: Record<PermissionModule, SpecialAction[]> = {
  dashboard: [],
  products: ['toggleStatus'],
  gifts: [],
  employees: ['toggleStatus', 'assignProducts'],
  customers: [],
  productRequests: ['updateStatus', 'manageNotes'],
  sales: [],
  invoices: ['orgSettings'],
  requests: ['approve', 'reject'],
  admins: [],
};

/**
 * All actions (combined) available per module
 */
export const MODULE_ACTIONS: Record<PermissionModule, PermissionAction[]> = {
  dashboard: ['read'],
  products: ['read', 'create', 'update', 'delete', 'toggleStatus'],
  gifts: ['read', 'create', 'update', 'delete'],
  employees: ['read', 'create', 'update', 'delete', 'toggleStatus', 'assignProducts'],
  customers: ['read', 'update', 'delete'],
  productRequests: ['read', 'update', 'delete', 'updateStatus', 'manageNotes'],
  sales: ['read', 'create', 'delete'],
  invoices: ['read', 'create', 'update', 'delete', 'orgSettings'],
  requests: ['read', 'create', 'approve', 'reject'],
  admins: ['read', 'create', 'update', 'delete'],
};

/**
 * Display labels for special actions
 */
export const SPECIAL_ACTION_LABELS: Record<SpecialAction, string> = {
  toggleStatus: 'Toggle Status',
  assignProducts: 'Assign Products',
  updateStatus: 'Update Status',
  manageNotes: 'Manage Notes',
  approve: 'Approve',
  reject: 'Reject',
  orgSettings: 'Org Settings',
};

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  permissions: Permissions | undefined,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  if (!permissions) return false;
  const modulePermissions = permissions[module];
  if (!modulePermissions) return false;
  return modulePermissions.includes(action);
}

/**
 * Check if user has any of the specified actions for a module
 */
export function hasAnyPermission(
  permissions: Permissions | undefined,
  module: PermissionModule,
  actions: PermissionAction[]
): boolean {
  if (!permissions) return false;
  return actions.some(action => hasPermission(permissions, module, action));
}

/**
 * Check if user has read access to a module (for sidebar visibility)
 */
export function canAccessModule(
  permissions: Permissions | undefined,
  module: PermissionModule
): boolean {
  return hasPermission(permissions, module, 'read');
}

/**
 * Get default permissions based on role
 */
export function getDefaultPermissions(role: AdminRole): Permissions {
  return role === 'super-admin' 
    ? SUPER_ADMIN_PERMISSIONS 
    : DEFAULT_SUB_ADMIN_PERMISSIONS;
}

/**
 * Check if user is super-admin
 */
export function isSuperAdmin(role: AdminRole | undefined): boolean {
  return role === 'super-admin';
}

/**
 * Check if an action is a special action
 */
export function isSpecialAction(action: PermissionAction): action is SpecialAction {
  return ['toggleStatus', 'assignProducts', 'updateStatus', 'manageNotes', 'approve', 'reject', 'orgSettings'].includes(action);
}
