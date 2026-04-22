/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for Comparable schema
 * Tests schema validation, type safety, and row mapping
 */

import { describe, it, expect } from 'vitest';
import {
  ComparableCompanySchema,
  CreateComparableInputSchema,
  UpdateComparableInputSchema,
  ComparableSetSchema,
  CreateComparableSetInputSchema,
  comparableCompanyToRow,
  rowToComparableCompany,
  comparableSetToRow,
  rowToComparableSet,
} from '@/common/ma/comparable/schema';
import type {
  ComparableCompany,
  CreateComparableInput,
  UpdateComparableInput,
  ComparableSet,
  CreateComparableSetInput,
  IMaComparableCompanyRow,
  IMaComparableSetRow,
} from '@/common/ma/comparable/schema';

describe('Comparable Schema', () => {
  const now = Date.now();

  describe('ComparableCompanySchema', () => {
    it('should validate a valid comparable company', () => {
      const validCompany = {
        id: 'comp_123',
        name: 'Test Company',
        ticker: 'TEST',
        sector: 'Technology',
        source: 'bloomberg',
        currency: 'USD',
        createdAt: now,
        updatedAt: now,
      };

      const result = ComparableCompanySchema.safeParse(validCompany);
      expect(result.success).toBe(true);
    });

    it('should reject a company without required fields', () => {
      const invalidCompany = {
        id: 'comp_123',
        // missing name
        sector: 'Technology',
        source: 'bloomberg',
        createdAt: now,
        updatedAt: now,
      };

      const result = ComparableCompanySchema.safeParse(invalidCompany);
      expect(result.success).toBe(false);
    });

    it('should accept optional financial fields', () => {
      const companyWithFinancials = {
        id: 'comp_123',
        name: 'Test Company',
        sector: 'Technology',
        marketCap: 1000000000,
        revenue: 500000000,
        ebitda: 100000000,
        multiples: {
          ev_ebitda: 10.5,
          ev_revenue: 2.0,
        },
        source: 'bloomberg',
        currency: 'USD',
        freshness: 'fresh',
        fetchedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      const result = ComparableCompanySchema.safeParse(companyWithFinancials);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.marketCap).toBe(1000000000);
        expect(result.data.multiples?.ev_ebitda).toBe(10.5);
        expect(result.data.freshness).toBe('fresh');
      }
    });

    it('should default currency to EUR', () => {
      const companyWithoutCurrency = {
        id: 'comp_123',
        name: 'Test Company',
        sector: 'Technology',
        source: 'bloomberg',
        createdAt: now,
        updatedAt: now,
      };

      const result = ComparableCompanySchema.safeParse(companyWithoutCurrency);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('EUR');
      }
    });
  });

  describe('CreateComparableInputSchema', () => {
    it('should validate create input with required fields', () => {
      const validInput: CreateComparableInput = {
        name: 'New Company',
        sector: 'Technology',
        source: 'manual',
      };

      const result = CreateComparableInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept full create input with all fields', () => {
      const fullInput: CreateComparableInput = {
        name: 'Full Company',
        ticker: 'FULL',
        exchange: 'NASDAQ',
        sector: 'Technology',
        industry: 'Software',
        country: 'US',
        marketCap: 5000000000,
        revenue: 1000000000,
        ebitda: 200000000,
        netIncome: 150000000,
        multiples: { ev_ebitda: 12.5 },
        source: 'bloomberg',
        currency: 'USD',
        freshness: 'fresh',
        fetchedAt: now,
      };

      const result = CreateComparableInputSchema.safeParse(fullInput);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidInput = {
        name: '',
        sector: 'Technology',
        source: 'manual',
      };

      const result = CreateComparableInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject empty sector', () => {
      const invalidInput = {
        name: 'Test',
        sector: '',
        source: 'manual',
      };

      const result = CreateComparableInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('ComparableCompany row mapping', () => {
    const mockCompany: ComparableCompany = {
      id: 'comp_123',
      name: 'Test Company',
      ticker: 'TEST',
      exchange: 'NASDAQ',
      sector: 'Technology',
      industry: 'Software',
      country: 'US',
      marketCap: 1000000000,
      enterpriseValue: 1200000000,
      revenue: 500000000,
      ebitda: 100000000,
      ebit: 80000000,
      netIncome: 60000000,
      totalDebt: 200000000,
      cash: 100000000,
      multiples: { ev_ebitda: 12, ev_revenue: 2.4 },
      source: 'bloomberg',
      currency: 'USD',
      provenanceJson: JSON.stringify({ source: 'bloomberg', fetchedAt: now, policy: 'canonical' }),
      freshness: 'fresh',
      fetchedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    it('should convert company to row format', () => {
      const row = comparableCompanyToRow(mockCompany);

      expect(row.id).toBe('comp_123');
      expect(row.name).toBe('Test Company');
      expect(row.ticker).toBe('TEST');
      expect(row.exchange).toBe('NASDAQ');
      expect(row.sector).toBe('Technology');
      expect(row.market_cap).toBe(1000000000);
      expect(row.multiples_json).toBe(JSON.stringify({ ev_ebitda: 12, ev_revenue: 2.4 }));
      expect(row.provenance_json).toBeTruthy();
      expect(row.freshness).toBe('fresh');
    });

    it('should handle null values in row conversion', () => {
      const minimalCompany: ComparableCompany = {
        id: 'comp_456',
        name: 'Minimal Co',
        sector: 'Other',
        source: 'manual',
        currency: 'EUR',
        createdAt: now,
        updatedAt: now,
      };

      const row = comparableCompanyToRow(minimalCompany);
      expect(row.ticker).toBeNull();
      expect(row.market_cap).toBeNull();
      expect(row.multiples_json).toBeNull();
    });

    it('should convert row back to company format', () => {
      const row: IMaComparableCompanyRow = {
        id: 'comp_789',
        name: 'Row Company',
        ticker: 'ROW',
        exchange: 'NYSE',
        sector: 'Finance',
        industry: 'Banking',
        country: 'US',
        market_cap: 5000000000,
        enterprise_value: 5500000000,
        revenue: 1000000000,
        ebitda: 300000000,
        ebit: 250000000,
        net_income: 200000000,
        total_debt: 1000000000,
        cash: 500000000,
        multiples_json: JSON.stringify({ ev_ebitda: 18.33 }),
        source: 'refinitiv',
        currency: 'USD',
        provenance_json: JSON.stringify({ source: 'refinitiv', fetchedAt: now }),
        freshness: 'stale',
        fetched_at: now,
        created_at: now,
        updated_at: now,
      };

      const company = rowToComparableCompany(row);

      expect(company.id).toBe('comp_789');
      expect(company.name).toBe('Row Company');
      expect(company.multiples?.ev_ebitda).toBe(18.33);
      expect(company.freshness).toBe('stale');
      expect(company.fetchedAt).toBe(now);
    });

    it('should round-trip conversion without data loss', () => {
      const row = comparableCompanyToRow(mockCompany);
      const recovered = rowToComparableCompany(row);

      expect(recovered.id).toBe(mockCompany.id);
      expect(recovered.name).toBe(mockCompany.name);
      expect(recovered.marketCap).toBe(mockCompany.marketCap);
      expect(recovered.freshness).toBe(mockCompany.freshness);
      expect(recovered.provenanceJson).toBe(mockCompany.provenanceJson);
    });
  });

  describe('ComparableSet row mapping', () => {
    const mockSet: ComparableSet = {
      id: 'set_123',
      name: 'Tech Comparables',
      description: 'Technology sector comparables',
      sector: 'Technology',
      dealId: 'deal_456',
      comparableIds: ['comp_1', 'comp_2', 'comp_3'],
      selectedMetrics: ['ev_ebitda', 'ev_revenue'],
      aggregateStats: {
        ev_ebitda: { low: 8.5, median: 12.0, high: 18.5, mean: 13.0, count: 5 },
      },
      freshness: 'fresh',
      createdAt: now,
      updatedAt: now,
    };

    it('should convert set to row format', () => {
      const row = comparableSetToRow(mockSet);

      expect(row.id).toBe('set_123');
      expect(row.name).toBe('Tech Comparables');
      expect(row.comparable_ids_json).toBe(JSON.stringify(['comp_1', 'comp_2', 'comp_3']));
      expect(row.selected_metrics_json).toBe(JSON.stringify(['ev_ebitda', 'ev_revenue']));
      expect(row.aggregate_stats_json).toContain('median');
    });

    it('should convert row back to set format', () => {
      const row: IMaComparableSetRow = {
        id: 'set_456',
        name: 'Finance Set',
        description: 'Financial sector',
        sector: 'Finance',
        deal_id: 'deal_789',
        company_id: null,
        comparable_ids_json: JSON.stringify(['comp_a', 'comp_b']),
        selected_metrics_json: JSON.stringify(['p_e', 'price_book']),
        aggregate_stats_json: JSON.stringify({
          p_e: { low: 10, median: 15, high: 25, mean: 16, count: 3 },
        }),
        provenance_json: null,
        freshness: 'stale',
        created_at: now,
        updated_at: now,
      };

      const set = rowToComparableSet(row);

      expect(set.id).toBe('set_456');
      expect(set.comparableIds).toEqual(['comp_a', 'comp_b']);
      expect(set.selectedMetrics).toEqual(['p_e', 'price_book']);
      expect(set.aggregateStats?.p_e?.median).toBe(15);
    });

    it('should round-trip set conversion', () => {
      const row = comparableSetToRow(mockSet);
      const recovered = rowToComparableSet(row);

      expect(recovered.id).toBe(mockSet.id);
      expect(recovered.comparableIds).toEqual(mockSet.comparableIds);
      expect(recovered.aggregateStats).toEqual(mockSet.aggregateStats);
    });
  });
});
