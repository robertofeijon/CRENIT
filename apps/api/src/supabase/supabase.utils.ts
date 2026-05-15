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

export async function getUserProfileFromAuthHeader(client: SupabaseClient, authHeader?: string) {
  const user = await getUserFromAuthHeader(client, authHeader);
  const { data: profile, error } = await client.from('profiles').select('*').eq('id', user.id).single();
  if (error || !profile) {
    throw new UnauthorizedException('Unable to resolve user profile');
  }
  return { user, profile };
}

export function assertRole(profile: any, requiredRole: string) {
  if (!profile || !profile.role) {
    throw new UnauthorizedException('User role not found');
  }
  if (profile.role.toString().toUpperCase() !== requiredRole.toUpperCase()) {
    throw new UnauthorizedException('Insufficient permissions');
  }
}

export function assertKycApproved(profile: any) {
  if (!profile || profile.kyc_status !== 'APPROVED') {
    throw new UnauthorizedException('KYC verification must be approved to access this resource');
  }
}
