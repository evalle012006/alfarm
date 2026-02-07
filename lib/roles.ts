/**
 * Role Constants and Utilities
 * 
 * Single source of truth for role values in the AlFarm system.
 * 
 * ROLE STANDARD:
 * - `guest` → public customer (default for registrations)
 * - `super_admin` → full admin access (maps from legacy 'root' and 'admin')
 * - `cashier` → limited admin access (Phase 1+)
 * 
 * All roles are lowercase snake_case and stored in `users.role`.
 */

// =============================================================================
// ROLE CONSTANTS
// =============================================================================

/** Guest role - public customers */
export const ROLE_GUEST = 'guest' as const;

/** Super admin role - full administrative access */
export const ROLE_SUPER_ADMIN = 'super_admin' as const;

/** Cashier role - limited admin access (booking management, payments) */
export const ROLE_CASHIER = 'cashier' as const;

// =============================================================================
// LEGACY ROLE CONSTANTS (for backward compatibility during transition)
// =============================================================================

/** @deprecated Use ROLE_SUPER_ADMIN instead. Will be removed after Phase 1 migration. */
export const LEGACY_ROLE_ADMIN = 'admin' as const;

/** @deprecated Use ROLE_SUPER_ADMIN instead. Will be removed after Phase 1 migration. */
export const LEGACY_ROLE_ROOT = 'root' as const;

// =============================================================================
// ROLE GROUPS
// =============================================================================

/** All admin roles that can access /admin routes */
export const ADMIN_ROLES = [ROLE_SUPER_ADMIN, ROLE_CASHIER] as const;

/** Legacy admin roles (for backward compatibility during transition) */
export const LEGACY_ADMIN_ROLES = [LEGACY_ROLE_ADMIN, LEGACY_ROLE_ROOT] as const;

/** All roles that should be treated as admin (includes legacy for transition period) */
export const ALL_ADMIN_ROLES = [...ADMIN_ROLES, ...LEGACY_ADMIN_ROLES] as const;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Standard role type (target state) */
export type Role =
  | typeof ROLE_GUEST
  | typeof ROLE_SUPER_ADMIN
  | typeof ROLE_CASHIER
  | typeof LEGACY_ROLE_ADMIN
  | typeof LEGACY_ROLE_ROOT;

// Security allowlist for Phase 1 (explicit)
export const ADMIN_ROLE_ALLOWLIST = [
  ROLE_SUPER_ADMIN,
  ROLE_CASHIER,
  LEGACY_ROLE_ADMIN,
  LEGACY_ROLE_ROOT,
] as const;

/** Legacy role type (for backward compatibility) */
export type LegacyRole = typeof LEGACY_ROLE_ADMIN | typeof LEGACY_ROLE_ROOT;

/** All possible role values (includes legacy) */
export type AnyRole = Role | LegacyRole;

/** Admin role type (standard) */
export type AdminRole = (typeof ADMIN_ROLE_ALLOWLIST)[number];

/** All admin role type (includes legacy) */
export type AnyAdminRole = typeof ALL_ADMIN_ROLES[number];

// =============================================================================
// ROLE UTILITIES
// =============================================================================

/**
 * Normalizes a database role value to the standard role format.
 * 
 * Mapping:
 * - 'root' → 'super_admin'
 * - 'admin' → 'super_admin' (temporary, until DB migration)
 * - 'guest' → 'guest'
 * - 'super_admin' → 'super_admin'
 * - 'cashier' → 'cashier'
 * - unknown → returns as-is (for safety)
 * 
 * @param dbRole - The role value from the database
 * @returns The normalized role value
 */
export function normalizeRole(dbRole: string): Role | string {
  switch (dbRole) {
    case LEGACY_ROLE_ROOT:
    case LEGACY_ROLE_ADMIN:
      return ROLE_SUPER_ADMIN;
    case ROLE_GUEST:
      return ROLE_GUEST;
    case ROLE_SUPER_ADMIN:
      return ROLE_SUPER_ADMIN;
    case ROLE_CASHIER:
      return ROLE_CASHIER;
    default:
      // Return as-is for unknown roles (safety measure)
      return dbRole;
  }
}

/**
 * Checks if a role (including legacy roles) has admin privileges.
 * 
 * @param role - The role to check
 * @returns true if the role has admin access
 */
export function isAdminRole(role: string): boolean {
  return (ALL_ADMIN_ROLES as readonly string[]).includes(role);
}

/**
 * Checks if a role is a guest role.
 * 
 * @param role - The role to check
 * @returns true if the role is guest
 */
export function isGuestRole(role: string): boolean {
  return role === ROLE_GUEST;
}

/**
 * Checks if a role is a legacy role that needs migration.
 * 
 * @param role - The role to check
 * @returns true if the role is a legacy admin role
 */
export function isLegacyRole(role: string): boolean {
  return (LEGACY_ADMIN_ROLES as readonly string[]).includes(role);
}

/**
 * Gets the appropriate dashboard path for a role.
 * 
 * @param role - The user's role
 * @returns The dashboard path
 */
export function getDashboardPath(role: string): string {
  if (isAdminRole(role)) {
    return '/admin/dashboard';
  }
  return '/guest/dashboard';
}

/**
 * Gets the appropriate login path for a role type.
 * 
 * @param isAdmin - Whether this is for admin login
 * @returns The login path
 */
export function getLoginPath(isAdmin: boolean): string {
  return isAdmin ? '/admin/login' : '/guest/login';
}

export function isAdminRoleAllowlisted(role: string): role is AdminRole {
  return (ADMIN_ROLE_ALLOWLIST as readonly string[]).includes(role);
}