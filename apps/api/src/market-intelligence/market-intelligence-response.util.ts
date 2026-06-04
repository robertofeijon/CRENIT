import {
  confidenceFromSampleCount,
  licensingNotice,
  recommendedUseCases,
} from './data-product-catalog';
import { MIN_STATISTICAL_SUBURB_SAMPLE, MIN_SUBURB_SAMPLE } from './market-intelligence.utils';

export type MarketDataSource = 'market_data_records' | 'market_data_snapshots' | 'mixed';

export type MarketDataComplianceFields = {
  transaction_count: number;
  /** @deprecated Use transaction_count — kept for lender-risk clients */
  sample_count: number;
  confidence_level: 'insufficient' | 'low' | 'moderate' | 'high';
  licensing_notice: string;
  commercially_licensable: boolean;
  data_source: MarketDataSource;
  minimum_sample_not_met: boolean;
  required_minimum_sample?: number;
};

export type SuburbDetailPayload = {
  suburb: string;
  minimum_sample_not_met?: boolean;
  on_time_rate?: number;
  data_domain?: string;
  price_range?: { min: number; max: number; median: number };
  pricing_guidance?: string;
  rent_distribution?: Array<{ range: string; count: number; min: number; max: number }>;
  on_time_trend?: Array<{ month: string; on_time_rate: number }>;
  bedroom_breakdown?: Array<{
    bedrooms: number;
    label: string;
    avg_rent: number | null;
    sample_count: number;
  }>;
  income_to_rent_distribution?: Array<{ bracket: string; count: number }>;
  recommended_use_cases?: string[];
};

export function buildMarketDataEnvelope<T extends Record<string, unknown>>(
  payload: T,
  options: {
    transaction_count: number;
    data_source: MarketDataSource;
    on_time_rate?: number;
    minimum_sample_not_met?: boolean;
    required_minimum_sample?: number;
  },
): T & MarketDataComplianceFields {
  const transaction_count = Math.max(0, options.transaction_count);
  const confidence_level = confidenceFromSampleCount(transaction_count);
  const on_time_rate = options.on_time_rate ?? 0;

  return {
    ...payload,
    transaction_count,
    sample_count: transaction_count,
    confidence_level,
    licensing_notice: licensingNotice(confidence_level),
    commercially_licensable: transaction_count >= MIN_STATISTICAL_SUBURB_SAMPLE,
    data_source: options.data_source,
    minimum_sample_not_met: options.minimum_sample_not_met ?? transaction_count < MIN_SUBURB_SAMPLE,
    ...(options.minimum_sample_not_met || transaction_count < MIN_SUBURB_SAMPLE
      ? { required_minimum_sample: options.required_minimum_sample ?? MIN_SUBURB_SAMPLE }
      : {}),
    ...(transaction_count >= MIN_SUBURB_SAMPLE && !options.minimum_sample_not_met
      ? { recommended_use_cases: recommendedUseCases(transaction_count, on_time_rate) }
      : {}),
  };
}
