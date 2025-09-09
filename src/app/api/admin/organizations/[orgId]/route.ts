import { getServerClient, getServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const supabase = getServerClient();

    // Check if user is authenticated and is super admin
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin =
      session.user.user_metadata?.is_super_admin === true ||
      session.user.user_metadata?.is_super_admin === 'true';

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { orgId } = await params;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Use service role for admin operations
    const serviceSupabase = getServiceClient();

    // Check if organization has any bills, vendors, or projects
    const [
      { count: billCount },
      { count: vendorCount },
      { count: projectCount },
    ] = await Promise.all([
      serviceSupabase
        .from('bills')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId),
      serviceSupabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId),
      serviceSupabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId),
    ]);

    if (billCount! > 0 || vendorCount! > 0 || projectCount! > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete organization. It has ${billCount} bills, ${vendorCount} vendors, and ${projectCount} projects. Please remove all data first.`,
        },
        { status: 400 }
      );
    }

    // Delete organization members first (due to foreign key constraints)
    const { error: membersError } = await serviceSupabase
      .from('org_members')
      .delete()
      .eq('org_id', orgId);

    if (membersError) {
      console.error('Error deleting org members:', membersError);
      return NextResponse.json(
        { error: 'Failed to delete organization members' },
        { status: 500 }
      );
    }

    // Delete the organization
    const { error: orgError } = await serviceSupabase
      .from('organizations')
      .delete()
      .eq('id', orgId);

    if (orgError) {
      console.error('Error deleting organization:', orgError);
      return NextResponse.json(
        { error: 'Failed to delete organization' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/organizations/[orgId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
