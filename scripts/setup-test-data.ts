#!/usr/bin/env tsx
/**
 * Test Data Setup Script
 *
 * Sets up comprehensive test data for E2E testing including:
 * - Test organization with multiple users and roles
 * - Sample vendors, projects, bills, and bill occurrences
 * - Approval workflows with different states
 *
 * Usage:
 * npx tsx scripts/setup-test-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test organization and user data
const TEST_ORG = {
  name: 'E2E Test Organization',
  settings: {},
};

const TEST_USERS = [
  {
    email: 'test-admin@billboard.test',
    role: 'admin',
    user_metadata: { full_name: 'Test Admin' },
  },
  {
    email: 'test-approver@billboard.test',
    role: 'approver',
    user_metadata: { full_name: 'Test Approver' },
  },
  {
    email: 'test-accountant@billboard.test',
    role: 'accountant',
    user_metadata: { full_name: 'Test Accountant' },
  },
  {
    email: 'test-data-entry@billboard.test',
    role: 'data_entry',
    user_metadata: { full_name: 'Test Data Entry' },
  },
  {
    email: 'test-analyst@billboard.test',
    role: 'analyst',
    user_metadata: { full_name: 'Test Analyst' },
  },
  {
    email: 'test-viewer@billboard.test',
    role: 'viewer',
    user_metadata: { full_name: 'Test Viewer' },
  },
];

const TEST_VENDORS = [
  { name: 'Acme Corp', email: 'billing@acme.com', phone: '555-0001' },
  {
    name: 'Global Services Ltd',
    email: 'accounts@global.com',
    phone: '555-0002',
  },
  {
    name: 'Tech Solutions Inc',
    email: 'finance@techsol.com',
    phone: '555-0003',
  },
  {
    name: 'Office Supplies Co',
    email: 'sales@officesupplies.com',
    phone: '555-0004',
  },
];

const TEST_PROJECTS = [
  {
    name: 'Website Redesign',
    description: 'Complete website overhaul project',
  },
  {
    name: 'Office Renovation',
    description: 'Modernize office space and facilities',
  },
  {
    name: 'Software Development',
    description: 'Custom software development project',
  },
  {
    name: 'Marketing Campaign',
    description: 'Q4 marketing and advertising campaign',
  },
];

async function cleanupExistingTestData() {
  console.log('🧹 Cleaning up existing test data...');

  // Find test organization
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id')
    .eq('name', TEST_ORG.name);

  if (orgs && orgs.length > 0) {
    const orgId = orgs[0].id;

    // Delete related data (cascade should handle most of this)
    await supabase.from('bill_occurrences').delete().eq('org_id', orgId);
    await supabase.from('bills').delete().eq('org_id', orgId);
    await supabase.from('projects').delete().eq('org_id', orgId);
    await supabase.from('vendors').delete().eq('org_id', orgId);
    await supabase.from('org_members').delete().eq('org_id', orgId);
    await supabase.from('organizations').delete().eq('id', orgId);
  }

  // Delete test users
  for (const user of TEST_USERS) {
    const { data } = await supabase.auth.admin.listUsers();
    const existingUser = data.users.find((u) => u.email === user.email);
    if (existingUser) {
      await supabase.auth.admin.deleteUser(existingUser.id);
    }
  }

  console.log('✅ Cleanup completed');
}

async function createTestOrganization() {
  console.log('🏢 Creating test organization...');

  const { data: org, error } = await supabase
    .from('organizations')
    .insert(TEST_ORG)
    .select('*')
    .single();

  if (error) {
    console.error('Error creating organization:', error);
    process.exit(1);
  }

  console.log(`✅ Created organization: ${org.name} (${org.id})`);
  return org;
}

async function createTestUsers(orgId: string) {
  console.log('👥 Creating test users...');

  const createdUsers = [];

  for (const userData of TEST_USERS) {
    // Create user in Auth
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email: userData.email,
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: userData.user_metadata,
      });

    if (authError) {
      console.error(`Error creating user ${userData.email}:`, authError);
      continue;
    }

    // Add user to organization
    const { error: memberError } = await supabase.from('org_members').insert({
      org_id: orgId,
      user_id: authUser.user.id,
      role: userData.role,
      status: 'active',
    });

    if (memberError) {
      console.error(`Error adding user to org:`, memberError);
      continue;
    }

    createdUsers.push({ ...authUser.user, role: userData.role });
    console.log(`✅ Created user: ${userData.email} (${userData.role})`);
  }

  return createdUsers;
}

async function createTestVendors(orgId: string) {
  console.log('🏪 Creating test vendors...');

  const { data: vendors, error } = await supabase
    .from('vendors')
    .insert(
      TEST_VENDORS.map((vendor) => ({
        ...vendor,
        org_id: orgId,
      }))
    )
    .select('*');

  if (error) {
    console.error('Error creating vendors:', error);
    return [];
  }

  vendors.forEach((vendor) => {
    console.log(`✅ Created vendor: ${vendor.name}`);
  });

  return vendors;
}

async function createTestProjects(orgId: string) {
  console.log('📋 Creating test projects...');

  const { data: projects, error } = await supabase
    .from('projects')
    .insert(
      TEST_PROJECTS.map((project) => ({
        ...project,
        org_id: orgId,
        status: 'active',
      }))
    )
    .select('*');

  if (error) {
    console.error('Error creating projects:', error);
    return [];
  }

  projects.forEach((project) => {
    console.log(`✅ Created project: ${project.name}`);
  });

  return projects;
}

async function createTestBills(
  orgId: string,
  vendorIds: string[],
  projectIds: string[]
) {
  console.log('💰 Creating test bills...');

  const bills = [
    {
      title: 'Monthly Software License',
      amount: 299.99,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0], // 7 days from now
      vendor_id: vendorIds[0],
      project_id: projectIds[0],
      status: 'pending_approval',
      frequency: 'monthly',
    },
    {
      title: 'Office Supplies Order',
      amount: 1250.0,
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0], // 14 days from now
      vendor_id: vendorIds[3],
      project_id: projectIds[1],
      status: 'approved',
      frequency: 'one_time',
    },
    {
      title: 'Consulting Services',
      amount: 5000.0,
      due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0], // 21 days from now
      vendor_id: vendorIds[2],
      project_id: projectIds[2],
      status: 'on_hold',
      frequency: 'one_time',
    },
    {
      title: 'Marketing Campaign Budget',
      amount: 15000.0,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0], // 30 days from now
      vendor_id: vendorIds[1],
      project_id: projectIds[3],
      status: 'pending_approval',
      frequency: 'one_time',
    },
  ];

  const { data: createdBills, error } = await supabase
    .from('bills')
    .insert(
      bills.map((bill) => ({
        ...bill,
        org_id: orgId,
      }))
    )
    .select('*');

  if (error) {
    console.error('Error creating bills:', error);
    return [];
  }

  createdBills.forEach((bill) => {
    console.log(`✅ Created bill: ${bill.title} - $${bill.amount}`);
  });

  return createdBills;
}

async function main() {
  console.log('🚀 Setting up E2E test data...');
  console.log('');

  try {
    // Step 1: Cleanup existing test data
    await cleanupExistingTestData();

    // Step 2: Create test organization
    const org = await createTestOrganization();

    // Step 3: Create test users
    const users = await createTestUsers(org.id);

    // Step 4: Create test vendors
    const vendors = await createTestVendors(org.id);

    // Step 5: Create test projects
    const projects = await createTestProjects(org.id);

    // Step 6: Create test bills
    const bills = await createTestBills(
      org.id,
      vendors.map((v) => v.id),
      projects.map((p) => p.id)
    );

    console.log('');
    console.log('✅ Test data setup completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Organization: ${org.name} (${org.id})`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Vendors: ${vendors.length}`);
    console.log(`   Projects: ${projects.length}`);
    console.log(`   Bills: ${bills.length}`);
    console.log('');
    console.log('🔑 Test User Credentials:');
    TEST_USERS.forEach((user) => {
      console.log(`   ${user.email} / TestPassword123! (${user.role})`);
    });
    console.log('');
    console.log('🧪 You can now run comprehensive E2E tests!');
  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    process.exit(1);
  }
}

// Run the script
main();
