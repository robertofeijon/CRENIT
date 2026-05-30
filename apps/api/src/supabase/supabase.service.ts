import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role client for all database/admin work (bypasses RLS).
 * Auth-only client (anon key) for signInWithPassword — never use sign-in on the service client
 * or it attaches the user JWT and breaks server-side writes with RLS errors.
 */
@Injectable()
export class SupabaseService {
  private readonly serviceClient: SupabaseClient;
  private readonly authClient: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!url || !serviceKey || !anonKey) {
      throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY are required.');
    }

    const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };

    this.serviceClient = createClient(url, serviceKey, clientOptions);
    this.authClient = createClient(url, anonKey, clientOptions);
  }

  /** Service role — all DB queries and auth.admin.* */
  getClient(): SupabaseClient {
    return this.serviceClient;
  }

  /** Anon key — password login only (does not pollute service client session) */
  getAuthClient(): SupabaseClient {
    return this.authClient;
  }
}
