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

  if (profile?.role?.toString().toUpperCase() === 'ADMIN') {
    return 'ADMIN';
  }

  return profile?.role?.toString().toUpperCase() ?? 'TENANT';
}

export async function ensureUserProfile(client: SupabaseClient, user: any) {
  const defaultRole = user?.user_metadata?.role?.toString().toUpperCase() ?? 'TENANT';
  const role = resolveProfileRole({ role: defaultRole }, user.email);
  const full_name =
    user?.user_metadata?.full_name?.toString().trim() ||
    user?.email?.toString().split('@')[0] ||
    'RentCredit User';

  const { data: profile, error: selectError } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (selectError) {
    throw new UnauthorizedException('Unable to look up user profile');
  }

  if (profile) {
    return profile;
  }

  const { data: created, error: insertError } = await client
    .from('profiles')
    .upsert([
      {
        id: user.id,
        full_name,
        role,
        kyc_status: role === 'TENANT' ? 'NOT_SUBMITTED' : 'APPROVED',
        partner_approval_status: role === 'LANDLORD' ? 'PENDING_APPROVAL' : 'APPROVED',
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
  const status = profile?.partner_approval_status?.toString().toUpperCase() || 'APPROVED';
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
