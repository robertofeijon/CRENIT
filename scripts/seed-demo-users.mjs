/**
 * Creates demo admin, landlord, and tenant accounts in Supabase.
 * Usage: npm run seed:demo
 * Requires: root .env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const DEMO_USERS = [
  {
    email: 'admin@rentcredit.demo',
    password: 'DemoAdmin123!',
    full_name: 'Demo Admin',
    role: 'ADMIN',
    kyc_status: 'APPROVED',
  },
  {
    email: 'landlord@rentcredit.demo',
    password: 'DemoLandlord123!',
    full_name: 'Demo Landlord',
    role: 'LANDLORD',
    kyc_status: 'APPROVED',
  },
  {
    email: 'tenant@rentcredit.demo',
    password: 'DemoTenant123!',
    full_name: 'Demo Tenant',
    role: 'TENANT',
    kyc_status: 'APPROVED',
  },
];

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function ensureAdminEmails(envPath, adminEmail) {
  const env = loadEnvFile(envPath);
  const current = (env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (current.includes(adminEmail.toLowerCase())) {
    return false;
  }

  current.push(adminEmail.toLowerCase());
  env.ADMIN_EMAILS = current.join(',');

  const lines = Object.entries(env).map(([key, value]) => `${key}=${value}`);
  if (!env.ADMIN_EMAILS) {
    lines.push(`ADMIN_EMAILS=${adminEmail}`);
  }

  const existing = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const hasAdminLine = /^ADMIN_EMAILS=/m.test(existing);

  if (hasAdminLine) {
    const updated = existing.replace(/^ADMIN_EMAILS=.*$/m, `ADMIN_EMAILS=${env.ADMIN_EMAILS}`);
    writeFileSync(envPath, updated.endsWith('\n') ? updated : `${updated}\n`);
  } else {
    writeFileSync(envPath, `${existing.trimEnd()}\nADMIN_EMAILS=${env.ADMIN_EMAILS}\n`);
  }

  return true;
}

async function findUserByEmail(client, email) {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function ensureAuthUser(client, spec) {
  let user = await findUserByEmail(client, spec.email);

  if (user) {
    const { data, error } = await client.auth.admin.updateUserById(user.id, {
      password: spec.password,
      email_confirm: true,
      user_metadata: { role: spec.role },
    });
    if (error) throw error;
    user = data.user;
    console.log(`  ↻ Updated auth user: ${spec.email}`);
  } else {
    const { data, error } = await client.auth.admin.createUser({
      email: spec.email,
      password: spec.password,
      email_confirm: true,
      user_metadata: { role: spec.role },
    });
    if (error) throw error;
    user = data.user;
    console.log(`  ✓ Created auth user: ${spec.email}`);
  }

  return user;
}

async function ensureProfile(client, user, spec) {
  const profilePayload = {
    id: user.id,
    full_name: spec.full_name,
    role: spec.role,
    kyc_status: spec.kyc_status,
    kyc_approved_at: spec.kyc_status === 'APPROVED' ? new Date().toISOString() : null,
  };

  // For demo tenant, set income_monthly for credit score calculation
  if (spec.role === 'TENANT') {
    profilePayload.income_monthly = 40000;
  }

  const { error } = await client.from('profiles').upsert(profilePayload, { onConflict: 'id' });
  if (error) throw error;
}

async function ensureLandlordProfile(client, userId, businessName) {
  const { data: existing } = await client.from('landlord_profiles').select('id').eq('user_id', userId).maybeSingle();
  if (existing) return existing;

  const { data, error } = await client
    .from('landlord_profiles')
    .insert([
      {
        user_id: userId,
        business_name: businessName,
        partner_status: 'APPROVED',
      },
    ])
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

async function ensureKycBucket(client) {
  const { data: buckets } = await client.storage.listBuckets();
  if (buckets?.some((b) => b.name === 'kyc-documents')) {
    return;
  }
  const { error } = await client.storage.createBucket('kyc-documents', { public: true });
  if (error && !error.message?.includes('already exists')) {
    console.warn(`  ⚠ Could not create kyc-documents bucket: ${error.message}`);
    console.warn('    Create it manually in Supabase → Storage (public bucket).');
  } else {
    console.log('  ✓ Storage bucket kyc-documents ready');
  }
}

async function seedDemoData(client, ids) {
  const { landlordUserId, tenantUserId } = ids;
  const { data: landlordProfile } = await client
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', landlordUserId)
    .single();
  if (!landlordProfile) return;

  let propertyId;
  const { data: existingProperty } = await client
    .from('properties')
    .select('id')
    .eq('landlord_id', landlordProfile.id)
    .eq('property_name', 'Klein Windhoek Apartments')
    .maybeSingle();

  if (existingProperty) {
    propertyId = existingProperty.id;
  } else {
    const { data: property, error } = await client
      .from('properties')
      .insert([
        {
          landlord_id: landlordProfile.id,
          property_name: 'Klein Windhoek Apartments',
          address_street: '15 Independence Ave',
          address_suburb: 'Klein Windhoek',
          address_city: 'Windhoek',
          property_type: 'APARTMENT',
        },
      ])
      .select('id')
      .single();
    if (error) throw error;
    propertyId = property.id;
  }

  let unitId;
  const { data: existingUnit } = await client
    .from('units')
    .select('id, monthly_rent')
    .eq('property_id', propertyId)
    .eq('unit_identifier', 'Unit 4B')
    .maybeSingle();

  if (existingUnit) {
    unitId = existingUnit.id;
  } else {
    const { data: unit, error } = await client
      .from('units')
      .insert([
        {
          property_id: propertyId,
          unit_identifier: 'Unit 4B',
          bedrooms: 2,
          bathrooms: 1,
          monthly_rent: 12500,
          is_occupied: true,
        },
      ])
      .select('id, monthly_rent')
      .single();
    if (error) throw error;
    unitId = unit.id;
  }

  const { data: existingLease } = await client
    .from('leases')
    .select('id')
    .eq('tenant_id', tenantUserId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (!existingLease) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    const { error: leaseError } = await client.from('leases').insert([
      {
        unit_id: unitId,
        tenant_id: tenantUserId,
        landlord_id: landlordProfile.id,
        start_date: startDate.toISOString().slice(0, 10),
        monthly_rent: 12500,
        status: 'ACTIVE',
      },
    ]);
    if (leaseError) throw leaseError;
  }

  const { data: lease } = await client
    .from('leases')
    .select('id, monthly_rent')
    .eq('tenant_id', tenantUserId)
    .eq('status', 'ACTIVE')
    .single();

  if (lease) {
    const { count } = await client
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('lease_id', lease.id)
      .eq('status', 'PAID');

    if (!count) {
      const gross = Number(lease.monthly_rent);
      await client.from('payments').insert([
        {
          lease_id: lease.id,
          tenant_id: tenantUserId,
          landlord_id: landlordProfile.id,
          unit_id: unitId,
          amount_gross: gross,
          commission_rate: 0.01,
          commission_amount: gross * 0.01,
          amount_net: gross * 0.99,
          due_date: new Date().toISOString().slice(0, 10),
          paid_date: new Date().toISOString(),
          payment_method: 'CARD',
          status: 'PAID',
          is_simulated: true,
        },
      ]);
    }

    const { count: depositCount } = await client
      .from('deposits')
      .select('id', { count: 'exact', head: true })
      .eq('lease_id', lease.id);

    if (!depositCount) {
      await client.from('deposits').insert([
        {
          lease_id: lease.id,
          tenant_id: tenantUserId,
          landlord_id: landlordProfile.id,
          amount: lease.monthly_rent,
          status: 'HELD',
        },
      ]);
    }
  }

  console.log('  ✓ Demo property, lease, payment, and deposit ready');
}

async function main() {
  const envPath = join(rootDir, '.env');
  const env = { ...loadEnvFile(join(rootDir, '.env.example')), ...loadEnvFile(envPath) };

  const url = env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('\nRentCredit demo user setup\n');

  const adminEmail = DEMO_USERS[0].email;
  if (ensureAdminEmails(envPath, adminEmail)) {
    console.log(`  ✓ Added ${adminEmail} to ADMIN_EMAILS in .env`);
  }

  await ensureKycBucket(client);

  const userIds = {};

  for (const spec of DEMO_USERS) {
    console.log(`\n${spec.role}: ${spec.email}`);
    const user = await ensureAuthUser(client, spec);
    await ensureProfile(client, user, spec);
    console.log(`  ✓ Profile role=${spec.role}, kyc=${spec.kyc_status}`);

    if (spec.role === 'LANDLORD') {
      await ensureLandlordProfile(client, user.id, 'Windhoek Central Rentals');
      console.log('  ✓ Landlord profile ready');
      userIds.landlordUserId = user.id;
    }
    if (spec.role === 'TENANT') {
      userIds.tenantUserId = user.id;
    }
    if (spec.role === 'ADMIN') {
      userIds.adminUserId = user.id;
    }
  }

  if (userIds.landlordUserId && userIds.tenantUserId) {
    console.log('\nSeeding demo portfolio data...');
    await seedDemoData(client, userIds);
  }

  console.log('\n────────────────────────────────────────');
  console.log('Demo accounts (use at http://localhost:3002/auth)\n');
  for (const spec of DEMO_USERS) {
    console.log(`  ${spec.role.padEnd(8)} ${spec.email}`);
    console.log(`           password: ${spec.password}`);
    if (spec.role === 'ADMIN') {
      console.log('           → opens /admin after login');
    } else if (spec.role === 'LANDLORD') {
      console.log('           → opens /landlord after login');
    } else {
      console.log('           → opens /tenant after login');
    }
    console.log('');
  }
  console.log('Restart the API (npm run dev:api) after .env changes so ADMIN_EMAILS loads.');
  console.log('────────────────────────────────────────\n');
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message || err);
  process.exit(1);
});
