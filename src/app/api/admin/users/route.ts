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

// Helper function to check if user is super admin
async function isSuperAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);

  try {
    const {
      data: { user },
      error,
    } = await adminClient.auth.getUser(token);
    if (error || !user) return false;

    return (
      user.user_metadata?.is_super_admin === true ||
      user.user_metadata?.is_super_admin === 'true'
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

    const {
      data: { users },
      error,
    } = await adminClient.auth.admin.listUsers();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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

    const body = await request.json();
    const { email, password, fullName, role, organizationId } = body;

    // Create user
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role,
          is_super_admin: role === 'super_admin' ? 'true' : 'false',
        },
      });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // If creating an org admin, add them to the organization
    if (role === 'admin' && organizationId) {
      const { error: memberError } = await adminClient
        .from('org_members')
        .insert({
          org_id: organizationId,
          user_id: newUser.user.id,
          role: 'admin',
          status: 'active',
        });

      if (memberError) {
        // Clean up the user if org member creation fails
        await adminClient.auth.admin.deleteUser(newUser.user.id);
        return NextResponse.json(
          {
            error: `User created but failed to add to organization: ${memberError.message}`,
          },
          { status: 400 }
        );
      }
    }

    // If creating a super admin, add them to all organizations
    if (role === 'super_admin') {
      const { data: orgs } = await adminClient
        .from('organizations')
        .select('id');

      if (orgs) {
        for (const org of orgs) {
          await adminClient.from('org_members').insert({
            org_id: org.id,
            user_id: newUser.user.id,
            role: 'admin',
            status: 'active',
          });
        }
      }
    }

    return NextResponse.json({ user: newUser.user });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
