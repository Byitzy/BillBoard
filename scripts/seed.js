#!/usr/bin/env node

/**
 * Database Seeding Script for Development Environment
 *
 * Usage:
 *   node scripts/seed.js                    # Run full seed
 *   node scripts/seed.js --clean            # Clean all data first
 *   node scripts/seed.js --org-only         # Only create organizations and users
 *
 * Requirements:
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - NEXT_PUBLIC_SUPABASE_URL in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Parse command line arguments
const args = process.argv.slice(2);
const shouldClean = args.includes('--clean');
const orgOnly = args.includes('--org-only');

console.log('🌱 Starting database seeding...\n');

async function cleanData() {
  console.log('🧹 Cleaning existing data...');

  const tables = [
    'payments',
    'approvals',
    'bill_occurrences',
    'bills',
    'vendors',
    'projects',
    'org_members',
    'organizations',
    'feedback',
    'updates',
  ];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.warn(`  ⚠️ Could not clean ${table}:`, error.message);
    } else {
      console.log(`  ✅ Cleaned ${table}`);
    }
  }
  console.log();
}

async function createOrganizations() {
  console.log('🏢 Creating organizations...');

  const organizations = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Acme Corporation',
      slug: 'acme',
      branding_prefix: 'ACME',
      theme: { primaryColor: '#3b82f6', logoUrl: null },
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'TechCorp Solutions',
      slug: 'techcorp',
      branding_prefix: 'TECH',
      theme: { primaryColor: '#10b981', logoUrl: null },
    },
  ];

  for (const org of organizations) {
    const { error } = await supabase.from('organizations').upsert(org);
    if (error) {
      console.error(`  ❌ Failed to create ${org.name}:`, error.message);
    } else {
      console.log(`  ✅ Created ${org.name}`);
    }
  }
  console.log();
}

async function createTestUsers() {
  console.log('👥 Creating test user accounts...');

  // Create super admins
  const superAdmins = [
    {
      email: 'yidy@pm.me',
      password: 'password123',
      user_metadata: {
        full_name: 'Super Administrator',
        role: 'super_admin',
        is_super_admin: true,
      },
    },
    {
      email: 'Byitzy@ymail.com',
      password: 'password123',
      user_metadata: {
        full_name: 'Super Administrator',
        role: 'super_admin',
        is_super_admin: true,
      },
    },
  ];

  // Create each super admin
  for (const superAdmin of superAdmins) {
    const { data: superAdminData, error: superAdminError } =
      await supabase.auth.admin.createUser({
        email: superAdmin.email,
        password: superAdmin.password,
        user_metadata: superAdmin.user_metadata,
        email_confirm: true,
      });

    if (superAdminError) {
      console.warn(
        `  ⚠️ Could not create super admin ${superAdmin.email}:`,
        superAdminError.message
      );
    } else {
      console.log(`  ✅ Created super admin ${superAdmin.email}`);

      // Add super admin to both organizations
      const orgIds = [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
      ];
      for (const orgId of orgIds) {
        const { error: memberError } = await supabase
          .from('org_members')
          .upsert({
            org_id: orgId,
            user_id: superAdminData.user.id,
            role: 'admin',
            status: 'active',
          });

        if (memberError) {
          console.warn(
            `    ⚠️ Could not add super admin ${superAdmin.email} to org ${orgId}:`,
            memberError.message
          );
        } else {
          console.log(
            `    ✅ Added ${superAdmin.email} to organization as admin`
          );
        }
      }
    }
  }

  // Regular users
  const users = [
    {
      email: 'admin@acme.com',
      password: 'password123',
      user_metadata: {
        full_name: 'Admin User',
        role: 'admin',
      },
    },
    {
      email: 'approver@acme.com',
      password: 'password123',
      user_metadata: {
        full_name: 'Approval Manager',
        role: 'approver',
      },
    },
    {
      email: 'accountant@acme.com',
      password: 'password123',
      user_metadata: {
        full_name: 'Finance Accountant',
        role: 'accountant',
      },
    },
  ];

  for (const userData of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      user_metadata: userData.user_metadata,
      email_confirm: true,
    });

    if (error) {
      console.warn(`  ⚠️ Could not create ${userData.email}:`, error.message);
    } else {
      console.log(`  ✅ Created user ${userData.email}`);

      // Add user to Acme Corporation
      const { error: memberError } = await supabase.from('org_members').upsert({
        org_id: '11111111-1111-1111-1111-111111111111',
        user_id: data.user.id,
        role: userData.user_metadata.role,
        status: 'active',
      });

      if (memberError) {
        console.warn(
          `    ⚠️ Could not add ${userData.email} to Acme:`,
          memberError.message
        );
      } else {
        console.log(
          `    ✅ Added ${userData.email} to Acme as ${userData.user_metadata.role}`
        );
      }
    }
  }
  console.log();
}

async function createProjects() {
  console.log('📁 Creating projects...');

  const projects = [
    {
      org_id: '11111111-1111-1111-1111-111111111111',
      name: 'Website Redesign',
      code: 'WEB-2024',
      description: 'Complete overhaul of company website',
      status: 'active',
    },
    {
      org_id: '11111111-1111-1111-1111-111111111111',
      name: 'Office Renovation',
      code: 'OFF-2024',
      description: 'Modernizing office space and equipment',
      status: 'active',
    },
    {
      org_id: '11111111-1111-1111-1111-111111111111',
      name: 'Marketing Campaign Q1',
      code: 'MKT-Q1-24',
      description: 'Digital marketing push for Q1 2024',
      status: 'completed',
    },
  ];

  for (const project of projects) {
    const { error } = await supabase.from('projects').upsert(project);
    if (error) {
      console.error(`  ❌ Failed to create ${project.name}:`, error.message);
    } else {
      console.log(`  ✅ Created project ${project.name}`);
    }
  }
  console.log();
}

async function createVendors() {
  console.log('🏪 Creating vendors...');

  const vendors = [
    {
      org_id: '11111111-1111-1111-1111-111111111111',
      name: 'Web Design Studio',
      account_number: 'WDS-001',
      contact: 'Jane Smith',
      email: 'billing@webdesignstudio.com',
      phone: '(555) 123-4567',
      notes: 'Preferred vendor for web development projects',
      tags: ['web', 'design', 'development'],
    },
    {
      org_id: '11111111-1111-1111-1111-111111111111',
      name: 'Office Supplies Plus',
      account_number: 'OSP-002',
      contact: 'Mike Johnson',
      email: 'accounts@officesuppliesplus.com',
      phone: '(555) 765-4321',
      notes: 'Bulk office supply orders',
      tags: ['office', 'supplies', 'bulk'],
    },
    {
      org_id: '11111111-1111-1111-1111-111111111111',
      name: 'CloudTech Services',
      account_number: 'CTS-003',
      contact: 'Sarah Davis',
      email: 'billing@cloudtech.com',
      phone: '(555) 987-6543',
      notes: 'Monthly cloud hosting and services',
      tags: ['cloud', 'hosting', 'monthly'],
    },
  ];

  for (const vendor of vendors) {
    const { error } = await supabase.from('vendors').upsert(vendor);
    if (error) {
      console.error(`  ❌ Failed to create ${vendor.name}:`, error.message);
    } else {
      console.log(`  ✅ Created vendor ${vendor.name}`);
    }
  }
  console.log();
}

async function createBills() {
  console.log('📄 Creating bills and occurrences...');

  // Get project and vendor IDs
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('org_id', '11111111-1111-1111-1111-111111111111');
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('org_id', '11111111-1111-1111-1111-111111111111');

  if (!projects?.length || !vendors?.length) {
    console.warn('  ⚠️ No projects or vendors found, skipping bills creation');
    return;
  }

  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 15);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  const bills = [
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      org_id: '11111111-1111-1111-1111-111111111111',
      project_id: projects.find((p) => p.name === 'Website Redesign')?.id,
      vendor_id: vendors.find((v) => v.name === 'Web Design Studio')?.id,
      title: 'Website Development Phase 1',
      description: 'Frontend development and design implementation',
      currency: 'CAD',
      amount_total: 15000.0,
      category: 'Development',
      due_date: nextMonth.toISOString().split('T')[0],
      recurring_rule: null,
      installments_total: 3,
      status: 'active',
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      org_id: '11111111-1111-1111-1111-111111111111',
      project_id: projects.find((p) => p.name === 'Office Renovation')?.id,
      vendor_id: vendors.find((v) => v.name === 'Office Supplies Plus')?.id,
      title: 'Monthly Office Supplies',
      description: 'Recurring monthly office supply delivery',
      currency: 'CAD',
      amount_total: 750.0,
      category: 'Office Supplies',
      due_date: null,
      recurring_rule: {
        frequency: 'monthly',
        interval: 1,
        start_date: lastMonth.toISOString().split('T')[0],
        end_date: null,
      },
      installments_total: null,
      status: 'active',
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      org_id: '11111111-1111-1111-1111-111111111111',
      project_id: null,
      vendor_id: vendors.find((v) => v.name === 'CloudTech Services')?.id,
      title: 'Cloud Hosting Services',
      description: 'Monthly cloud infrastructure and hosting',
      currency: 'CAD',
      amount_total: 2400.0,
      category: 'Technology',
      due_date: null,
      recurring_rule: {
        frequency: 'monthly',
        interval: 1,
        start_date: lastMonth.toISOString().split('T')[0],
        end_date: null,
      },
      installments_total: null,
      status: 'active',
    },
  ];

  for (const bill of bills) {
    const { error } = await supabase.from('bills').upsert(bill);
    if (error) {
      console.error(`  ❌ Failed to create ${bill.title}:`, error.message);
    } else {
      console.log(`  ✅ Created bill ${bill.title}`);
    }
  }

  // Create some sample occurrences
  await createSampleOccurrences(bills, projects, vendors);
  console.log();
}

async function createSampleOccurrences(bills, projects, vendors) {
  console.log('📅 Creating sample occurrences...');

  const today = new Date();
  const occurrences = [];

  // Installment bill occurrences
  const installmentBill = bills.find((b) => b.installments_total === 3);
  if (installmentBill) {
    const installmentAmount = installmentBill.amount_total / 3;
    for (let i = 0; i < 3; i++) {
      const dueDate = new Date(installmentBill.due_date);
      dueDate.setMonth(dueDate.getMonth() + i);

      occurrences.push({
        org_id: installmentBill.org_id,
        bill_id: installmentBill.id,
        project_id: installmentBill.project_id,
        vendor_id: installmentBill.vendor_id,
        sequence: i + 1,
        amount_due: installmentAmount,
        due_date: dueDate.toISOString().split('T')[0],
        suggested_submission_date: new Date(dueDate.getTime() - 86400000)
          .toISOString()
          .split('T')[0], // Previous day
        state:
          i === 0 ? 'approved' : i === 1 ? 'pending_approval' : 'scheduled',
        notes: `Installment ${i + 1} of 3`,
      });
    }
  }

  // Recurring bill occurrences
  const recurringBills = bills.filter((b) => b.recurring_rule);
  for (const bill of recurringBills) {
    for (let i = -1; i <= 2; i++) {
      // Past, current, and future occurrences
      const dueDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const state =
        i === -1
          ? 'paid'
          : i === 0
            ? 'approved'
            : i === 1
              ? 'pending_approval'
              : 'scheduled';

      occurrences.push({
        org_id: bill.org_id,
        bill_id: bill.id,
        project_id: bill.project_id,
        vendor_id: bill.vendor_id,
        sequence: i + 2, // Adjust for 0-based indexing
        amount_due: bill.amount_total,
        due_date: dueDate.toISOString().split('T')[0],
        suggested_submission_date: new Date(dueDate.getTime() - 86400000)
          .toISOString()
          .split('T')[0],
        state: state,
        notes: `Monthly recurring payment for ${dueDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      });
    }
  }

  // Insert all occurrences
  for (const occ of occurrences) {
    const { error } = await supabase.from('bill_occurrences').upsert(occ);
    if (error) {
      console.warn(`    ⚠️ Could not create occurrence:`, error.message);
    } else {
      console.log(
        `    ✅ Created occurrence for ${occ.due_date} (${occ.state})`
      );
    }
  }
}

async function createSampleData() {
  console.log('📊 Creating additional sample data...');

  // Create some updates
  const updates = [
    {
      title: 'New Dashboard Features',
      body_md:
        "## Dashboard Improvements\n\nWe've added new KPI metrics and improved the monthly chart visualization.\n\n- Enhanced project breakdown tooltips\n- Faster data loading\n- Better mobile responsiveness",
      tags: ['feature', 'dashboard', 'ui'],
      published_at: new Date().toISOString(),
    },
    {
      title: 'Improved Bill Management',
      body_md:
        '## Bill Management Updates\n\nBill creation and editing is now more streamlined:\n\n- Better recurring schedule options\n- Improved vendor selection\n- Enhanced approval workflow',
      tags: ['feature', 'bills', 'workflow'],
      published_at: new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString(), // 7 days ago
    },
  ];

  for (const update of updates) {
    const { error } = await supabase.from('updates').upsert(update);
    if (error) {
      console.error(
        `  ❌ Failed to create update ${update.title}:`,
        error.message
      );
    } else {
      console.log(`  ✅ Created update ${update.title}`);
    }
  }

  // Create sample feedback
  const feedback = [
    {
      org_id: '11111111-1111-1111-1111-111111111111',
      type: 'feature',
      title: 'Add bulk bill import',
      body: 'It would be great to import multiple bills from a CSV file for faster data entry.',
      status: 'open',
    },
    {
      org_id: '11111111-1111-1111-1111-111111111111',
      type: 'bug',
      title: 'Calendar view not loading on mobile',
      body: 'The calendar component fails to render properly on mobile devices in landscape mode.',
      status: 'in_progress',
    },
  ];

  for (const fb of feedback) {
    const { error } = await supabase.from('feedback').upsert(fb);
    if (error) {
      console.error(
        `  ❌ Failed to create feedback ${fb.title}:`,
        error.message
      );
    } else {
      console.log(`  ✅ Created feedback ${fb.title}`);
    }
  }

  console.log();
}

async function main() {
  // Check required environment variables
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error(`❌ Missing required environment variables:
    - NEXT_PUBLIC_SUPABASE_URL
    - SUPABASE_SERVICE_ROLE_KEY
    
Please check your .env.local file.`);
    process.exit(1);
  }

  try {
    if (shouldClean) {
      await cleanData();
    }

    await createOrganizations();
    await createTestUsers();

    if (!orgOnly) {
      await createProjects();
      await createVendors();
      await createBills();
      await createSampleData();
    }

    console.log('Database seeding completed successfully!');
    console.log('\nSuper Administrators:');
    console.log(
      '  - yidy@pm.me (password: password123) - Super Admin (access to all orgs)'
    );
    console.log(
      '  - Byitzy@ymail.com (password: password123) - Super Admin (access to all orgs)'
    );
    console.log('\nTest Accounts Created:');
    console.log('  - admin@acme.com (password: password123) - Admin role');
    console.log(
      '  - approver@acme.com (password: password123) - Approver role'
    );
    console.log(
      '  - accountant@acme.com (password: password123) - Accountant role'
    );
    console.log('\nOrganizations:');
    console.log('  - Acme Corporation (slug: acme)');
    console.log('  - TechCorp Solutions (slug: techcorp)');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

main();
