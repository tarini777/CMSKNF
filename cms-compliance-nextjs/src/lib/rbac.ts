import { UserRole } from '@/types/cms'

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['*'],
  compliance_officer: [
    'records:read',
    'records:write',
    'records:approve',
    'rules:read',
    'rules:write',
    'audit:read',
    'reports:read',
    'upload:write',
  ],
  data_analyst: ['records:read', 'rules:read', 'audit:read', 'reports:read', 'upload:write'],
  executive: ['records:read', 'audit:read', 'reports:read'],
}

export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || []
  return permissions.includes('*') || permissions.includes(permission)
}

export function canAccessRoute(role: UserRole, pathname: string, method: string): boolean {
  if (role === 'admin') return true

  if (pathname.startsWith('/api/rules') && method !== 'GET') {
    return hasPermission(role, 'rules:write')
  }
  if (pathname.startsWith('/api/rules')) {
    return hasPermission(role, 'rules:read')
  }
  if (pathname.startsWith('/api/records/bulk') || pathname.match(/\/api\/records\/[^/]+$/)) {
    return hasPermission(role, 'records:approve')
  }
  if (pathname.startsWith('/api/records') && method !== 'GET') {
    return hasPermission(role, 'records:write')
  }
  if (pathname.startsWith('/api/records')) {
    return hasPermission(role, 'records:read')
  }
  if (pathname.startsWith('/api/upload')) {
    return hasPermission(role, 'upload:write')
  }
  if (pathname.startsWith('/api/audit')) {
    return hasPermission(role, 'audit:read')
  }
  if (pathname.startsWith('/api/reports')) {
    return hasPermission(role, 'reports:read')
  }

  return true
}
