import { SupabaseClient } from '@supabase/supabase-js';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

export async function getUserFromAuthHeader(client: SupabaseClient, authHeader?: string) {
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedException('Missing or invalid Authorization header');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new UnauthorizedException('Missing auth token');
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    throw new UnauthorizedException('Invalid or expired auth token');
  }

  return data.user;
}

export function resolveProfileRole(profile: { role?: string }, userEmail?: string | null): string {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (userEmail && adminEmails.includes(userEmail.toLowerCase())) {
    return 'ADMIN';
  }

  // ADMIN is only granted via ADMIN_EMAILS — never from profile.role alone
  return profile?.role?.toString().toUpperCase() ?? 'TENANT';
}

/** Align profiles.role with auth metadata and landlord_profiles (fixes stale TENANT rows). */
export async function reconcileProfileRole(client: SupabaseClient, user: any, profile: any) {
  const current = profile?.role?.toString().toUpperCase() ?? '';
  const metaRole = user?.user_metadata?.role?.toString().toUpperCase() ?? '';

  const { data: landlordRow } = await client
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  let desired = current;
  if (landlordRow) {
    desired = 'LANDLORD';
  } else if (metaRole === 'LANDLORD') {
    if (!current || current === 'TENANT') {
      desired = metaRole;
    }
  } else if (!current && metaRole) {
    desired = metaRole;
  }

  const resolved = resolveProfileRole({ role: desired }, user.email);

  if (resolved !== current) {
    const { data: updated, error } = await client
      .from('profiles')
      .update({ role: resolved, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (!error && updated) {
      return { ...updated, role: resolveProfileRole(updated, user.email) };
    }
  }

  return { ...profile, role: resolveProfileRole(profile, user.email) };
}

export async function ensureUserProfile(client: SupabaseClient, user: any) {
  const defaultRole = user?.user_metadata?.role?.toString().toUpperCase() ?? 'TENANT';
  const role = resolveProfileRole({ role: defaultRole }, user.email);
  const full_name =
    user?.user_metadata?.full_name?.toString().trim() ||
    user?.email?.toString().split('@')[0] ||
    'CRENIT User';

  const { data: profile, error: selectError } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (selectError) {
    throw new UnauthorizedException('Unable to look up user profile');
  }

  if (profile) {
    return reconcileProfileRole(client, user, profile);
  }

  const { data: created, error: insertError } = await client
    .from('profiles')
    .upsert([
      {
        id: user.id,
        full_name,
        role,
        kyc_status: role === 'TENANT' ? 'NOT_SUBMITTED' : 'APPROVED',
        partner_approval_status: role === 'LANDLORD' ? 'UNVERIFIED' : 'APPROVED',
      },
    ], { onConflict: 'id' })
    .select()
    .single();

  if (insertError || !created) {
    throw new UnauthorizedException('Unable to create user profile');
  }

  return created;
}

export async function getUserProfileFromAuthHeader(client: SupabaseClient, authHeader?: string) {
  const user = await getUserFromAuthHeader(client, authHeader);
  const profile = await ensureUserProfile(client, user);
  const role = resolveProfileRole(profile, user.email);
  return { user, profile: { ...profile, role } };
}

export function assertRole(profile: { role?: string }, requiredRole: string) {
  if (!profile?.role) {
    throw new UnauthorizedException('User role not found');
  }
  if (profile.role.toString().toUpperCase() !== requiredRole.toUpperCase()) {
    throw new UnauthorizedException('Insufficient permissions');
  }
}

export function assertPartnerApproved(profile: { role?: string; partner_approval_status?: string }, message?: string) {
  const role = profile?.role?.toString().toUpperCase();
  if (role !== 'LANDLORD') return;
  const status = profile?.partner_approval_status?.toString().toUpperCase() || 'UNVERIFIED';
  if (status !== 'APPROVED') {
    throw new UnauthorizedException(
      message || 'Your landlord account is under review. You can continue once partner approval is complete.',
    );
  }
}

export function isKycApproved(profile: { kyc_status?: string } | null | undefined) {
  const status = profile?.kyc_status?.toString().toUpperCase();
  return status === 'APPROVED' || status === 'VERIFIED';
}

export function assertKycApproved(profile: { kyc_status?: string } | null | undefined) {
  if (!isKycApproved(profile)) {
    throw new UnauthorizedException('KYC verification must be approved to access this resource');
  }
}

export type AuthUserSummary = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
};

type AuthAdminUser = {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; role?: string };
};

/** Resolve auth users via Supabase Admin API (profiles table has no email column). */
export async function buildAuthUserMap(client: SupabaseClient): Promise<Map<string, AuthUserSummary>> {
  const map = new Map<string, AuthUserSummary>();
  const adminApi = client.auth.admin as {
    listUsers?: (opts: { page?: number; perPage?: number }) => Promise<{ data?: { users?: AuthAdminUser[] } }>;
  };
  if (typeof adminApi.listUsers !== 'function') {
    return map;
  }

  let page = 1;
  const perPage = 200;
  for (;;) {
    const result = await adminApi.listUsers({ page, perPage }).catch(() => null);
    const users = result?.data?.users ?? [];
    users.forEach((user) => {
      if (!user?.id) {
        return;
      }
      const email = user.email?.trim() || '';
      const metaName = user.user_metadata?.full_name?.toString().trim();
      map.set(user.id, {
        id: user.id,
        email,
        full_name: metaName || (email ? email.split('@')[0] : null),
        role: user.user_metadata?.role?.toString().toUpperCase() ?? null,
      });
    });
    if (users.length < perPage) {
      break;
    }
    page += 1;
    if (page > 50) {
      break;
    }
  }
  return map;
}

/** @deprecated Prefer buildAuthUserMap — kept for callers that only need id → email. */
export async function buildAuthEmailMap(client: SupabaseClient): Promise<Map<string, string>> {
  const users = await buildAuthUserMap(client);
  const map = new Map<string, string>();
  users.forEach((user, id) => {
    if (user.email) {
      map.set(id, user.email);
    }
  });
  return map;
}

export async function getAuthEmailByUserId(client: SupabaseClient, userId: string): Promise<string | null> {
  const adminApi = client.auth.admin as { getUserById?: (id: string) => Promise<{ data?: { user?: { email?: string } } }> };
  if (typeof adminApi.getUserById !== 'function') {
    return null;
  }
  const result = await adminApi.getUserById(userId).catch(() => null);
  return result?.data?.user?.email ?? null;
}
