import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function isSuperAdmin(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  
  try {
    const {
      data: { user },
    } = await adminClient.auth.getUser(token);

    if (!user) return false;

    return (
      user.user_metadata?.is_super_admin === 'true' ||
      user.user_metadata?.is_super_admin === true
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!(await isSuperAdmin(authHeader))) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      );
    }

    const { data: users } = await adminClient.auth.admin.listUsers();

    if (!users) {
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!(await isSuperAdmin(authHeader))) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      );
    }

    const { email, password, fullName, role, organizationId } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role || 'user',
        is_super_admin: role === 'super_admin' ? 'true' : 'false',
      },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // If organizationId is provided, add user to the organization
    if (organizationId && newUser.user) {
      await adminClient.from('org_members').insert({
        org_id: organizationId,
        user_id: newUser.user.id,
        role: 'admin', // Default role in org
      });
    }

    return NextResponse.json({ user: newUser.user });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}