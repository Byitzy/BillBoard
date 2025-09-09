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

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Check if organization exists and get its name
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if organization has any dependencies (bills, vendors, projects, etc.)
    const [
      { count: billCount },
      { count: vendorCount },
      { count: projectCount },
      { count: memberCount },
    ] = await Promise.all([
      adminClient.from('bills').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
      adminClient.from('vendors').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
      adminClient.from('projects').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
      adminClient.from('org_members').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    ]);

    if (billCount! > 0 || vendorCount! > 0 || projectCount! > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete organization with existing data',
          details: {
            bills: billCount,
            vendors: vendorCount,
            projects: projectCount,
          },
        },
        { status: 400 }
      );
    }

    // Delete the organization (cascade will handle org_members and other related data)
    const { error: deleteError } = await adminClient
      .from('organizations')
      .delete()
      .eq('id', orgId);

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