import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabase: SupabaseService) {}

  getWelcomeMessage(): string {
    return 'RentCredit auth service is available.';
  }

  async register(payload: { email: string; password: string; full_name: string; role?: string }) {
    const client = this.supabase.getClient();

    // create user via admin API
    const res = await client.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: { role: payload.role || 'TENANT' },
    });

    if (res.error) {
      throw res.error;
    }

    const user = (res as any).data?.user ?? null;
    if (!user) throw new Error('Failed to create user via Supabase admin API');

    // create profile row with a default tenant KYC status
    await client.from('profiles').insert([
      {
        id: user.id,
        full_name: payload.full_name,
        role: payload.role || 'TENANT',
        kyc_status: payload.role === 'TENANT' ? 'NOT_SUBMITTED' : 'APPROVED',
      },
    ]);

    this.logger.log(`Registered user ${payload.email} -> ${user.id}`);

    return { user, error: null };
  }

  async login(payload: { email: string; password: string }) {
    const client = this.supabase.getClient();
    const res = await client.auth.signInWithPassword({ email: payload.email, password: payload.password });

    if (res.error) throw res.error;
    return res;
  }

  async getProfileByToken(token: string) {
    const client = this.supabase.getClient();

    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData.user) {
      throw authError || new Error('Unable to validate auth token');
    }

    const user = authData.user;
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    const isAdminEmail = user.email ? adminEmails.includes(user.email.toLowerCase()) : false;
    const role = isAdminEmail ? 'ADMIN' : profile.role;

    return { user, profile: { ...profile, role } };
  }
}
