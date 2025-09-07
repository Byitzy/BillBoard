'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { APIError } from '@/types/api';
import type { Database } from '@/types/supabase';

let _client: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new APIError(
      'Missing Supabase configuration. Please check your environment variables.',
      'MISSING_CONFIG',
      500
    );
  }

  _client = createClient<Database>(url, key);
  return _client;
}

// Typed client alias
export type TypedSupabaseClient = SupabaseClient<Database>;

// Enhanced error handling for Supabase operations
export function handleSupabaseError(error: any): APIError {
  if (!error) return new APIError('Unknown error occurred');

  // Handle different types of Supabase errors
  if (error.code === 'PGRST116') {
    return new APIError('Resource not found', 'NOT_FOUND', 404);
  }

  if (error.code === '23505') {
    return new APIError('Resource already exists', 'DUPLICATE', 409);
  }

  if (error.code === '42501') {
    return new APIError('Insufficient permissions', 'FORBIDDEN', 403);
  }

  if (error.code === 'row_level_security_violation') {
    return new APIError('Access denied', 'FORBIDDEN', 403);
  }

  return new APIError(
    error.message || 'Database operation failed',
    error.code || 'DB_ERROR',
    500,
    error
  );
}
