/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Comparable schema for M&A valuation.
 * Represents market comparable companies with provenance and freshness tracking.
 */

import { z } from 'zod';
import type { FreshnessStatus } from '@/common/ma/sourceCache/schema';
import { FreshnessStatusSchema } from '@/common/ma/sourceCache/schema';

// ============================================================================
// Comparable Types
// ============================================================================

export const ComparableMetricSchema = z.enum([
  'ev_ebitda',
  'ev_revenue',
  'p_e',
  'ev_ebit',
  'price_book',
  'dividend_yield',
]);

export type ComparableMetric = z.infer<typeof ComparableMetricSchema>;

export const ComparableCompanySchema = z.object({
  id: z.string(),
  /** Name of the comparable company */
  name: z.string().min(1),
  /** Stock ticker symbol */
  ticker: z.string().optional(),
  /** Exchange where the company trades */
  exchange: z.string().optional(),
  /** Sector classification */
  sector: z.string().min(1),
  /** Industry classification */
  industry: z.string().optional(),
  /** Country of incorporation */
  country: z.string().optional(),
  /** Market capitalization in local currency */
  marketCap: z.number().positive().optional(),
  /** Enterprise value in local currency */
  enterpriseValue: z.number().positive().optional(),
  /** Revenue in local currency */
  revenue: z.number().positive().optional(),
  /** EBITDA in local currency */
  ebitda: z.number().optional(),
  /** EBIT in local currency */
  ebit: z.number().optional(),
  /** Net income in local currency */
  netIncome: z.number().optional(),
  /** Total debt in local currency */
  totalDebt: z.number().optional(),
  /** Cash and equivalents in local currency */
  cash: z.number().optional(),
  /** Valuation multiples computed from financials */
  multiples: z.record(z.number().positive()).optional(),
  /** Source of this comparable data */
  source: z.string().min(1),
  /** ISO currency code */
  currency: z.string().default('EUR'),
  /** Full provenance metadata (JSON string) */
  provenanceJson: z.string().optional(),
  /** Freshness status */
  freshness: FreshnessStatusSchema.optional(),
  /** When this data was fetched */
  fetchedAt: z.number().int().positive().optional(),
  /** When this record was created */
  createdAt: z.number().int().positive(),
  /** When this record was last updated */
  updatedAt: z.number().int().positive(),
});

export type ComparableCompany = z.infer<typeof ComparableCompanySchema>;

export const CreateComparableInputSchema = z.object({
  name: z.string().min(1),
  ticker: z.string().optional(),
  exchange: z.string().optional(),
  sector: z.string().min(1),
  industry: z.string().optional(),
  country: z.string().optional(),
  marketCap: z.number().positive().optional(),
  enterpriseValue: z.number().positive().optional(),
  revenue: z.number().positive().optional(),
  ebitda: z.number().optional(),
  ebit: z.number().optional(),
  netIncome: z.number().optional(),
  totalDebt: z.number().optional(),
  cash: z.number().optional(),
  multiples: z.record(z.number().positive()).optional(),
  source: z.string().min(1),
  currency: z.string().default('EUR'),
  provenanceJson: z.string().optional(),
  freshness: FreshnessStatusSchema.optional(),
  fetchedAt: z.number().int().positive().optional(),
});

export type CreateComparableInput = z.infer<typeof CreateComparableInputSchema>;

export const UpdateComparableInputSchema = z.object({
  name: z.string().min(1).optional(),
  ticker: z.string().optional(),
  exchange: z.string().optional(),
  sector: z.string().min(1).optional(),
  industry: z.string().optional(),
  country: z.string().optional(),
  marketCap: z.number().positive().optional(),
  enterpriseValue: z.number().positive().optional(),
  revenue: z.number().positive().optional(),
  ebitda: z.number().optional(),
  ebit: z.number().optional(),
  netIncome: z.number().optional(),
  totalDebt: z.number().optional(),
  cash: z.number().optional(),
  multiples: z.record(z.number().positive()).optional(),
  source: z.string().min(1).optional(),
  currency: z.string().optional(),
  provenanceJson: z.string().optional(),
  freshness: FreshnessStatusSchema.optional(),
  fetchedAt: z.number().int().positive().optional(),
});

export type UpdateComparableInput = z.infer<typeof UpdateComparableInputSchema>;

// ============================================================================
// Comparable Set (Collection for Valuation)
// ============================================================================

export const ComparableSetSchema = z.object({
  id: z.string(),
  /** Name of this comparable set */
  name: z.string().min(1),
  /** Description of the set */
  description: z.string().optional(),
  /** Sector this set belongs to */
  sector: z.string().min(1),
  /** Deal ID if tied to a specific deal */
  dealId: z.string().optional(),
  /** Company ID if tied to a specific company */
  companyId: z.string().optional(),
  /** IDs of comparable companies in this set */
  comparableIds: z.array(z.string()),
  /** Selected metrics for comparison */
  selectedMetrics: z.array(ComparableMetricSchema).default(['ev_ebitda', 'ev_revenue']),
  /** Aggregate statistics computed from comparables */
  aggregateStats: z
    .record(
      z.object({
        low: z.number(),
        median: z.number(),
        high: z.number(),
        mean: z.number(),
        count: z.number().int(),
      })
    )
    .optional(),
  /** Full provenance metadata */
  provenanceJson: z.string().optional(),
  /** Freshness status */
  freshness: FreshnessStatusSchema.optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export type ComparableSet = z.infer<typeof ComparableSetSchema>;

export const CreateComparableSetInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sector: z.string().min(1),
  dealId: z.string().optional(),
  companyId: z.string().optional(),
  comparableIds: z.array(z.string()).default([]),
  selectedMetrics: z.array(ComparableMetricSchema).optional(),
  provenanceJson: z.string().optional(),
  freshness: FreshnessStatusSchema.optional(),
});

export type CreateComparableSetInput = z.infer<typeof CreateComparableSetInputSchema>;

export const UpdateComparableSetInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  sector: z.string().min(1).optional(),
  dealId: z.string().optional(),
  companyId: z.string().optional(),
  comparableIds: z.array(z.string()).optional(),
  selectedMetrics: z.array(ComparableMetricSchema).optional(),
  aggregateStats: z
    .record(
      z.object({
        low: z.number(),
        median: z.number(),
        high: z.number(),
        mean: z.number(),
        count: z.number().int(),
      })
    )
    .optional(),
  provenanceJson: z.string().optional(),
  freshness: FreshnessStatusSchema.optional(),
});

export type UpdateComparableSetInput = z.infer<typeof UpdateComparableSetInputSchema>;

// ============================================================================
// Database Row Types
// ============================================================================

export interface IMaComparableCompanyRow {
  id: string;
  name: string;
  ticker: string | null;
  exchange: string | null;
  sector: string;
  industry: string | null;
  country: string | null;
  market_cap: number | null;
  enterprise_value: number | null;
  revenue: number | null;
  ebitda: number | null;
  ebit: number | null;
  net_income: number | null;
  total_debt: number | null;
  cash: number | null;
  multiples_json: string | null;
  source: string;
  currency: string;
  provenance_json: string | null;
  freshness: string | null;
  fetched_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface IMaComparableSetRow {
  id: string;
  name: string;
  description: string | null;
  sector: string;
  deal_id: string | null;
  company_id: string | null;
  comparable_ids_json: string;
  selected_metrics_json: string;
  aggregate_stats_json: string | null;
  provenance_json: string | null;
  freshness: string | null;
  created_at: number;
  updated_at: number;
}

// ============================================================================
// Row Mappers
// ============================================================================

export function comparableCompanyToRow(company: ComparableCompany): IMaComparableCompanyRow {
  return {
    id: company.id,
    name: company.name,
    ticker: company.ticker ?? null,
    exchange: company.exchange ?? null,
    sector: company.sector,
    industry: company.industry ?? null,
    country: company.country ?? null,
    market_cap: company.marketCap ?? null,
    enterprise_value: company.enterpriseValue ?? null,
    revenue: company.revenue ?? null,
    ebitda: company.ebitda ?? null,
    ebit: company.ebit ?? null,
    net_income: company.netIncome ?? null,
    total_debt: company.totalDebt ?? null,
    cash: company.cash ?? null,
    multiples_json: company.multiples ? JSON.stringify(company.multiples) : null,
    source: company.source,
    currency: company.currency,
    provenance_json: company.provenanceJson ?? null,
    freshness: company.freshness ?? null,
    fetched_at: company.fetchedAt ?? null,
    created_at: company.createdAt,
    updated_at: company.updatedAt,
  };
}

export function rowToComparableCompany(row: IMaComparableCompanyRow): ComparableCompany {
  return {
    id: row.id,
    name: row.name,
    ticker: row.ticker ?? undefined,
    exchange: row.exchange ?? undefined,
    sector: row.sector,
    industry: row.industry ?? undefined,
    country: row.country ?? undefined,
    marketCap: row.market_cap ?? undefined,
    enterpriseValue: row.enterprise_value ?? undefined,
    revenue: row.revenue ?? undefined,
    ebitda: row.ebitda ?? undefined,
    ebit: row.ebit ?? undefined,
    netIncome: row.net_income ?? undefined,
    totalDebt: row.total_debt ?? undefined,
    cash: row.cash ?? undefined,
    multiples: row.multiples_json ? (JSON.parse(row.multiples_json) as Record<string, number>) : undefined,
    source: row.source,
    currency: row.currency,
    provenanceJson: row.provenance_json ?? undefined,
    freshness: (row.freshness as FreshnessStatus) ?? undefined,
    fetchedAt: row.fetched_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function comparableSetToRow(set: ComparableSet): IMaComparableSetRow {
  return {
    id: set.id,
    name: set.name,
    description: set.description ?? null,
    sector: set.sector,
    deal_id: set.dealId ?? null,
    company_id: set.companyId ?? null,
    comparable_ids_json: JSON.stringify(set.comparableIds),
    selected_metrics_json: JSON.stringify(set.selectedMetrics),
    aggregate_stats_json: set.aggregateStats ? JSON.stringify(set.aggregateStats) : null,
    provenance_json: set.provenanceJson ?? null,
    freshness: set.freshness ?? null,
    created_at: set.createdAt,
    updated_at: set.updatedAt,
  };
}

export function rowToComparableSet(row: IMaComparableSetRow): ComparableSet {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    sector: row.sector,
    dealId: row.deal_id ?? undefined,
    companyId: row.company_id ?? undefined,
    comparableIds: JSON.parse(row.comparable_ids_json) as string[],
    selectedMetrics: JSON.parse(row.selected_metrics_json) as ComparableMetric[],
    aggregateStats: row.aggregate_stats_json
      ? (JSON.parse(row.aggregate_stats_json) as Record<
          string,
          {
            low: number;
            median: number;
            high: number;
            mean: number;
            count: number;
          }
        >)
      : undefined,
    provenanceJson: row.provenance_json ?? undefined,
    freshness: (row.freshness as FreshnessStatus) ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
