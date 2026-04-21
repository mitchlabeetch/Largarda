/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Company schema for M&A data spine
 * Defines company profiles with enrichment data from external sources
 */

import { z } from 'zod';

// ============================================================================
// Company Types
// ============================================================================

export type CompanyStatus = 'active' | 'inactive' | 'dissolved';

// Zod Schemas
export const CompanySchema = z.object({
  id: z.string(),
  siren: z.string().regex(/^\d{9}$/),
  siret: z
    .string()
    .regex(/^\d{14}$/)
    .optional(),
  name: z.string().min(1),
  legalForm: z.string().optional(),
  nafCode: z.string().optional(),
  sectorId: z.string().optional(),
  jurisdiction: z.string().optional(),
  headquartersAddress: z.string().optional(),
  registeredAt: z.number().int().positive().optional(),
  employeeCount: z.number().int().nonnegative().optional(),
  revenue: z.number().nonnegative().optional(),
  sourcesJson: z.string().optional(),
  lastEnrichedAt: z.number().int().positive().optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const CreateCompanyInputSchema = z.object({
  siren: z.string().regex(/^\d{9}$/),
  siret: z
    .string()
    .regex(/^\d{14}$/)
    .optional(),
  name: z.string().min(1),
  legalForm: z.string().optional(),
  nafCode: z.string().optional(),
  sectorId: z.string().optional(),
  jurisdiction: z.string().optional(),
  headquartersAddress: z.string().optional(),
  registeredAt: z.number().int().positive().optional(),
  employeeCount: z.number().int().nonnegative().optional(),
  revenue: z.number().nonnegative().optional(),
  sourcesJson: z.string().optional(),
});

export const UpdateCompanyInputSchema = z.object({
  siret: z
    .string()
    .regex(/^\d{14}$/)
    .optional(),
  name: z.string().min(1).optional(),
  legalForm: z.string().optional(),
  nafCode: z.string().optional(),
  sectorId: z.string().optional(),
  jurisdiction: z.string().optional(),
  headquartersAddress: z.string().optional(),
  registeredAt: z.number().int().positive().optional(),
  employeeCount: z.number().int().nonnegative().optional(),
  revenue: z.number().nonnegative().optional(),
  sourcesJson: z.string().optional(),
  lastEnrichedAt: z.number().int().positive().optional(),
});

// ============================================================================
// Company Interfaces
// ============================================================================

export interface Company {
  id: string;
  siren: string;
  siret?: string;
  name: string;
  legalForm?: string;
  nafCode?: string;
  sectorId?: string;
  jurisdiction?: string;
  headquartersAddress?: string;
  registeredAt?: number;
  employeeCount?: number;
  revenue?: number;
  sourcesJson?: string;
  lastEnrichedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateCompanyInput {
  siren: string;
  siret?: string;
  name: string;
  legalForm?: string;
  nafCode?: string;
  sectorId?: string;
  jurisdiction?: string;
  headquartersAddress?: string;
  registeredAt?: number;
  employeeCount?: number;
  revenue?: number;
  sourcesJson?: string;
}

export interface UpdateCompanyInput {
  siret?: string;
  name?: string;
  legalForm?: string;
  nafCode?: string;
  sectorId?: string;
  jurisdiction?: string;
  headquartersAddress?: string;
  registeredAt?: number;
  employeeCount?: number;
  revenue?: number;
  sourcesJson?: string;
  lastEnrichedAt?: number;
}

// ============================================================================
// Database Row Types
// ============================================================================

export interface IMaCompanyRow {
  id: string;
  siren: string;
  siret: string | null;
  name: string;
  legal_form: string | null;
  naf_code: string | null;
  sector_id: string | null;
  jurisdiction: string | null;
  headquarters_address: string | null;
  registered_at: number | null;
  employee_count: number | null;
  revenue: number | null;
  sources_json: string | null;
  last_enriched_at: number | null;
  created_at: number;
  updated_at: number;
}

// ============================================================================
// Row Mappers
// ============================================================================

export function companyToRow(company: Company): IMaCompanyRow {
  return {
    id: company.id,
    siren: company.siren,
    siret: company.siret ?? null,
    name: company.name,
    legal_form: company.legalForm ?? null,
    naf_code: company.nafCode ?? null,
    sector_id: company.sectorId ?? null,
    jurisdiction: company.jurisdiction ?? null,
    headquarters_address: company.headquartersAddress ?? null,
    registered_at: company.registeredAt ?? null,
    employee_count: company.employeeCount ?? null,
    revenue: company.revenue ?? null,
    sources_json: company.sourcesJson ?? null,
    last_enriched_at: company.lastEnrichedAt ?? null,
    created_at: company.createdAt,
    updated_at: company.updatedAt,
  };
}

export function rowToCompany(row: IMaCompanyRow): Company {
  return {
    id: row.id,
    siren: row.siren,
    siret: row.siret ?? undefined,
    name: row.name,
    legalForm: row.legal_form ?? undefined,
    nafCode: row.naf_code ?? undefined,
    sectorId: row.sector_id ?? undefined,
    jurisdiction: row.jurisdiction ?? undefined,
    headquartersAddress: row.headquarters_address ?? undefined,
    registeredAt: row.registered_at ?? undefined,
    employeeCount: row.employee_count ?? undefined,
    revenue: row.revenue ?? undefined,
    sourcesJson: row.sources_json ?? undefined,
    lastEnrichedAt: row.last_enriched_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
