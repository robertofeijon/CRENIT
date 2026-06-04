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
  buildMarketDataEnvelope,
  type MarketDataComplianceFields,
  type MarketDataSource,
  type SuburbDetailPayload,
} from './market-intelligence-response.util';
import { buildOpenApiDocument } from './market-intelligence-openapi.util';
import { buildPostmanCollection } from './market-intelligence-postman.util';
import { parseSaleCompsCsv } from './market-intelligence-sale-comps-csv.util';
import { haversineMeters, normalizeSuburbLabel, suburbsMatch } from './market-intelligence-geocode.util';
import { MarketIntelligenceWebhookService } from './market-intelligence-webhook.service';
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
  record_source?: MarketDataSource;
};

@Injectable()
export class MarketIntelligenceService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly webhookService: MarketIntelligenceWebhookService,
  ) {}
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

  private suburbKey(suburb: string, city: string) {
    return `${suburb.toLowerCase()}::${(city || 'Windhoek').toLowerCase()}`;
  }

  private resolveSuburbDataSource(
    suburb: string,
    data_source: MarketDataSource,
    suburb_sources: Map<string, MarketDataSource>,
  ): MarketDataSource {
    const normalized = suburb.toLowerCase();
    for (const [key, source] of suburb_sources) {
      if (key.startsWith(`${normalized}::`)) return source;
    }
    return data_source;
  }

  private portalDataSourceLabel(data_source: MarketDataSource): string {
    if (data_source === 'market_data_records') return 'Verified platform payments';
    if (data_source === 'market_data_snapshots') return 'Rolled-up snapshots (demo / fallback)';
    return 'Mixed verified payments and rolled-up snapshots';
  }

  private expandWeightedRecords(template: MarketRecord): MarketRecord[] {
    const weight = this.recordWeight(template);
    return Array(weight).fill(template) as MarketRecord[];
  }

  private async fetchLiveRecords(): Promise<MarketRecord[]> {
    try {
      const { data, error } = await this.mi().from('market_data_records').select('*').order('captured_at', { ascending: false });
      if (error) {
        console.warn('Market data live fetch error:', error);
        return [];
      }
      return ((data ?? []) as MarketRecord[]).map((r) => ({
        ...r,
        city: r.city || 'Windhoek',
        property_type: r.property_type ?? null,
        record_source: 'market_data_records' as const,
        weight: 1,
      }));
    } catch (err) {
      console.warn('Market data live schema unavailable:', err);
      return [];
    }
  }

  private snapshotLatestPerSuburb(records: MarketRecord[]): Map<string, MarketRecord> {
    const latest = new Map<string, MarketRecord>();
    for (const r of records) {
      const key = this.suburbKey(r.suburb, r.city);
      if (!latest.has(key)) latest.set(key, r);
    }
    return latest;
  }

  /**
   * Per-suburb merge: prefer live verified records when n ≥ 5; otherwise latest snapshot for that suburb.
   */
  private async fetchMergedRecords(filters?: IntelligenceFilters): Promise<{
    records: MarketRecord[];
    data_source: MarketDataSource;
    suburb_sources: Map<string, MarketDataSource>;
  }> {
    const live = this.filterRecords(await this.fetchLiveRecords(), filters);
    const snapshots = this.filterRecords(await this.fetchSnapshotRecords(), filters);

    const liveBySuburb = new Map<string, MarketRecord[]>();
    for (const r of live) {
      const key = this.suburbKey(r.suburb, r.city);
      const list = liveBySuburb.get(key) ?? [];
      list.push(r);
      liveBySuburb.set(key, list);
    }

    const snapshotLatest = this.snapshotLatestPerSuburb(snapshots);
    const merged: MarketRecord[] = [];
    const suburb_sources = new Map<string, MarketDataSource>();
    const keys = new Set([...liveBySuburb.keys(), ...snapshotLatest.keys()]);

    for (const key of keys) {
      const liveRows = liveBySuburb.get(key) ?? [];
      if (liveRows.length >= this.minimumSample) {
        merged.push(...liveRows);
        suburb_sources.set(key, 'market_data_records');
        continue;
      }
      const snapTemplate = snapshotLatest.get(key);
      if (snapTemplate) {
        const snapRows = this.expandWeightedRecords({
          ...snapTemplate,
          record_source: 'market_data_snapshots',
        });
        if (snapRows.length >= this.minimumSample) {
          merged.push(...snapRows);
          suburb_sources.set(key, 'market_data_snapshots');
          continue;
        }
        if (liveRows.length > 0) {
          merged.push(...liveRows);
          suburb_sources.set(key, 'market_data_records');
        } else {
          merged.push(...snapRows);
          suburb_sources.set(key, 'market_data_snapshots');
        }
      } else if (liveRows.length > 0) {
        merged.push(...liveRows);
        suburb_sources.set(key, 'market_data_records');
      }
    }

    const sources = new Set(suburb_sources.values());
    let data_source: MarketDataSource = 'market_data_records';
    if (sources.size === 0) {
      data_source = live.length > 0 ? 'market_data_records' : snapshots.length > 0 ? 'market_data_snapshots' : 'market_data_records';
    } else if (sources.size === 1) {
      data_source = [...sources][0];
    } else {
      data_source = 'mixed';
    }

    return { records: merged, data_source, suburb_sources };
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
        record_source: 'market_data_snapshots' as const,
      } satisfies MarketRecord;
    });
  }

  async getFilterOptions() {
    const { records } = await this.fetchMergedRecords();
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
    const { records, data_source } = await this.fetchMergedRecords(filters);
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

  async getCommercialCatalog() {
    const salePilot = await this.getSaleCompsPilotSummary();
    return {
      methodology: DATA_INTELLIGENCE_METHODOLOGY,
      buyer_personas: BUYER_PERSONAS,
      sale_comps_roadmap: {
        ...SALE_COMPS_ROADMAP,
        status: salePilot.record_count > 0 ? ('pilot' as const) : SALE_COMPS_ROADMAP.status,
        pilot_summary: salePilot,
        partner_integration: {
          ...SALE_COMPS_ROADMAP.partner_integration,
          technical_placeholder: {
            ingest_endpoint: 'POST /admin/data-intelligence/sale-comps/ingest',
            partner_ingest: 'POST /api/v1/sale-comps/ingest',
            public_api: 'GET /api/v1/suburb/{name}/sale-comps',
            storage_table: 'market_intelligence.sale_comps_records',
          },
        },
      },
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
      const { records, data_source } = await this.fetchMergedRecords(filters);
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
      const { records, data_source } = await this.fetchMergedRecords(filters);
      if (records.length === 0) {
        return buildMarketDataEnvelope({ suburbs: [] }, { transaction_count: 0, data_source });
      }

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

      const totalWeight = records.reduce((sum, r) => sum + this.recordWeight(r), 0);
      const onTimeWeight = records
        .filter((r) => r.payment_status === 'on_time')
        .reduce((sum, r) => sum + this.recordWeight(r), 0);
      const overallOnTime = totalWeight ? Math.round((onTimeWeight / totalWeight) * 100) : 0;

      return buildMarketDataEnvelope(
        { suburbs },
        { transaction_count: Math.round(totalWeight), data_source, on_time_rate: overallOnTime },
      );
    } catch {
      return buildMarketDataEnvelope({ suburbs: [] }, {
        transaction_count: 0,
        data_source: 'market_data_snapshots',
      });
    }
  }

  async getSuburbDetail(
    suburb: string,
    filters?: IntelligenceFilters,
  ): Promise<SuburbDetailPayload & MarketDataComplianceFields> {
    try {
      const { records: allRecords, data_source, suburb_sources } = await this.fetchMergedRecords(filters);
      const suburbSource = this.resolveSuburbDataSource(suburb, data_source, suburb_sources);
      const records = allRecords
        .filter((r) => r.suburb.toLowerCase() === suburb.toLowerCase())
        .flatMap((r) => Array(this.recordWeight(r)).fill(r) as MarketRecord[]);
      if (records.length < this.minimumSample) {
        return buildMarketDataEnvelope(
          { suburb },
          {
            transaction_count: records.length,
            data_source: suburbSource,
            minimum_sample_not_met: true,
            required_minimum_sample: this.minimumSample,
          },
        );
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

      return buildMarketDataEnvelope(
        {
          suburb,
          on_time_rate: onTimeRate,
          data_domain: DATA_INTELLIGENCE_METHODOLOGY.data_domain,
          price_range: {
            min: Math.round(Math.min(...rents)),
            max: Math.round(Math.max(...rents)),
            median: Math.round(median(rents)),
          },
          pricing_guidance:
            'Use for monthly asking rent, feasibility rent lines, and rental yield — not for title transfer / sale price. Sale benchmarks require separate valuation.',
          rent_distribution: rentBuckets,
          on_time_trend: onTimeTrend,
          bedroom_breakdown: bedroomBreakdown,
          income_to_rent_distribution: incomeDistribution,
        },
        {
          transaction_count: records.length,
          data_source: suburbSource,
          on_time_rate: onTimeRate,
        },
      );
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new NotFoundException(`Unable to load data for suburb: ${suburb}`);
    }
  }

  async getSuburbTrends(suburb: string, filters?: IntelligenceFilters) {
    const { records: allRecords, data_source, suburb_sources } = await this.fetchMergedRecords(filters);
    const suburbSource = this.resolveSuburbDataSource(suburb, data_source, suburb_sources);
    const records = allRecords
      .filter((r) => r.suburb.toLowerCase() === suburb.toLowerCase())
      .flatMap((r) => Array(this.recordWeight(r)).fill(r) as MarketRecord[]);

    if (records.length < this.minimumSample) {
      return buildMarketDataEnvelope(
        { suburb, on_time_trend: [] as Array<{ month: string; on_time_rate: number }> },
        {
          transaction_count: records.length,
          data_source: suburbSource,
          minimum_sample_not_met: true,
          required_minimum_sample: this.minimumSample,
        },
      );
    }

    const onTime = records.filter((r) => r.payment_status === 'on_time').length;
    const onTimeRate = Math.round((onTime / records.length) * 100);

    return buildMarketDataEnvelope(
      {
        suburb,
        on_time_trend: this.buildOnTimeTrend(records),
      },
      {
        transaction_count: records.length,
        data_source: suburbSource,
        on_time_rate: onTimeRate,
      },
    );
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
    if (reportType === 'lender_risk_pack') {
      if (!suburb) throw new BadRequestException('Suburb is required for this report type');
      previewData = await this.getLenderRisk(suburb);
    } else if (reportType === 'suburb_report' || reportType === 'development_feasibility') {
      if (!suburb) throw new BadRequestException('Suburb is required for this report type');
      previewData = await this.getSuburbDetail(suburb);
    } else if (reportType === 'city_overview') {
      previewData = { ...(await this.getSuburbExplorer()) };
    }

    return { product, preview: previewData };
  }

  async assertReportSampleReady(preview: { preview: Record<string, unknown> }, reportType: string) {
    const data = preview.preview;
    if (reportType === 'city_overview') {
      const suburbs = (data as { suburbs?: unknown[] }).suburbs;
      if (!suburbs?.length) {
        throw new BadRequestException('Insufficient data for city overview report');
      }
      return;
    }
    if ((data as { minimum_sample_not_met?: boolean }).minimum_sample_not_met) {
      throw new BadRequestException(
        `Insufficient verified sample for this report (need at least ${(data as { required_minimum_sample?: number }).required_minimum_sample ?? MIN_SUBURB_SAMPLE} transactions)`,
      );
    }
  }

  async generateReportPdf(
    reportType: string,
    suburb: string | undefined,
    generatedBy?: string,
    b2bClientId?: string,
  ): Promise<Buffer> {
    const preview = await this.getReportPreview(reportType, suburb);
    await this.assertReportSampleReady(preview, reportType);
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
      {
        report_type: reportType,
        suburb: suburb ?? null,
        generated_by: generatedBy ?? null,
        client_id: b2bClientId ?? null,
      },
    ]);
    if (b2bClientId) {
      await this.incrementB2bReportsPulled(b2bClientId);
    }
    await this.supabase.getClient().from('admin_audit_log').insert([
      {
        admin_id: generatedBy ?? null,
        action: 'MARKET_DATA_EXPORT',
        target_user_id: null,
        details: {
          report_type: reportType,
          suburb: suburb ?? null,
          sample_count: sampleCount,
          generated_for_client: b2bClientId ?? null,
        },
      },
    ]);

    return pdfPromise;
  }

  private async incrementB2bReportsPulled(clientId: string) {
    try {
      const { data } = await this.mi().from('b2b_clients').select('reports_pulled_this_month').eq('id', clientId).maybeSingle();
      const current = Number((data as { reports_pulled_this_month?: number })?.reports_pulled_this_month ?? 0);
      await this.mi().from('b2b_clients').update({ reports_pulled_this_month: current + 1 }).eq('id', clientId);
    } catch (err) {
      console.warn('incrementB2bReportsPulled failed:', err);
    }
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

  getB2bApiCatalog() {
    return {
      version: '1.0',
      product: 'CRENIT Data Intelligence',
      documentation_path: 'docs/B2B_INTEGRATOR_GUIDE.md',
      authentication: {
        header: 'X-CRENIT-Key',
        legacy_header: 'X-RentCredit-Key',
      },
      compliance_envelope: [
        'transaction_count',
        'sample_count',
        'confidence_level',
        'licensing_notice',
        'commercially_licensable',
        'data_source',
        'minimum_sample_not_met',
        'required_minimum_sample',
        'recommended_use_cases',
      ],
      minimum_suburb_sample: MIN_SUBURB_SAMPLE,
      licensable_suburb_sample: MIN_STATISTICAL_SUBURB_SAMPLE,
      routes: [
        { method: 'GET', path: '/api/v1/catalog', suburb_required: false },
        { method: 'GET', path: '/api/v1/suburb/:name', suburb_required: true },
        { method: 'GET', path: '/api/v1/suburb/:name/trends', suburb_required: true },
        { method: 'GET', path: '/api/v1/city-overview', suburb_required: false },
        { method: 'GET', path: '/api/v1/lender-risk/:suburb', suburb_required: true },
        { method: 'GET', path: '/api/v1/reports', suburb_required: false },
        { method: 'GET', path: '/api/v1/reports/:reportType/preview', suburb_required: 'conditional' },
        { method: 'GET', path: '/api/v1/reports/:reportType/pdf', suburb_required: 'conditional', response: 'application/pdf' },
        { method: 'GET', path: '/api/v1/openapi.json', suburb_required: false },
        { method: 'GET', path: '/api/v1/suburb/:name/sale-comps', suburb_required: true, pilot: true },
        { method: 'POST', path: '/api/v1/sale-comps/ingest', suburb_required: false, pilot: true, max_records: 100 },
        { method: 'GET', path: '/api/v1/webhooks', suburb_required: false },
        { method: 'POST', path: '/api/v1/webhooks', suburb_required: false },
      ],
      report_types: ['suburb_report', 'city_overview', 'lender_risk_pack', 'development_feasibility'],
      integrator_exports: {
        openapi: '/api/v1/openapi.json',
        postman_admin: '/admin/data-intelligence/integrator/postman.json',
        openapi_admin: '/admin/data-intelligence/integrator/openapi.json',
      },
    };
  }

  getOpenApiDocument(serverUrl?: string) {
    return buildOpenApiDocument(serverUrl ?? process.env.API_PUBLIC_URL ?? 'http://localhost:3001');
  }

  getPostmanCollection(serverUrl?: string) {
    return buildPostmanCollection({ serverUrl: serverUrl ?? process.env.API_PUBLIC_URL ?? 'http://localhost:3001' });
  }

  async syncLicensableSuburbWebhooks() {
    const { suburbs } = await this.getSuburbExplorer();
    return this.webhookService.syncLicensableSuburbWatchAndNotify((suburbs ?? []) as any[]);
  }

  registerB2bWebhook(clientId: string, url: string, events?: string[]) {
    return this.webhookService.registerWebhook(clientId, url, events);
  }

  listB2bWebhooks(clientId: string) {
    return this.webhookService.listWebhooksForClient(clientId);
  }

  deactivateB2bWebhook(clientId: string, subscriptionId: string) {
    return this.webhookService.deactivateWebhook(subscriptionId, clientId);
  }

  listWebhookDeliveries(limit?: number, filter?: 'all' | 'failed' | 'pending_retry') {
    return this.webhookService.listRecentDeliveries(limit ?? 50, filter ?? 'all');
  }

  async ingestSaleCompsFromCsv(partnerClientId: string | null, csvText: string) {
    const records = parseSaleCompsCsv(csvText, 500);
    return this.ingestSaleCompsPilot(partnerClientId, records);
  }

  async getGeocodeQaReport(limit = 120) {
    const client = this.supabase.getClient();
    const { data: records, error } = await this.mi()
      .from('market_data_records')
      .select('id, payment_id, suburb, city, geo_lat, geo_lng, captured_at')
      .order('captured_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    const rows = records ?? [];
    const paymentIds = rows.map((r: { payment_id: string }) => r.payment_id).filter(Boolean);

    type PaymentCtx = {
      property_suburb: string | null;
      property_city: string | null;
      property_name: string | null;
      property_geo_lat: number | null;
      property_geo_lng: number | null;
      tenant_suburb: string | null;
    };
    const ctxByPayment = new Map<string, PaymentCtx>();

    if (paymentIds.length) {
      const { data: payments } = await client
        .from('payments')
        .select('id, tenant_id, lease_id')
        .in('id', paymentIds);
      const leaseIds = [...new Set((payments ?? []).map((p: { lease_id: string | null }) => p.lease_id).filter(Boolean))];
      const tenantIds = [...new Set((payments ?? []).map((p: { tenant_id: string | null }) => p.tenant_id).filter(Boolean))];

      const leaseMap = new Map<string, { unit_id: string | null }>();
      if (leaseIds.length) {
        const { data: leases } = await client.from('leases').select('id, unit_id').in('id', leaseIds);
        for (const l of leases ?? []) leaseMap.set(l.id, { unit_id: l.unit_id });
      }

      const unitIds = [...new Set([...leaseMap.values()].map((l) => l.unit_id).filter(Boolean))] as string[];
      const propertyByUnit = new Map<string, PaymentCtx>();
      if (unitIds.length) {
        const { data: units } = await client
          .from('units')
          .select('id, property_id, properties(property_name, address_suburb, address_city, geo_lat, geo_lng)')
          .in('id', unitIds);
        for (const u of units ?? []) {
          const prop = (u as { properties?: Record<string, unknown> | Record<string, unknown>[] }).properties;
          const p = Array.isArray(prop) ? prop[0] : prop;
          propertyByUnit.set(u.id, {
            property_suburb: (p?.address_suburb as string) ?? null,
            property_city: (p?.address_city as string) ?? null,
            property_name: (p?.property_name as string) ?? null,
            property_geo_lat: p?.geo_lat != null ? Number(p.geo_lat) : null,
            property_geo_lng: p?.geo_lng != null ? Number(p.geo_lng) : null,
            tenant_suburb: null,
          });
        }
      }

      const tenantSuburb = new Map<string, string | null>();
      if (tenantIds.length) {
        const { data: profiles } = await client.from('profiles').select('id, address_suburb').in('id', tenantIds);
        for (const p of profiles ?? []) tenantSuburb.set(p.id, p.address_suburb ?? null);
      }

      for (const pay of payments ?? []) {
        const lease = pay.lease_id ? leaseMap.get(pay.lease_id) : null;
        const propCtx = lease?.unit_id ? propertyByUnit.get(lease.unit_id) : undefined;
        ctxByPayment.set(pay.id, {
          property_suburb: propCtx?.property_suburb ?? null,
          property_city: propCtx?.property_city ?? null,
          property_name: propCtx?.property_name ?? null,
          property_geo_lat: propCtx?.property_geo_lat ?? null,
          property_geo_lng: propCtx?.property_geo_lng ?? null,
          tenant_suburb: pay.tenant_id ? tenantSuburb.get(pay.tenant_id) ?? null : null,
        });
      }
    }

    const GEO_DRIFT_METERS = 1500;
    const flags: Array<{
      payment_id: string;
      record_suburb: string;
      property_suburb: string | null;
      tenant_suburb: string | null;
      issues: string[];
      distance_m: number | null;
      captured_at: string;
    }> = [];

    for (const rec of rows) {
      const ctx = ctxByPayment.get(rec.payment_id);
      const issues: string[] = [];
      let distance_m: number | null = null;

      if (!ctx?.property_suburb) {
        issues.push('missing_property_link');
      } else if (!suburbsMatch(rec.suburb, ctx.property_suburb)) {
        issues.push('property_suburb_mismatch');
      }

      if (ctx?.tenant_suburb && ctx.property_suburb && !suburbsMatch(ctx.tenant_suburb, ctx.property_suburb)) {
        issues.push('tenant_property_suburb_mismatch');
      }

      if (ctx?.property_geo_lat == null || ctx?.property_geo_lng == null) {
        issues.push('missing_property_geo');
      }

      const rLat = rec.geo_lat != null ? Number(rec.geo_lat) : null;
      const rLng = rec.geo_lng != null ? Number(rec.geo_lng) : null;
      if (
        rLat != null &&
        rLng != null &&
        ctx?.property_geo_lat != null &&
        ctx?.property_geo_lng != null
      ) {
        distance_m = Math.round(haversineMeters(rLat, rLng, ctx.property_geo_lat, ctx.property_geo_lng));
        if (distance_m > GEO_DRIFT_METERS) issues.push('geo_drift');
      }

      if (issues.length) {
        flags.push({
          payment_id: rec.payment_id,
          record_suburb: rec.suburb,
          property_suburb: ctx?.property_suburb ?? null,
          tenant_suburb: ctx?.tenant_suburb ?? null,
          issues,
          distance_m,
          captured_at: rec.captured_at,
        });
      }
    }

    return {
      scanned: rows.length,
      flagged_count: flags.length,
      summary: {
        property_suburb_mismatch: flags.filter((f) => f.issues.includes('property_suburb_mismatch')).length,
        tenant_property_suburb_mismatch: flags.filter((f) => f.issues.includes('tenant_property_suburb_mismatch')).length,
        missing_property_geo: flags.filter((f) => f.issues.includes('missing_property_geo')).length,
        geo_drift: flags.filter((f) => f.issues.includes('geo_drift')).length,
        missing_property_link: flags.filter((f) => f.issues.includes('missing_property_link')).length,
      },
      flags: flags.slice(0, 80),
    };
  }

  async sendWebhookTestDelivery(subscriptionId: string) {
    return this.webhookService.sendTestDelivery(subscriptionId);
  }

  retryWebhookDeliveries() {
    return this.webhookService.retryPendingDeliveries();
  }

  async getLicensableSuburbWatchState() {
    try {
      const { data, error } = await this.mi().from('licensable_suburb_watch').select('*').order('suburb');
      if (error) throw error;
      return {
        suburbs: data ?? [],
        licensable_count: (data ?? []).filter((r: { commercially_licensable: boolean }) => r.commercially_licensable).length,
      };
    } catch {
      return { suburbs: [], licensable_count: 0 };
    }
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
      integrator_guide: 'docs/B2B_INTEGRATOR_GUIDE.md',
      endpoints: [
        {
          path: '/api/v1/catalog',
          description: 'Integrator catalog: routes, compliance fields, report types.',
        },
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
        {
          path: '/api/v1/suburb/{name}/trends',
          description: 'Monthly on-time payment trend for one suburb (compliance envelope included).',
        },
        {
          path: '/api/v1/reports',
          description: 'Licensed report catalog (suburb_report, city_overview, lender_risk_pack, development_feasibility).',
        },
        {
          path: '/api/v1/reports/{reportType}/preview?suburb=',
          description: 'JSON preview of report data before PDF pull.',
        },
        {
          path: '/api/v1/reports/{reportType}/pdf?suburb=',
          description: 'Download licensed PDF; 400 when suburb sample below minimum.',
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

  async getLenderRisk(suburb: string, filters?: IntelligenceFilters) {
    const detail = await this.getSuburbDetail(suburb, filters);
    if (detail.minimum_sample_not_met) {
      return detail;
    }

    const onTimePaymentRate = detail.on_time_rate ?? 0;

    return buildMarketDataEnvelope(
      {
        suburb,
        on_time_payment_rate: onTimePaymentRate,
        income_to_rent_distribution: detail.income_to_rent_distribution,
        bedroom_breakdown: detail.bedroom_breakdown,
      },
      {
        transaction_count: detail.transaction_count,
        data_source: detail.data_source,
        on_time_rate: onTimePaymentRate,
      },
    );
  }

  /** Landlord portal — same intelligence source as B2B API. */
  async getPortalSummary() {
    const { records, data_source } = await this.fetchMergedRecords();
    const explorer = await this.getSuburbExplorer();
    const suburbs = explorer.suburbs ?? [];
    const totalSample = suburbs.reduce((s: number, row: any) => s + Number(row.transaction_count || 0), 0);
    const avgRent =
      suburbs.length > 0
        ? suburbs.reduce((s: number, row: any) => s + Number(row.median_rent || row.avg_verified_rent_2br || 0), 0) /
          suburbs.length
        : 0;
    const onTime =
      totalSample > 0
        ? suburbs.reduce(
            (s: number, row: any) =>
              s + Number(row.on_time_rate || 0) * Number(row.transaction_count || 0),
            0,
          ) / totalSample
        : 0;
    const latestCapture = records
      .map((r) => new Date(r.captured_at).getTime())
      .sort((a, b) => b - a)[0];

    return {
      city: suburbs[0]?.city ?? 'Windhoek',
      suburb_count: suburbs.length,
      average_rent: Math.round(avgRent),
      median_rent: Math.round(avgRent),
      min_rent: suburbs.length ? Math.min(...suburbs.map((s: any) => s.price_range?.min ?? s.median_rent)) : null,
      max_rent: suburbs.length ? Math.max(...suburbs.map((s: any) => s.price_range?.max ?? s.median_rent)) : null,
      on_time_rate: Math.round(onTime),
      avg_days_to_pay:
        suburbs.length > 0
          ? Math.round((suburbs.reduce((s: number, row: any) => s + Number(row.avg_days_to_pay || 0), 0) / suburbs.length) * 10) /
            10
          : 0,
      total_sample_count: totalSample,
      verified_record_count: records.length,
      latest_snapshot_date: latestCapture ? new Date(latestCapture).toISOString().slice(0, 10) : null,
      pipeline_updated_at: latestCapture ? new Date(latestCapture).toISOString() : null,
      minimum_sample_not_met: suburbs.length === 0,
      data_source: explorer.data_source,
      data_source_label: this.portalDataSourceLabel(explorer.data_source),
    };
  }

  async getPortalSuburbs() {
    const explorer = await this.getSuburbExplorer();
    const data_source = explorer.data_source;
    const suburbs = explorer.suburbs ?? [];
    return {
      data_source,
      data_source_label: this.portalDataSourceLabel(data_source),
      suburbs: (suburbs ?? []).map((row: any) => ({
        suburb: row.suburb,
        city: row.city,
        property_type: null,
        bedrooms: null,
        avg_rent: row.avg_verified_rent_2br ?? row.median_rent,
        min_rent: row.price_range?.min,
        max_rent: row.price_range?.max,
        median_rent: row.median_rent,
        on_time_rate: row.on_time_rate,
        avg_days_to_pay: row.avg_days_to_pay,
        sample_count: row.transaction_count,
        snapshot_date: row.last_record_at?.slice(0, 10) ?? null,
        trend: (row.trend || 'Stable').toString().toLowerCase(),
        confidence_level: row.confidence_level,
        commercially_licensable: row.commercially_licensable,
        minimum_sample_not_met: false,
      })),
    };
  }

  async getPortalSuburbDetail(suburb: string) {
    const detail = await this.getSuburbDetail(suburb);
    const data_source = detail.data_source;
    if (detail.minimum_sample_not_met) {
      return { ...detail, data_source_label: this.portalDataSourceLabel(data_source) };
    }

    const { records: allRecords } = await this.fetchMergedRecords();
    const rows = allRecords
      .filter((r) => r.suburb.toLowerCase() === suburb.toLowerCase())
      .flatMap((r) => Array(this.recordWeight(r)).fill(r) as MarketRecord[]);

    const monthlyMap = new Map<string, { rents: number[]; onTime: number; total: number }>();
    for (const r of rows) {
      const bucket = monthlyMap.get(r.month_year) ?? { rents: [], onTime: 0, total: 0 };
      bucket.rents.push(Number(r.verified_rent_amount));
      bucket.total += 1;
      if (r.payment_status === 'on_time') bucket.onTime += 1;
      monthlyMap.set(r.month_year, bucket);
    }
    const price_history = [...monthlyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, bucket]) => ({
        snapshot_date: `${month}-01`,
        avg_rent: Math.round(average(bucket.rents)),
        min_rent: Math.round(Math.min(...bucket.rents)),
        max_rent: Math.round(Math.max(...bucket.rents)),
        on_time_rate: bucket.total ? Math.round((bucket.onTime / bucket.total) * 100) : 0,
      }));

    const trendRaw = detail.on_time_trend?.length ? computeTrend(
      price_history.map((p) => ({ month: p.snapshot_date.slice(0, 7), avg: p.avg_rent })),
    ) : 'Stable';

    return {
      suburb: detail.suburb,
      city: rows[0]?.city ?? 'Windhoek',
      minimum_sample_not_met: false,
      data_source,
      data_source_label: this.portalDataSourceLabel(data_source),
      confidence_level: detail.confidence_level,
      licensing_notice: detail.licensing_notice,
      commercially_licensable: detail.commercially_licensable,
      recommended_use_cases: detail.recommended_use_cases,
      pricing_guidance: detail.pricing_guidance,
      trend: trendRaw.toString().toLowerCase(),
      latest_snapshot: {
        avg_rent: detail.price_range?.median,
        min_rent: detail.price_range?.min,
        max_rent: detail.price_range?.max,
        median_rent: detail.price_range?.median,
        on_time_rate: detail.on_time_rate ?? null,
        avg_days_to_pay: null,
        sample_count: detail.transaction_count,
        snapshot_date: rows[0]?.captured_at?.slice(0, 10) ?? null,
      },
      price_history,
      on_time_rate: detail.on_time_rate ?? null,
      intelligence: {
        rent_distribution: detail.rent_distribution,
        on_time_trend: detail.on_time_trend,
        bedroom_breakdown: detail.bedroom_breakdown,
        income_to_rent_distribution: detail.income_to_rent_distribution,
      },
    };
  }

  async getSnapshotByDate(suburb: string, snapshotDate: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('market_data_snapshots')
      .select('*')
      .eq('suburb', suburb)
      .eq('snapshot_date', snapshotDate)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new NotFoundException(`Market data snapshot not found for ${suburb} on ${snapshotDate}`);
    }
    return data;
  }

  async getLicensableSuburbsReport() {
    const { data_source } = await this.fetchMergedRecords();
    const { suburbs } = await this.getSuburbExplorer();
    const licensable = (suburbs ?? []).filter((s: any) => s.commercially_licensable);
    const directional = (suburbs ?? []).filter(
      (s: any) => !s.commercially_licensable && s.transaction_count >= MIN_SUBURB_SAMPLE,
    );
    const insufficient = (suburbs ?? []).filter((s: any) => s.transaction_count < MIN_SUBURB_SAMPLE);

    return {
      generated_at: new Date().toISOString(),
      data_source,
      thresholds: DATA_INTELLIGENCE_METHODOLOGY.sample_thresholds,
      summary: {
        total_suburbs_with_data: (suburbs ?? []).length,
        ready_to_license: licensable.length,
        directional_only: directional.length,
        below_minimum: insufficient.length,
      },
      ready_to_license: licensable.map((s: any) => ({
        suburb: s.suburb,
        city: s.city,
        transaction_count: s.transaction_count,
        median_rent: s.median_rent,
        on_time_rate: s.on_time_rate,
        confidence_level: s.confidence_level,
        freshness_status: s.freshness_status,
        licensing_notice: s.licensing_notice,
      })),
      directional_only: directional.map((s: any) => ({
        suburb: s.suburb,
        city: s.city,
        transaction_count: s.transaction_count,
        confidence_level: s.confidence_level,
      })),
    };
  }

  /**
   * Nightly roll-up: aggregate verified records into public.market_data_snapshots for fast reads.
   */
  async rollupSnapshotsFromVerifiedRecords() {
    const records = await this.fetchLiveRecords();
    if (!records.length) {
      return {
        rolled: 0,
        snapshot_date: null,
        data_source: 'market_data_records' as const,
        message: 'No verified records to roll up',
      };
    }

    const snapshotDate = new Date().toISOString().slice(0, 10);
    const groups = new Map<string, MarketRecord[]>();

    for (const r of records) {
      const bedrooms = r.bedrooms ?? 'any';
      const ptype = r.property_type ?? 'any';
      const key = `${r.suburb}::${r.city}::${ptype}::${bedrooms}`;
      const expanded = Array(this.recordWeight(r)).fill(r) as MarketRecord[];
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(...expanded);
    }

    const rows = [...groups.entries()].map(([, group]) => {
      const rents = group.map((r) => Number(r.verified_rent_amount));
      const onTime = group.filter((r) => r.payment_status === 'on_time').length;
      const first = group[0];
      return {
        suburb: first.suburb,
        city: first.city || 'Windhoek',
        property_type: first.property_type,
        bedrooms: first.bedrooms,
        avg_rent: Math.round(average(rents)),
        min_rent: Math.round(Math.min(...rents)),
        max_rent: Math.round(Math.max(...rents)),
        median_rent: Math.round(median(rents)),
        on_time_rate: Math.round((onTime / group.length) * 100),
        avg_days_to_pay: Math.round(average(group.map((r) => r.days_to_pay)) * 10) / 10,
        sample_count: group.length,
        snapshot_date: snapshotDate,
      };
    });

    const client = this.supabase.getClient();
    await client.from('market_data_snapshots').delete().eq('snapshot_date', snapshotDate);
    const { error } = await client.from('market_data_snapshots').insert(rows);
    if (error) throw error;

    const result = { rolled: rows.length, snapshot_date: snapshotDate, data_source: 'market_data_records' as const };
    await this.syncLicensableSuburbWebhooks();
    return result;
  }

  async getPortalLandlordRentCompare(
    landlordUserId: string,
    opts: { unitId?: string; suburb?: string; rentAmount?: number },
  ) {
    const client = this.supabase.getClient();
    let suburb = opts.suburb?.trim();
    let rent = opts.rentAmount != null ? Number(opts.rentAmount) : undefined;
    let unitLabel: string | null = null;
    let city = 'Windhoek';

    if (opts.unitId) {
      const { data: unit, error } = await client
        .from('units')
        .select('id, unit_identifier, monthly_rent, property_id, properties(address_suburb, address_city, landlord_id, property_name)')
        .eq('id', opts.unitId)
        .maybeSingle();
      if (error || !unit) throw new NotFoundException('Unit not found');
      const property = (unit as any).properties;
      const { data: landlord } = await client.from('landlord_profiles').select('id').eq('user_id', landlordUserId).maybeSingle();
      if (!landlord || property?.landlord_id !== landlord.id) {
        throw new BadRequestException('Unit does not belong to this landlord');
      }
      suburb = property?.address_suburb;
      city = property?.address_city ?? 'Windhoek';
      rent = Number(unit.monthly_rent ?? rent ?? 0);
      unitLabel = unit.unit_identifier || property?.property_name || 'Your unit';
    }

    if (!suburb) throw new BadRequestException('suburb or unit_id is required');
    if (rent == null || !Number.isFinite(rent) || rent <= 0) {
      throw new BadRequestException('A positive monthly rent is required (from unit or rent_amount)');
    }

    const detail = await this.getSuburbDetail(suburb);
    const median = detail.price_range?.median ?? null;
    const min = detail.price_range?.min ?? null;
    const max = detail.price_range?.max ?? null;
    const vsMedianNad = median != null ? Math.round(rent - median) : null;
    const vsMedianPct = median && median > 0 ? Math.round(((rent - median) / median) * 100) : null;

    let assessment = 'Benchmark unavailable — insufficient suburb sample.';
    if (!detail.minimum_sample_not_met && median != null && vsMedianPct != null) {
      if (Math.abs(vsMedianPct) <= 5) assessment = 'In line with suburb median (within ±5%).';
      else if (vsMedianPct < -5) assessment = `Below suburb median by ${Math.abs(vsMedianPct)}% — competitive vs market.`;
      else assessment = `Above suburb median by ${vsMedianPct}% — premium vs verified market.`;
      if (min != null && max != null) {
        if (rent < min) assessment += ' Rent is below the observed suburb range.';
        else if (rent > max) assessment += ' Rent is above the observed suburb range.';
      }
    }

    return {
      unit_label: unitLabel,
      suburb,
      city,
      your_monthly_rent: Math.round(rent),
      suburb_benchmark: {
        median_rent: median,
        min_rent: min,
        max_rent: max,
        transaction_count: detail.transaction_count,
        on_time_rate: (detail as { on_time_rate?: number }).on_time_rate ?? null,
        confidence_level: detail.confidence_level,
        data_source: detail.data_source,
      },
      comparison: {
        vs_median_nad: vsMedianNad,
        vs_median_pct: vsMedianPct,
        assessment,
      },
      minimum_sample_not_met: detail.minimum_sample_not_met,
      licensing_notice: detail.licensing_notice,
    };
  }

  async ingestSaleCompsPilot(
    partnerClientId: string | null,
    records: Array<{
      suburb: string;
      city?: string;
      sale_price: number;
      transfer_date: string;
      property_type?: string;
      bedrooms?: number;
      price_per_sqm?: number;
      source_type?: string;
    }>,
  ) {
    if (!records?.length) throw new BadRequestException('records array is required');
    const rows = records.map((r) => ({
      partner_client_id: partnerClientId,
      suburb: r.suburb,
      city: r.city || 'Windhoek',
      property_type: r.property_type ?? null,
      bedrooms: r.bedrooms ?? null,
      sale_price: Number(r.sale_price),
      price_per_sqm: r.price_per_sqm ?? null,
      transfer_date: r.transfer_date,
      month_year: monthYearFromDate(r.transfer_date),
      source_type: r.source_type ?? 'pilot_manual',
    }));
    const { data, error } = await this.mi().from('sale_comps_records').insert(rows).select('id');
    if (error) throw error;
    return { inserted: data?.length ?? 0 };
  }

  async getSaleCompsPilotSummary() {
    try {
      const { data, error } = await this.mi().from('sale_comps_records').select('suburb, city, sale_price');
      if (error) return { record_count: 0, suburb_count: 0, suburbs: [] as string[] };
      const suburbs = [...new Set((data ?? []).map((r: { suburb: string }) => r.suburb))];
      return { record_count: data?.length ?? 0, suburb_count: suburbs.length, suburbs };
    } catch {
      return { record_count: 0, suburb_count: 0, suburbs: [] };
    }
  }

  async getSaleCompsForSuburb(suburb: string) {
    try {
      const { data, error } = await this.mi()
        .from('sale_comps_records')
        .select('*')
        .ilike('suburb', suburb)
        .order('transfer_date', { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      if (!rows.length) {
        return buildMarketDataEnvelope(
          {
            suburb,
            pilot: true,
            status: 'no_sale_comps',
            message: 'Sale comps pilot has no records for this suburb yet.',
            transfers: [],
          },
          { transaction_count: 0, data_source: 'market_data_snapshots' },
        );
      }
      const prices = rows.map((r: { sale_price: number }) => Number(r.sale_price));
      const onTime = null;
      return buildMarketDataEnvelope(
        {
          suburb,
          pilot: true,
          status: 'pilot',
          transfer_count: rows.length,
          median_sale_price: Math.round(median(prices)),
          min_sale_price: Math.round(Math.min(...prices)),
          max_sale_price: Math.round(Math.max(...prices)),
          transfers: rows.slice(0, 24).map((r: any) => ({
            transfer_date: r.transfer_date,
            sale_price: Number(r.sale_price),
            source_type: r.source_type,
            bedrooms: r.bedrooms,
          })),
          disclaimer:
            'Pilot sale data from partner/manual ingest — separate licence from verified rental payments.',
        },
        { transaction_count: rows.length, data_source: 'market_data_records', on_time_rate: onTime ?? 0 },
      );
    } catch {
      throw new NotFoundException(`Sale comps unavailable for ${suburb}`);
    }
  }

  async generateMethodologyPdf(generatedBy?: string): Promise<Buffer> {
    const health = await this.getPlatformHealth();
    const licensable = await this.getLicensableSuburbsReport();
    const catalog = await this.getCommercialCatalog();

    const bufferChunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.on('data', (chunk: Buffer) => bufferChunks.push(chunk));
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(bufferChunks)));
      doc.on('error', reject);
    });

    doc.fontSize(20).font('Helvetica-Bold').text('CRENIT Data Intelligence — Methodology', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#444').text(`Generated: ${new Date().toLocaleString()}`, {
      align: 'center',
    });
    doc.moveDown();

    doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text('Executive summary');
    doc.font('Helvetica').fontSize(10).text(catalog.methodology.headline);
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('Live pipeline footnotes (auto-generated)');
    doc.font('Helvetica');
    doc.text(`Data source in production: ${health.data_source}`);
    doc.text(`Verified records (weighted): ${health.total_verified_records}`);
    doc.text(`Suburbs with ≥${MIN_STATISTICAL_SUBURB_SAMPLE} records (licensable): ${health.statistically_usable_suburbs}`);
    doc.text(`Suburbs ready to license now: ${licensable.summary.ready_to_license}`);
    doc.text(`Directional-only suburbs (5–9 records): ${licensable.summary.directional_only}`);
    doc.text(`Latest capture: ${health.latest_capture_at ?? '—'}`);
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Principles');
    catalog.methodology.principles.forEach((p) => doc.font('Helvetica').text(`• ${p}`));
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Sample thresholds');
    doc.font('Helvetica');
    doc.text(`Explorer minimum: ${catalog.methodology.sample_thresholds.explorer_minimum} verified payments`);
    doc.text(`Statistical / commercial minimum: ${catalog.methodology.sample_thresholds.statistical_minimum}`);
    doc.text(`High confidence: ${catalog.methodology.sample_thresholds.high_confidence}`);
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Licensing terms (summary)');
    catalog.licensing_terms.forEach((t) => doc.font('Helvetica').text(`• ${t}`));
    doc.moveDown();

    if (licensable.ready_to_license.length) {
      doc.font('Helvetica-Bold').text('Suburbs ready to license (snapshot at generation time)');
      licensable.ready_to_license.slice(0, 25).forEach((s) => {
        doc
          .font('Helvetica')
          .fontSize(9)
          .text(
            `${s.suburb} (${s.city}) — n=${s.transaction_count}, median N$${s.median_rent}, on-time ${s.on_time_rate}% — ${s.confidence_level}`,
          );
      });
      if (licensable.ready_to_license.length > 25) {
        doc.text(`… and ${licensable.ready_to_license.length - 25} more suburbs.`);
      }
    }

    doc.moveDown();
    doc.fontSize(8).fillColor('#666').text(
      'This document is auto-generated from the CRENIT intelligence catalog and live database counts. ' +
        'It does not constitute legal advice. Sale comps remain on the partner roadmap and are not included in rental figures above.',
    );
    doc.end();

    await this.mi().from('report_generations').insert([
      {
        report_type: 'methodology',
        suburb: null,
        generated_by: generatedBy ?? null,
      },
    ]);

    return pdfPromise;
  }
}
