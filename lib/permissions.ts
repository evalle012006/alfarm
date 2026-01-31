/**
 * Permission Definitions and Role-Permission Mapping
 * 
 * Code-based RBAC system for AlFarm admin access control.
 * This is the single source of truth for permissions.
 * 
 * SECURITY:
 * - Unknown roles have NO permissions
 * - Guest role has NO admin permissions
 * - Legacy roles (admin/root) are explicitly mapped to super_admin permissions
 * - Permission checks are allowlist-based
 */

import {
  ROLE_SUPER_ADMIN,
  ROLE_CASHIER,
  ROLE_GUEST,
  LEGACY_ROLE_ADMIN,
  LEGACY_ROLE_ROOT,
  type AdminRole,
} from './roles';

// =============================================================================
// PERMISSION DEFINITIONS
// =============================================================================

/**
 * All available permissions in the system.
 * Format: resource:action
 */
export const ALL_PERMISSIONS = [
  // Booking permissions
  'bookings:read',
  'bookings:create',
  'bookings:update',
  'bookings:cancel',
  'bookings:checkin',
  'bookings:checkout',
  
  // Payment permissions
  'payments:read',
  'payments:collect',
  'payments:void',
  'payments:refund',
  
  // Inventory/Product permissions
  'inventory:read',
  'inventory:manage',
  
  // Staff management permissions
  'staff:read',
  'staff:manage',
  
  // Audit log permissions
  'audit:read',
  
  // RBAC management (future)
  'rbac:manage',
] as const;

/**
 * Permission type - one of the defined permissions
 */
export type Permission = (typeof ALL_PERMISSIONS)[number];

/**
 * Special value indicating all permissions (super admin)
 */
export const FULL_ACCESS = '*' as const;

/**
 * Permission set type - either list of permissions or full access
 */
export type PermissionSet = Permission[] | typeof FULL_ACCESS;

// =============================================================================
// ROLE-PERMISSION MAPPING
// =============================================================================

/**
 * Explicit mapping of roles to their permissions.
 * 
 * SECURITY NOTES:
 * - super_admin: Full access ('*')
 * - cashier: Limited to booking and payment operations
 * - guest: No admin permissions (empty array)
 * - Legacy roles (admin/root): Explicitly mapped to full access
 * - Unknown roles: Not in this map = no permissions
 */
export const ROLE_PERMISSIONS: Record<string, PermissionSet> = {
  // Standard roles
  [ROLE_SUPER_ADMIN]: FULL_ACCESS,
  [ROLE_CASHIER]: [
    'bookings:read',
    'bookings:create',
    'bookings:update',
    'bookings:checkin',
    'bookings:checkout',
    'payments:read',
    'payments:collect',
    'inventory:read',
  ],
  [ROLE_GUEST]: [],
  
  // Legacy roles - explicitly mapped to full access
  // These are NOT normalized; they are explicitly granted permissions
  [LEGACY_ROLE_ADMIN]: FULL_ACCESS,
  [LEGACY_ROLE_ROOT]: FULL_ACCESS,
};

// =============================================================================
// PERMISSION UTILITIES
// =============================================================================

/**
 * Gets the permissions for a given role.
 * 
 * @param role - The user's role from the database
 * @returns Array of permissions, '*' for full access, or empty array for unknown/guest
 */
export function getPermissionsForRole(role: string): PermissionSet {
  const permissions = ROLE_PERMISSIONS[role];
  
  // Unknown roles get no permissions (security: allowlist-based)
  if (permissions === undefined) {
    return [];
  }
  
  return permissions;
}

/**
 * Checks if a role has a specific permission.
 * 
 * @param role - The user's role from the database
 * @param permission - The permission to check
 * @returns true if the role has the permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = getPermissionsForRole(role);
  
  // Full access grants all permissions
  if (permissions === FULL_ACCESS) {
    return true;
  }
  
  // Check if permission is in the list
  return permissions.includes(permission);
}

/**
 * Checks if a role has any of the specified permissions.
 * 
 * @param role - The user's role from the database
 * @param requiredPermissions - Array of permissions (any one grants access)
 * @returns true if the role has at least one of the permissions
 */
export function hasAnyPermission(role: string, requiredPermissions: Permission[]): boolean {
  return requiredPermissions.some(permission => hasPermission(role, permission));
}

/**
 * Checks if a role has all of the specified permissions.
 * 
 * @param role - The user's role from the database
 * @param requiredPermissions - Array of permissions (all required)
 * @returns true if the role has all of the permissions
 */
export function hasAllPermissions(role: string, requiredPermissions: Permission[]): boolean {
  return requiredPermissions.every(permission => hasPermission(role, permission));
}

/**
 * Gets the list of permissions for API response.
 * Returns the actual permission array or '*' for full access.
 * 
 * @param role - The user's role from the database
 * @returns Permission array or '*'
 */
export function getPermissionsForResponse(role: string): Permission[] | '*' {
  const permissions = getPermissionsForRole(role);
  
  if (permissions === FULL_ACCESS) {
    return '*';
  }
  
  return permissions;
}
