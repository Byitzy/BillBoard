<<<<<<< HEAD
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!(await isSuperAdmin(authHeader))) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      );
    }

    const { orgId } = params;

    // Check if organization exists
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .select('id, name')
      .eq('id', orgId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if organization has any bills, projects, or other data
    const [billsResult, projectsResult, vendorsResult] = await Promise.all([
      adminClient
        .from('bills')
        .select('id', { count: 'exact' })
        .eq('org_id', orgId),
      adminClient
        .from('projects')
        .select('id', { count: 'exact' })
        .eq('org_id', orgId),
      adminClient
        .from('vendors')
        .select('id', { count: 'exact' })
        .eq('org_id', orgId),
    ]);

    const hasData =
      (billsResult.count || 0) > 0 ||
      (projectsResult.count || 0) > 0 ||
      (vendorsResult.count || 0) > 0;

    if (hasData) {
      return NextResponse.json(
        {
          error:
            'Cannot delete organization with existing data. Please remove all bills, projects, and vendors first.',
          details: {
            bills: billsResult.count || 0,
            projects: projectsResult.count || 0,
            vendors: vendorsResult.count || 0,
          },
        },
        { status: 400 }
      );
    }

    // Delete the organization (cascade will handle org_members and other related data)
    const { error: deleteError } = await adminClient
=======
import { getServerClient, getServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
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

    const { orgId } = await params;

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Use service role for admin operations
    const serviceSupabase = getServiceClient();

    // Check if organization has any bills, vendors, or projects
    const [
      { count: billCount },
      { count: vendorCount }, 
      { count: projectCount }
    ] = await Promise.all([
      serviceSupabase.from('bills').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
      serviceSupabase.from('vendors').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
      serviceSupabase.from('projects').select('*', { count: 'exact', head: true }).eq('org_id', orgId)
    ]);

    if (billCount! > 0 || vendorCount! > 0 || projectCount! > 0) {
      return NextResponse.json({ 
        error: `Cannot delete organization. It has ${billCount} bills, ${vendorCount} vendors, and ${projectCount} projects. Please remove all data first.` 
      }, { status: 400 });
    }

    // Delete organization members first (due to foreign key constraints)
    const { error: membersError } = await serviceSupabase
      .from('org_members')
      .delete()
      .eq('org_id', orgId);

    if (membersError) {
      console.error('Error deleting org members:', membersError);
      return NextResponse.json({ error: 'Failed to delete organization members' }, { status: 500 });
    }

    // Delete the organization
    const { error: orgError } = await serviceSupabase
>>>>>>> origin/beta
      .from('organizations')
      .delete()
      .eq('id', orgId);

<<<<<<< HEAD
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Organization "${org.name}" has been deleted successfully`,
    });
  } catch (error) {
    console.error('Delete organization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
=======
    if (orgError) {
      console.error('Error deleting organization:', orgError);
      return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/organizations/[orgId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
>>>>>>> origin/beta
