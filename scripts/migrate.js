#!/usr/bin/env node

/**
 * Database Migration Runner
 *
 * Usage:
 *   node scripts/migrate.js                    # Run all pending migrations
 *   node scripts/migrate.js 001_add_org_invites.sql  # Run specific migration
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
const MIGRATIONS_DIR = join(__dirname, '../supabase/migrations');

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

async function runSQL(sql, filename) {
  console.log(`🚀 Running migration: ${filename}`);

  try {
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement + ';',
      });

      if (error) {
        // Try direct query if exec_sql RPC doesn't exist
        const { error: directError } = await supabase
          .from('_')
          .select()
          .limit(0);
        if (directError && directError.message.includes('exec_sql')) {
          // Create exec_sql function if it doesn't exist
          const createExecSQL = `
            CREATE OR REPLACE FUNCTION exec_sql(sql text)
            RETURNS void
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
              EXECUTE sql;
            END;
            $$;
          `;

          const { error: createError } = await supabase.rpc('query', {
            query: createExecSQL,
          });
          if (createError) {
            console.error(
              `❌ Failed to create exec_sql function:`,
              createError
            );
            return false;
          }

          // Retry original statement
          const { error: retryError } = await supabase.rpc('exec_sql', {
            sql: statement + ';',
          });
          if (retryError) {
            console.error(`❌ Migration failed:`, retryError);
            return false;
          }
        } else {
          console.error(`❌ Migration failed:`, error);
          return false;
        }
      }
    }

    console.log(`✅ Migration completed: ${filename}`);
    return true;
  } catch (err) {
    console.error(`❌ Migration failed:`, err.message);
    return false;
  }
}

async function runMigration(filename) {
  const filepath = join(MIGRATIONS_DIR, filename);

  try {
    const sql = readFileSync(filepath, 'utf8');
    return await runSQL(sql, filename);
  } catch (err) {
    console.error(`❌ Could not read migration file ${filename}:`, err.message);
    return false;
  }
}

async function runAllMigrations() {
  try {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort(); // Run in alphabetical order

    console.log(`📁 Found ${files.length} migration files`);

    let successful = 0;
    for (const file of files) {
      const success = await runMigration(file);
      if (success) successful++;
    }

    console.log(
      `\n🎉 Completed ${successful}/${files.length} migrations successfully`
    );
    return successful === files.length;
  } catch (err) {
    console.error(`❌ Error reading migrations directory:`, err.message);
    return false;
  }
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

  const specificFile = process.argv[2];

  if (specificFile) {
    console.log(`🎯 Running specific migration: ${specificFile}`);
    const success = await runMigration(specificFile);
    process.exit(success ? 0 : 1);
  } else {
    console.log(`🚀 Running all migrations...`);
    const success = await runAllMigrations();
    process.exit(success ? 0 : 1);
  }
}

main().catch((err) => {
  console.error(`💥 Unexpected error:`, err);
  process.exit(1);
});
