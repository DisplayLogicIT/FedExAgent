/**
 * One-time seed script: imports addresses.json from the legacy app into Supabase.
 * Run AFTER first logging in so you have a Clerk user ID.
 *
 * Usage:
 *   1. Copy your Clerk user ID from clerk.com → Users → your account
 *   2. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment
 *   3. npx tsx scripts/seed-addresses.ts <YOUR_CLERK_USER_ID>
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: npx tsx scripts/seed-addresses.ts <YOUR_CLERK_USER_ID>');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const legacyPath = join(__dirname, '../../FedEx Shipping label Agent/data/addresses.json');
const addresses = JSON.parse(readFileSync(legacyPath, 'utf8'));

console.log(`Seeding ${addresses.length} addresses for user ${userId}...`);

const rows = addresses.map((a: any) => ({
  id: a.id || undefined,
  user_id: userId,
  name: a.name,
  company: a.company || null,
  phone: a.phone || null,
  email: a.email || null,
  street: a.street,
  street2: a.street2 || null,
  city: a.city,
  state: a.state || null,
  zip: a.zip || null,
  country: a.country || 'US',
  residential: a.residential || false,
  is_default: a.isDefault || a.is_default || false,
  tags: a.tags || null,
  created_at: a.createdAt || new Date().toISOString(),
  updated_at: a.updatedAt || new Date().toISOString(),
}));

// Insert in batches of 100
const BATCH = 100;
let inserted = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const { error } = await supabase.from('addresses').upsert(batch, { onConflict: 'id' });
  if (error) { console.error(`Batch ${i / BATCH + 1} error:`, error.message); }
  else { inserted += batch.length; process.stdout.write(`.`); }
}

console.log(`\n✓ Seeded ${inserted} addresses.`);
