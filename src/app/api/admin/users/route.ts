import { getServerClient, getServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = getServerClient();
    
    // Check if user is authenticated and is super admin
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.user.user_metadata?.is_super_admin === true || 
                        session.user.user_metadata?.is_super_admin === 'true';

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use service role to fetch all users
    const serviceSupabase = getServiceClient();
    
    const { data: users, error } = await serviceSupabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json(users.users);
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServerClient();
    
    // Check if user is authenticated and is super admin
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.user.user_metadata?.is_super_admin === true || 
                        session.user.user_metadata?.is_super_admin === 'true';

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, role, orgId } = await request.json();

    if (!email || !role || !orgId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use service role to create user
    const serviceSupabase = getServiceClient();
    
    console.log('Creating user with service role:', { email, role, orgId });

    // Create the user with proper metadata
    const { data: newUser, error: createError } = await serviceSupabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        is_super_admin: role === 'super_admin' ? 'true' : 'false',
        role: role
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    console.log('User created successfully:', newUser.user.id);

    // Add user to organization
    const { error: memberError } = await serviceSupabase
      .from('org_members')
      .insert({
        org_id: orgId,
        user_id: newUser.user.id,
        role: 'admin' // Default role in the organization
      });

    if (memberError) {
      console.error('Error adding user to organization:', memberError);
      // Don't fail the entire operation, just log the error
    }

    return NextResponse.json(newUser.user);
  } catch (error) {
    console.error('Error in POST /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}