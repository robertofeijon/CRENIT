import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { hashUserId } from './market-intelligence.utils';

export type ConsentType = 'LANDLORD_MARKET_DATA' | 'TENANT_MARKET_DATA';

@Injectable()
export class ConsentService {
  constructor(private readonly supabase: SupabaseService) {}

  private getClient() {
    return this.supabase.getClient();
  }

  async grantConsent(userId: string, consentType: ConsentType, termsVersion = '1.0') {
    const client = this.getClient();
    const now = new Date().toISOString();
    const { data, error } = await client
      .from('data_sharing_consents')
      .upsert(
        [
          {
            user_id: userId,
            consent_type: consentType,
            granted: true,
            terms_version: termsVersion,
            granted_at: now,
            revoked_at: null,
          },
        ],
        { onConflict: 'user_id,consent_type' },
      )
      .select()
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  }

  async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const client = this.getClient();
    const { data, error } = await client
      .from('data_sharing_consents')
      .select('granted, revoked_at')
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .maybeSingle();
    if (error) throw error;
    return !!(data?.granted && !data.revoked_at);
  }

  async getConsents(userId: string) {
    const client = this.getClient();
    const { data, error } = await client.from('data_sharing_consents').select('*').eq('user_id', userId);
    if (error) throw error;
    return data ?? [];
  }

  async revokeConsent(userId: string, consentType: ConsentType) {
    const client = this.getClient();
    const now = new Date().toISOString();
    const { data, error } = await client
      .from('data_sharing_consents')
      .update({ granted: false, revoked_at: now })
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .select()
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  }

  async eraseTenantAnalytics(tenantId: string) {
    const client = this.getClient();
    const tenantHash = hashUserId(tenantId);
    const { error } = await client.schema('market_intelligence').from('market_data_records').delete().eq('tenant_hash', tenantHash);
    if (error) throw error;
    await this.revokeConsent(tenantId, 'TENANT_MARKET_DATA');
    return { erased: true };
  }
}
