import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { SupabaseService } from '../supabase/supabase.service';
import {
  BUYER_PERSONAS,
  DATA_INTELLIGENCE_METHODOLOGY,
  REPORT_PRODUCT_CATALOG,
  SALE_COMPS_ROADMAP,
  confidenceFromSampleCount,
  licensingNotice,
  recommendedUseCases,
} from './data-product-catalog';
import {
  IntelligenceFilters,
  MIN_STATISTICAL_SUBURB_SAMPLE,
  MIN_SUBURB_SAMPLE,
  average,
  computeTrend,
  generateApiKey,
  median,
  monthYearFromDate,
} from './market-intelligence.utils';

type MarketRecord = {
  suburb: string;
  city: string;
  property_type: string | null;
  verified_rent_amount: number;
  payment_status: string;
  days_to_pay: number;
  bedrooms: number | null;
  income_bracket: string | null;
  month_year: string;
  captured_at: string;
  weight?: number;
};

@Injectable()
export class MarketIntelligenceService {
  constructor(private readonly supabase: SupabaseService) {}
  private readonly minimumSample = 5;

  private mi() {
    return this.supabase.getClient().schema('market_intelligence');
  }

  private filterRecords(records: MarketRecord[], filters?: IntelligenceFilters): MarketRecord[] {
    if (!filters) return records;
    return records.filter((r) => {
      const captured = new Date(r.captured_at).getTime();
      if (filters.from && captured < filters.from.getTime()) return false;
      if (filters.to && captured > filters.to.getTime()) return false;
      if (filters.city && r.city?.toLowerCase() !== filters.city.toLowerCase()) return false;
      if (filters.suburb && r.suburb?.toLowerCase() !== filters.suburb.toLowerCase()) return false;
      if (filters.property_type && r.property_type?.toLowerCase() !== filters.property_type.toLowerCase()) return false;
      if (filters.bedrooms != null && r.bedrooms !== filters.bedrooms) return false;
      if (filters.payment_status && r.payment_status !== filters.payment_status) return false;
      return true;
    });
  }

  private recordWeight(r: MarketRecord) {
    return r.weight && r.weight > 0 ? r.weight : 1;
  }

  private async fetchSnapshotRecords(): Promise<MarketRecord[]> {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('market_data_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(500);
    if (error || !data?.length) return [];

    return (data as any[]).map((row) => {
      const onTimeRate = Number(row.on_time_rate ?? 0);
      const capturedAt = row.created_at ?? `${row.snapshot_date}T12:00:00.000Z`;
      return {
        suburb: row.suburb,
        city: row.city || 'Windhoek',
        property_type: row.property_type ?? null,
        verified_rent_amount: Number(row.median_rent ?? row.avg_rent ?? 0),
        payment_status: onTimeRate >= 85 ? 'on_time' : onTimeRate >= 60 ? 'late' : 'missed',
        days_to_pay: Number(row.avg_days_to_pay ?? 0),
        bedrooms: row.bedrooms ?? null,
        income_bracket: null,
        month_year: monthYearFromDate(String(row.snapshot_date ?? capturedAt)),
        captured_at: capturedAt,
        weight: Math.max(1, Number(row.sample_count ?? 1)),
      } satisfies MarketRecord;
    });
  }

  private async fetchAllRecords(filters?: IntelligenceFilters): Promise<{ records: MarketRecord[]; data_source: 'market_data_records' | 'market_data_snapshots' }> {
    try {
      const { data, error } = await this.mi().from('market_data_records').select('*').order('captured_at', { ascending: false });
      if (error) {
        console.warn('Market data fetch error:', error);
      }
      let records = ((data ?? []) as MarketRecord[]).map((r) => ({
        ...r,
        city: r.city || 'Windhoek',
        property_type: r.property_type ?? null,
      }));
      let data_source: 'market_data_records' | 'market_data_snapshots' = 'market_data_records';

      if (!records.length) {
        records = await this.fetchSnapshotRecords();
        data_source = 'market_data_snapshots';
      }

      return { records: this.filterRecords(records, filters), data_source };
    } catch (err) {
      console.warn('Market data schema unavailable:', err);
      const snapshots = await this.fetchSnapshotRecords();
      return { records: this.filterRecords(snapshots, filters), data_source: 'market_data_snapshots' };
    }
  }

  async getFilterOptions() {
    const { records } = await this.fetchAllRecords();
    const cities = [...new Set(records.map((r) => r.city).filter(Boolean))].sort();
    const suburbs = [...new Set(records.map((r) => r.suburb).filter(Boolean))].sort();
    const propertyTypes = [...new Set(records.map((r) => r.property_type).filter(Boolean))].sort() as string[];
    const bedrooms = [...new Set(records.map((r) => r.bedrooms).filter((b) => b != null))].sort((a, b) => (a as number) - (b as number)) as number[];
    return {
      cities: cities.length ? cities : ['Windhoek'],
      suburbs,
      property_types: propertyTypes.length ? propertyTypes : ['APARTMENT', 'HOUSE', 'TOWNHOUSE'],
      bedrooms,
      payment_statuses: ['on_time', 'late', 'missed'],
    };
  }

  async getDashboardOverview(filters: IntelligenceFilters) {
    const { records, data_source } = await this.fetchAllRecords(filters);
    const totalWeight = records.reduce((sum, r) => sum + this.recordWeight(r), 0);
    const suburbSet = new Set(records.map((r) => r.suburb));
    const onTimeWeight = records
      .filter((r) => r.payment_status === 'on_time')
      .reduce((sum, r) => sum + this.recordWeight(r), 0);
    const rents = records.flatMap((r) => Array(this.recordWeight(r)).fill(Number(r.verified_rent_amount)));
    const latestCapture = records
      .map((r) => new Date(r.captured_at).getTime())
      .sort((a, b) => b - a)[0];

    const volumeMap = new Map<string, { records: number; rentSum: number }>();
    for (const r of records) {
      const w = this.recordWeight(r);
      const entry = volumeMap.get(r.month_year) ?? { records: 0, rentSum: 0 };
      entry.records += w;
      entry.rentSum += Number(r.verified_rent_amount) * w;
      volumeMap.set(r.month_year, entry);
    }
    const volume_trend = [...volumeMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, { records: count, rentSum }]) => ({
        month,
        records: count,
        avg_rent: count ? Math.round(rentSum / count) : 0,
      }));

    const suburbMap = new Map<string, { weight: number; rents: number[]; onTime: number }>();
    for (const r of records) {
      const w = this.recordWeight(r);
      const entry = suburbMap.get(r.suburb) ?? { weight: 0, rents: [], onTime: 0 };
      entry.weight += w;
      entry.rents.push(...Array(w).fill(Number(r.verified_rent_amount)));
      if (r.payment_status === 'on_time') entry.onTime += w;
      suburbMap.set(r.suburb, entry);
    }
    const rent_by_suburb = [...suburbMap.entries()]
      .map(([suburb, { weight, rents, onTime }]) => ({
        suburb,
        median_rent: Math.round(median(rents)),
        on_time_rate: weight ? Math.round((onTime / weight) * 100) : 0,
        records: weight,
      }))
      .sort((a, b) => b.records - a.records)
      .slice(0, 8);

    const propertyMap = new Map<string, number>();
    for (const r of records) {
      const label = r.property_type || 'Unknown';
      propertyMap.set(label, (propertyMap.get(label) ?? 0) + this.recordWeight(r));
    }
    const property_mix = [...propertyMap.entries()].map(([label, count]) => ({ label, count }));

    const statusMap = new Map<string, number>();
    for (const r of records) {
      statusMap.set(r.payment_status, (statusMap.get(r.payment_status) ?? 0) + this.recordWeight(r));
    }
    const payment_status_mix = [...statusMap.entries()].map(([status, count]) => ({
      status,
      count,
      pct: totalWeight ? Math.round((count / totalWeight) * 100) : 0,
    }));

    const apiCalls = await this.countApiUsageInRange(filters.from, filters.to);
    const reportsGenerated = await this.countReportsInRange(filters.from, filters.to);

    return {
      pipeline_updated_at: latestCapture ? new Date(latestCapture).toISOString() : null,
      data_source,
      filters_applied: {
        timeframe_from: filters.from?.toISOString() ?? null,
        timeframe_to: filters.to.toISOString(),
        city: filters.city ?? null,
        suburb: filters.suburb ?? null,
        property_type: filters.property_type ?? null,
        bedrooms: filters.bedrooms ?? null,
        payment_status: filters.payment_status ?? null,
      },
      kpis: {
        verified_records: Math.round(totalWeight),
        active_suburbs: suburbSet.size,
        median_rent: Math.round(median(rents)),
        on_time_rate: totalWeight ? Math.round((onTimeWeight / totalWeight) * 100) : 0,
        avg_days_to_pay: totalWeight
          ? Math.round((records.reduce((s, r) => s + r.days_to_pay * this.recordWeight(r), 0) / totalWeight) * 10) / 10
          : 0,
        b2b_api_calls: apiCalls,
        reports_generated: reportsGenerated,
      },
      volume_trend,
      rent_by_suburb,
      property_mix,
      payment_status_mix,
      commercial: {
        methodology: DATA_INTELLIGENCE_METHODOLOGY,
        buyer_personas: BUYER_PERSONAS,
        licensable_suburbs: rent_by_suburb.filter((s) => s.records >= MIN_STATISTICAL_SUBURB_SAMPLE).length,
        directional_suburbs: rent_by_suburb.filter(
          (s) => s.records >= MIN_SUBURB_SAMPLE && s.records < MIN_STATISTICAL_SUBURB_SAMPLE,
        ).length,
      },
    };
  }

  getCommercialCatalog() {
    return {
      methodology: DATA_INTELLIGENCE_METHODOLOGY,
      buyer_personas: BUYER_PERSONAS,
      sale_comps_roadmap: SALE_COMPS_ROADMAP,
      licensing_terms: [
        'Licensed for internal use and client advisory by active B2B subscribers only.',
        'Raw microdata and re-identification attempts are prohibited.',
        'External reports must cite CRENIT as source and disclose sample size.',
        'Rental comps only today — sale comps require separate partner-sourced licence when launched.',
      ],
    };
  }

  private async countApiUsageInRange(from: Date | null, to: Date) {
    try {
      let query = this.mi().from('api_usage_log').select('id', { count: 'exact', head: true });
      if (from) query = query.gte('created_at', from.toISOString());
      query = query.lte('created_at', to.toISOString());
      const { count, error } = await query;
      if (!error && count != null) return count;
      let legacy = this.mi().from('api_usage_logs').select('id', { count: 'exact', head: true });
      if (from) legacy = legacy.gte('created_at', from.toISOString());
      legacy = legacy.lte('created_at', to.toISOString());
      const legacyRes = await legacy;
      return legacyRes.count ?? 0;
    } catch {
      return 0;
    }
  }

  private async countReportsInRange(from: Date | null, to: Date) {
    try {
      let query = this.mi().from('report_generations').select('id', { count: 'exact', head: true });
      if (from) query = query.gte('created_at', from.toISOString());
      query = query.lte('created_at', to.toISOString());
      const { count } = await query;
      return count ?? 0;
    } catch {
      return 0;
    }
  }

  private async safeDataQuery<T>(query: PromiseLike<{ data: T | null; error: any }>, fallback: T, description: string): Promise<T> {
    try {
      const { data, error } = await query;
      if (error) {
        console.warn(`Market intelligence ${description} query failed:`, error);
        return fallback;
      }
      return (data ?? fallback) as T;
    } catch (err) {
      console.warn(`Market intelligence ${description} query failed:`, err);
      return fallback;
    }
  }

  async getPlatformHealth(filters?: IntelligenceFilters) {
    try {
      const { records, data_source } = await this.fetchAllRecords(filters);
      const suburbCounts = new Map<string, number>();
      for (const r of records) {
        suburbCounts.set(r.suburb, (suburbCounts.get(r.suburb) ?? 0) + this.recordWeight(r));
      }
      const statisticallyUsableSuburbs = [...suburbCounts.values()].filter((c) => c >= MIN_STATISTICAL_SUBURB_SAMPLE).length;
      const latestCapture = records[0]?.captured_at ?? null;
      const tenantHashes = await this.safeDataQuery(
        this.mi().from('market_data_records').select('tenant_hash'),
        [] as { tenant_hash: string }[],
        'tenant_hash',
      );
      const uniqueTenancyHashes = new Set(
        (tenantHashes as { tenant_hash: string }[]).map((r) => r.tenant_hash).filter(Boolean),
      );

      const totalWeight = records.reduce((sum, r) => sum + this.recordWeight(r), 0);

      return {
        total_verified_records: Math.round(totalWeight),
        statistically_usable_suburbs: statisticallyUsableSuburbs,
        latest_capture_at: latestCapture,
        anonymised_tenancy_records: uniqueTenancyHashes.size || suburbCounts.size,
        data_source,
      };
    } catch {
      return {
        total_verified_records: 0,
        statistically_usable_suburbs: 0,
        latest_capture_at: null,
        anonymised_tenancy_records: 0,
        data_source: 'market_data_snapshots' as const,
      };
    }
  }

  async getSuburbExplorer(filters?: IntelligenceFilters) {
    try {
      const { records } = await this.fetchAllRecords(filters);
      if (records.length === 0) return { suburbs: [] };

      const bySuburb = new Map<string, MarketRecord[]>();
      for (const r of records) {
        const expanded = Array(this.recordWeight(r)).fill(r) as MarketRecord[];
        if (!bySuburb.has(r.suburb)) bySuburb.set(r.suburb, []);
        bySuburb.get(r.suburb)!.push(...expanded);
      }

      const suburbs = [...bySuburb.entries()]
        .filter(([, rows]) => rows.length >= this.minimumSample)
        .map(([suburb, rows]) => {
          const rents = rows.map((r) => Number(r.verified_rent_amount));
          const twoBr = rows.filter((r) => r.bedrooms === 2);
          const twoBrRents = twoBr.length ? twoBr.map((r) => Number(r.verified_rent_amount)) : rents;
          const onTime = rows.filter((r) => r.payment_status === 'on_time').length;
          const monthlyRentMap = new Map<string, number[]>();
          for (const r of rows) {
            if (!monthlyRentMap.has(r.month_year)) monthlyRentMap.set(r.month_year, []);
            monthlyRentMap.get(r.month_year)!.push(Number(r.verified_rent_amount));
          }
          const monthlyAvgs = [...monthlyRentMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, vals]) => ({ month, avg: average(vals) }));

          const latestRecordAt = rows
            .map((r) => new Date(r.captured_at).getTime())
            .sort((a, b) => b - a)[0];
          const daysSince = latestRecordAt ? Math.floor((Date.now() - latestRecordAt) / (24 * 60 * 60 * 1000)) : null;
          const freshness_status = daysSince == null ? 'unknown' : daysSince > 180 ? 'inactive' : daysSince > 90 ? 'stale' : 'fresh';
          const onTimeRate = Math.round((onTime / rows.length) * 100);
          const confidence = confidenceFromSampleCount(rows.length);
          const minRent = Math.round(Math.min(...rents));
          const maxRent = Math.round(Math.max(...rents));
          return {
            suburb,
            city: rows[0]?.city || 'Windhoek',
            transaction_count: rows.length,
            avg_verified_rent_2br: Math.round(average(twoBrRents)),
            median_rent: Math.round(median(rents)),
            price_range: { min: minRent, max: maxRent, median: Math.round(median(rents)) },
            on_time_rate: onTimeRate,
            avg_days_to_pay: Math.round(average(rows.map((r) => r.days_to_pay)) * 10) / 10,
            trend: computeTrend(monthlyAvgs),
            last_record_at: latestRecordAt ? new Date(latestRecordAt).toISOString() : null,
            freshness_status,
            minimum_sample_not_met: false,
            confidence_level: confidence,
            licensing_notice: licensingNotice(confidence),
            recommended_use_cases: recommendedUseCases(rows.length, onTimeRate),
            commercially_licensable: rows.length >= MIN_STATISTICAL_SUBURB_SAMPLE,
          };
        })
        .sort((a, b) => b.transaction_count - a.transaction_count);

      return { suburbs };
    } catch {
      return { suburbs: [] };
    }
  }

  async getSuburbDetail(suburb: string, filters?: IntelligenceFilters) {
    try {
      const { records: allRecords } = await this.fetchAllRecords(filters);
      const records = allRecords
        .filter((r) => r.suburb.toLowerCase() === suburb.toLowerCase())
        .flatMap((r) => Array(this.recordWeight(r)).fill(r) as MarketRecord[]);
      if (records.length < this.minimumSample) {
        return {
          suburb,
          minimum_sample_not_met: true,
          required_minimum_sample: this.minimumSample,
          transaction_count: records.length,
        };
      }

      const rents = records.map((r) => Number(r.verified_rent_amount));
      const rentBuckets = this.buildRentHistogram(rents);
      const onTimeTrend = this.buildOnTimeTrend(records);
      const bedroomBreakdown = [1, 2, 3].map((br) => {
        const subset = records.filter((r) => r.bedrooms === br);
        return {
          bedrooms: br,
          label: `${br}BR`,
          avg_rent: subset.length ? Math.round(average(subset.map((r) => Number(r.verified_rent_amount)))) : null,
          sample_count: subset.length,
        };
      });
      const incomeDistribution = this.buildIncomeDistribution(records);
      const onTime = records.filter((r) => r.payment_status === 'on_time').length;
      const onTimeRate = Math.round((onTime / records.length) * 100);
      const confidence = confidenceFromSampleCount(records.length);

      return {
        suburb,
        minimum_sample_not_met: false,
        transaction_count: records.length,
        data_domain: DATA_INTELLIGENCE_METHODOLOGY.data_domain,
        price_range: {
          min: Math.round(Math.min(...rents)),
          max: Math.round(Math.max(...rents)),
          median: Math.round(median(rents)),
        },
        pricing_guidance:
          'Use for monthly asking rent, feasibility rent lines, and rental yield — not for title transfer / sale price. Sale benchmarks require separate valuation.',
        confidence_level: confidence,
        licensing_notice: licensingNotice(confidence),
        recommended_use_cases: recommendedUseCases(records.length, onTimeRate),
        rent_distribution: rentBuckets,
        on_time_trend: onTimeTrend,
        bedroom_breakdown: bedroomBreakdown,
        income_to_rent_distribution: incomeDistribution,
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new NotFoundException(`Unable to load data for suburb: ${suburb}`);
    }
  }

  private buildRentHistogram(rents: number[]) {
    if (!rents.length) return [];
    const min = Math.floor(Math.min(...rents) / 1000) * 1000;
    const max = Math.ceil(Math.max(...rents) / 1000) * 1000;
    const step = Math.max(1000, Math.ceil((max - min) / 8 / 1000) * 1000);
    const buckets: { range: string; count: number; min: number; max: number }[] = [];
    for (let start = min; start < max; start += step) {
      const end = start + step;
      const count = rents.filter((r) => r >= start && r < end).length;
      buckets.push({ range: `N$${(start / 1000).toFixed(0)}k–N$${(end / 1000).toFixed(0)}k`, count, min: start, max: end });
    }
    return buckets;
  }

  private buildOnTimeTrend(records: MarketRecord[]) {
    const byMonth = new Map<string, { total: number; onTime: number }>();
    const sorted = [...records].sort((a, b) => a.month_year.localeCompare(b.month_year));
    for (const r of sorted) {
      if (!byMonth.has(r.month_year)) byMonth.set(r.month_year, { total: 0, onTime: 0 });
      const entry = byMonth.get(r.month_year)!;
      entry.total += 1;
      if (r.payment_status === 'on_time') entry.onTime += 1;
    }
    const months = [...byMonth.entries()].slice(-12);
    return months.map(([month, { total, onTime }]) => ({
      month,
      on_time_rate: total ? Math.round((onTime / total) * 100) : 0,
    }));
  }

  private buildIncomeDistribution(records: MarketRecord[]) {
    const counts = new Map<string, number>();
    for (const r of records) {
      if (!r.income_bracket) continue;
      counts.set(r.income_bracket, (counts.get(r.income_bracket) ?? 0) + 1);
    }
    return [...counts.entries()].map(([bracket, count]) => ({ bracket, count }));
  }

  async getReportProducts(): Promise<
    Array<{
      report_type: string;
      display_name: string;
      description?: string;
      price_nad: number;
      target_audiences: string[];
      use_cases: string[];
      deliverables: string[];
      requires_suburb: boolean;
      suggested_price_nad: number;
    }>
  > {
    const rows = await this.safeDataQuery(
      this.mi().from('report_products').select('*').order('display_name'),
      [] as Array<{ report_type: string; display_name: string; description?: string; price_nad: number }>,
      'report_products',
    );
    return (rows ?? []).map((row) => {
      const catalog = REPORT_PRODUCT_CATALOG[row.report_type];
      return {
        ...row,
        display_name: catalog?.display_name ?? row.display_name,
        description: catalog?.description ?? row.description,
        target_audiences: catalog?.target_audiences ?? [],
        use_cases: catalog?.use_cases ?? [],
        deliverables: catalog?.deliverables ?? [],
        requires_suburb: catalog?.requires_suburb ?? false,
        suggested_price_nad: catalog?.suggested_price_nad ?? Number(row.price_nad),
      };
    });
  }

  async updateReportPrice(reportType: string, priceNad: number) {
    const { data, error } = await this.mi()
      .from('report_products')
      .update({ price_nad: priceNad, updated_at: new Date().toISOString() })
      .eq('report_type', reportType)
      .select()
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  }

  async getReportPreview(reportType: string, suburb?: string) {
    const products = await this.getReportProducts();
    const product = products.find((p: { report_type: string }) => p.report_type === reportType);
    if (!product) throw new NotFoundException('Report type not found');

    let previewData: Record<string, unknown> = {};
    if (reportType === 'suburb_report' || reportType === 'development_feasibility' || reportType === 'lender_risk_pack') {
      if (!suburb) throw new BadRequestException('Suburb is required for this report type');
      previewData = await this.getSuburbDetail(suburb);
    } else if (reportType === 'city_overview') {
      previewData = { ...(await this.getSuburbExplorer()) };
    }

    return { product, preview: previewData };
  }

  async generateReportPdf(reportType: string, suburb: string | undefined, generatedBy?: string): Promise<Buffer> {
    const preview = await this.getReportPreview(reportType, suburb);
    const bufferChunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.on('data', (chunk: Buffer) => bufferChunks.push(chunk));
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(bufferChunks)));
      doc.on('error', reject);
    });

    doc.fontSize(18).font('Helvetica-Bold').text(`CRENIT Data Intelligence — ${preview.product.display_name}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    if (suburb) doc.text(`Suburb: ${suburb}`, { align: 'center' });
    doc.moveDown();

    doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text('Report summary');
    doc.font('Helvetica').fontSize(10).text(preview.product.description || '');
    doc.moveDown();

    const previewJson = JSON.stringify(preview.preview, null, 2);
    doc.fontSize(9).text(previewJson.slice(0, 3500) + (previewJson.length > 3500 ? '\n…(truncated)' : ''));
    doc.end();

    const sampleCount =
      reportType === 'city_overview'
        ? ((preview.preview as any)?.suburbs?.length ?? 0)
        : ((preview.preview as any)?.transaction_count ?? 0);
    await this.mi().from('report_generations').insert([
      { report_type: reportType, suburb: suburb ?? null, generated_by: generatedBy ?? null },
    ]);
    await this.supabase.getClient().from('admin_audit_log').insert([
      {
        admin_id: generatedBy ?? null,
        action: 'MARKET_DATA_EXPORT',
        target_user_id: null,
        details: {
          report_type: reportType,
          suburb: suburb ?? null,
          sample_count: sampleCount,
          generated_for_client: null,
        },
      },
    ]);

    const client = this.mi();
    const clients = await client.from('b2b_clients').select('id, reports_pulled_this_month');
    // increment is handled per-client in pull endpoint; admin gen logs only

    return pdfPromise;
  }

  async getB2bClients() {
    const clients = await this.safeDataQuery(this.mi().from('b2b_clients').select('*').order('name'), [], 'b2b_clients');
    const keys = await this.safeDataQuery(
      this.mi().from('api_keys').select('id, client_id, key_prefix, is_active, created_at, revoked_at'),
      [],
      'api_keys',
    );
    return (clients ?? []).map((c: Record<string, unknown>) => ({
      ...c,
      api_keys: (keys ?? []).filter((k: { client_id: string }) => k.client_id === c.id),
    }));
  }

  async createApiKey(clientId: string, label?: string, expiresInDays = 90) {
    const { raw, prefix, hash } = generateApiKey();
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await this.mi()
      .from('api_keys')
      .insert([{ client_id: clientId, key_hash: hash, key_prefix: prefix, label: label ?? 'Default', expires_at: expiresAt }])
      .select()
      .limit(1);
    if (error) throw error;
    return { key: raw, record: data?.[0] };
  }

  async revokeApiKey(keyId: string) {
    const { data, error } = await this.mi()
      .from('api_keys')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('id', keyId)
      .select()
      .limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
  }

  async validateApiKey(rawKey: string) {
    try {
      const { createHash } = await import('crypto');
      const hash = createHash('sha256').update(rawKey).digest('hex');
      const { data, error } = await this.mi()
        .from('api_keys')
        .select('*, b2b_clients(*)')
        .eq('key_hash', hash)
        .maybeSingle();
      if (error) {
        console.warn('Market intelligence validateApiKey query failed:', error);
        return null;
      }
      if (!data) return null;
      if (!data.is_active) return null;
      if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
        if (!data.grace_expires_at || new Date(data.grace_expires_at).getTime() < Date.now()) {
          return { ...data, expired: true };
        }
      }
      return data;
    } catch (err) {
      console.warn('Market intelligence validateApiKey failed:', err);
      return null;
    }
  }

  async logApiUsage(clientId: string, endpoint: string, statusCode: number, keyId?: string) {
    try {
      await this.mi().from('api_usage_logs').insert([{ client_id: clientId, endpoint, status_code: statusCode }]);
      await this.mi().from('api_usage_log').insert([{ client_id: clientId, key_id: keyId ?? null, endpoint, response_status: statusCode }]);
    } catch (err) {
      console.warn('Market intelligence logApiUsage failed:', err);
    }
  }

  async rotateApiKeyWithGrace(oldKeyId: string, clientId: string, label?: string) {
    const created = await this.createApiKey(clientId, label);
    const graceExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await this.mi()
      .from('api_keys')
      .update({ grace_expires_at: graceExpiry, expires_at: graceExpiry })
      .eq('id', oldKeyId);
    return created;
  }

  getTierDailyLimit(accessTier: string) {
    if (accessTier === 'One-time report') return 10;
    if (accessTier === 'Monthly subscription') return 100;
    return 1000;
  }

  async hasExceededTierLimit(clientId: string, accessTier: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const { data, error } = await this.mi()
      .from('api_usage_log')
      .select('id')
      .eq('client_id', clientId)
      .gte('created_at', start.toISOString());
    if (error) return false;
    return (data?.length ?? 0) >= this.getTierDailyLimit(accessTier);
  }

  async findKeysExpiringWithin(days: number) {
    const threshold = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await this.mi()
      .from('api_keys')
      .select('id, client_id, expires_at, b2b_clients(name)')
      .not('expires_at', 'is', null)
      .lte('expires_at', threshold)
      .gte('expires_at', new Date().toISOString());
    if (error) throw error;
    return data || [];
  }

  async getApiConfig() {
    const clients = await this.getB2bClients();
    const logs = await this.safeDataQuery(
      this.mi()
        .from('api_usage_logs')
        .select('*, b2b_clients(name)')
        .order('created_at', { ascending: false })
        .limit(50),
      [],
      'api_usage_logs',
    );
    return {
      endpoints: [
        {
          path: '/api/v1/suburb/{name}',
          description:
            'Licensed suburb rental comps: price range, median rent, on-time rate, bedroom splits — for agents, developers, and PM tools.',
        },
        {
          path: '/api/v1/city-overview',
          description: 'Rank all suburbs by verified rent and payment discipline — portfolio and policy dashboards.',
        },
        {
          path: '/api/v1/lender-risk/{suburb}',
          description: 'Rental-backed credit signals: payment behaviour and income stress bands for banks.',
        },
      ],
      tier_limits: {
        'One-time report': 10,
        'Monthly subscription': 200,
        'API access': 500,
      },
      clients,
      usage_logs: logs ?? [],
    };
  }

  async getCityOverview() {
    return this.getSuburbExplorer();
  }

  async getLenderRisk(suburb: string) {
    const detail = await this.getSuburbDetail(suburb);
    const { records: allRecords } = await this.fetchAllRecords();
    const records = allRecords.filter((r) => r.suburb.toLowerCase() === suburb.toLowerCase());
    const onTime = records.filter((r) => r.payment_status === 'on_time').length;
    return {
      suburb,
      on_time_payment_rate: records.length ? Math.round((onTime / records.length) * 100) : 0,
      income_to_rent_distribution: detail.income_to_rent_distribution,
      bedroom_breakdown: detail.bedroom_breakdown,
      sample_count: records.length,
    };
  }
}
