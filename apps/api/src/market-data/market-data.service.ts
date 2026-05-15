import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class MarketDataService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getSuburbs() {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('market_data_snapshots')
      .select(
        'suburb,city,property_type,bedrooms,avg_rent,min_rent,max_rent,median_rent,on_time_rate,avg_days_to_pay,sample_count,snapshot_date'
      )
      .order('snapshot_date', { ascending: false });

    if (error) {
      throw error;
    }

    const latestBySuburb = new Map<string, any>();
    data?.forEach((entry) => {
      const key = `${entry.suburb}::${entry.city}`;
      if (!latestBySuburb.has(key)) {
        latestBySuburb.set(key, entry);
      }
    });

    return Array.from(latestBySuburb.values()).map((entry) => ({
      suburb: entry.suburb,
      city: entry.city,
      property_type: entry.property_type,
      bedrooms: entry.bedrooms,
      avg_rent: entry.avg_rent,
      min_rent: entry.min_rent,
      max_rent: entry.max_rent,
      median_rent: entry.median_rent,
      on_time_rate: entry.on_time_rate,
      avg_days_to_pay: entry.avg_days_to_pay,
      sample_count: entry.sample_count,
      snapshot_date: entry.snapshot_date,
    }));
  }

  async getSuburbDetails(suburb: string) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('market_data_snapshots')
      .select('*')
      .eq('suburb', suburb)
      .order('snapshot_date', { ascending: true });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      throw new NotFoundException(`Suburb data not found for ${suburb}`);
    }

    const latest = data[data.length - 1];
    const previous = data.length > 1 ? data[data.length - 2] : null;
    const trend = previous
      ? latest.avg_rent > previous.avg_rent
        ? 'rising'
        : latest.avg_rent < previous.avg_rent
        ? 'falling'
        : 'stable'
      : 'stable';

    return {
      suburb: latest.suburb,
      city: latest.city,
      property_type: latest.property_type,
      bedrooms: latest.bedrooms,
      latest_snapshot: {
        avg_rent: latest.avg_rent,
        min_rent: latest.min_rent,
        max_rent: latest.max_rent,
        median_rent: latest.median_rent,
        on_time_rate: latest.on_time_rate,
        avg_days_to_pay: latest.avg_days_to_pay,
        sample_count: latest.sample_count,
        snapshot_date: latest.snapshot_date,
      },
      trend,
      price_history: data.map((snapshot) => ({
        snapshot_date: snapshot.snapshot_date,
        avg_rent: snapshot.avg_rent,
        min_rent: snapshot.min_rent,
        max_rent: snapshot.max_rent,
        on_time_rate: snapshot.on_time_rate,
      })),
    };
  }

  async getSummary() {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('market_data_snapshots')
      .select('suburb,city,avg_rent,min_rent,max_rent,median_rent,on_time_rate,avg_days_to_pay,sample_count,snapshot_date')
      .order('snapshot_date', { ascending: false });

    if (error) {
      throw error;
    }

    const latestPerSuburb = new Map<string, any>();
    data?.forEach((entry) => {
      const key = `${entry.suburb}::${entry.city}`;
      if (!latestPerSuburb.has(key)) {
        latestPerSuburb.set(key, entry);
      }
    });

    const latestSnapshots = Array.from(latestPerSuburb.values());
    const summary = latestSnapshots.reduce(
      (acc, entry) => {
        acc.suburb_count += 1;
        acc.average_rent += Number(entry.avg_rent || 0);
        acc.min_rent = acc.min_rent === null ? entry.min_rent : Math.min(acc.min_rent, Number(entry.min_rent || 0));
        acc.max_rent = acc.max_rent === null ? entry.max_rent : Math.max(acc.max_rent, Number(entry.max_rent || 0));
        acc.median_rent += Number(entry.median_rent || 0);
        acc.on_time_rate += Number(entry.on_time_rate || 0);
        acc.avg_days_to_pay += Number(entry.avg_days_to_pay || 0);
        acc.total_sample_count += Number(entry.sample_count || 0);
        return acc;
      },
      {
        city: latestSnapshots.length > 0 ? latestSnapshots[0].city : null,
        suburb_count: 0,
        average_rent: 0,
        min_rent: null as number | null,
        max_rent: null as number | null,
        median_rent: 0,
        on_time_rate: 0,
        avg_days_to_pay: 0,
        total_sample_count: 0,
      }
    );

    return {
      city: summary.city,
      suburb_count: summary.suburb_count,
      average_rent: summary.suburb_count ? summary.average_rent / summary.suburb_count : 0,
      min_rent: summary.min_rent,
      max_rent: summary.max_rent,
      median_rent: summary.suburb_count ? summary.median_rent / summary.suburb_count : 0,
      on_time_rate: summary.suburb_count ? summary.on_time_rate / summary.suburb_count : 0,
      avg_days_to_pay: summary.suburb_count ? summary.avg_days_to_pay / summary.suburb_count : 0,
      total_sample_count: summary.total_sample_count,
      latest_snapshot_date: latestSnapshots.length > 0 ? latestSnapshots[0].snapshot_date : null,
    };
  }

  async getSnapshot(suburb: string, snapshotDate: string) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('market_data_snapshots')
      .select('*')
      .eq('suburb', suburb)
      .eq('snapshot_date', snapshotDate)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new NotFoundException(`Market data snapshot not found for ${suburb} on ${snapshotDate}`);
    }

    return data;
  }
}
