// Standard CRUD actions
export type StandardAction = 'read' | 'create' | 'update' | 'delete';

// Special actions for specific modules
export type SpecialAction = 
  | 'toggleStatus'    // Products, Employees
  | 'assignProducts'  // Employees
  | 'updateStatus'    // Product Requests
  | 'manageNotes'     // Product Requests
  | 'approve'         // Requests (Stock/Money)
  | 'reject'          // Requests (Stock/Money)
  | 'orgSettings';    // Invoices - Organization Settings

// All possible permission actions
export type PermissionAction = StandardAction | SpecialAction;

// Modules that can have permissions
export type PermissionModule = 
  | 'dashboard' 
  | 'products' 
  | 'gifts'
  | 'employees' 
  | 'customers' 
  | 'productRequests' 
  | 'sales' 
  | 'invoices' 
  | 'requests'
  | 'admins';

// Permission object structure
export type Permissions = {
  [K in PermissionModule]?: PermissionAction[];
};

// Admin role type
export type AdminRole = 'super-admin' | 'sub-admin';

// Admin user interface for session
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: Permissions;
}
