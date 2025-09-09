import type { SafeResult } from '@/types/api';
import type { TypedSupabaseClient } from './client';
import { handleSupabaseError } from './client';

// Safe database query wrapper
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<SafeResult<T>> {
  try {
    const { data, error } = await queryFn();

    if (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
      };
    }

    if (data === null) {
      return {
        success: false,
        error: handleSupabaseError({ code: 'PGRST116', message: 'Not found' }),
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err) {
    return {
      success: false,
      error: handleSupabaseError(err),
    };
  }
}

// Safe database mutation wrapper
export async function safeMutation<T>(
  mutationFn: () => Promise<{ data: T | null; error: any }>
): Promise<SafeResult<T>> {
  try {
    const { data, error } = await mutationFn();

    if (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
      };
    }

    return {
      success: true,
      data: data as T,
    };
  } catch (err) {
    return {
      success: false,
      error: handleSupabaseError(err),
    };
  }
}

// Utility to get user's organization membership
export async function getUserOrgMembership(
  supabase: TypedSupabaseClient,
  userId: string,
  orgId: string
) {
  return safeQuery(async () => {
    const result = await supabase
      .from('org_members')
      .select('id, role')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .single();
    return result;
  });
}

// Utility to check if user has required role
export function hasRequiredRole(
  userRole: string,
  requiredRoles: string[]
): boolean {
  return requiredRoles.includes(userRole);
}

// Role hierarchy for permission checks
export const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 1,
  analyst: 2,
  data_entry: 3,
  accountant: 4,
  approver: 5,
  admin: 6,
};

export function hasRoleLevel(userRole: string, minLevel: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const minLevelValue = ROLE_HIERARCHY[minLevel] || 999;
  return userLevel >= minLevelValue;
}
