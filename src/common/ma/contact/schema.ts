/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Contact schema for M&A data spine
 * Defines contacts linked to companies and deals
 */

import { z } from 'zod';
import type { FreshnessStatus } from '@/common/ma/sourceCache/schema';

// ============================================================================
// Contact Types
// ============================================================================

// Zod Schemas
export const ContactSchema = z.object({
  id: z.string(),
  companyId: z.string().optional(),
  dealId: z.string().optional(),
  fullName: z.string().min(1),
  role: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  notes: z.string().optional(),
  provenanceJson: z.string().optional(),
  freshness: z.enum(['fresh', 'stale', 'expired', 'unknown']).optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const CreateContactInputSchema = z.object({
  companyId: z.string().optional(),
  dealId: z.string().optional(),
  fullName: z.string().min(1),
  role: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  notes: z.string().optional(),
  provenanceJson: z.string().optional(),
  freshness: z.enum(['fresh', 'stale', 'expired', 'unknown']).optional(),
});

export const UpdateContactInputSchema = z.object({
  companyId: z.string().optional(),
  dealId: z.string().optional(),
  fullName: z.string().min(1).optional(),
  role: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  notes: z.string().optional(),
  provenanceJson: z.string().optional(),
  freshness: z.enum(['fresh', 'stale', 'expired', 'unknown']).optional(),
});

// ============================================================================
// Contact Interfaces
// ============================================================================

export interface Contact {
  id: string;
  companyId?: string;
  dealId?: string;
  fullName: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  notes?: string;
  provenanceJson?: string;
  freshness?: FreshnessStatus;
  createdAt: number;
  updatedAt: number;
}

export interface CreateContactInput {
  companyId?: string;
  dealId?: string;
  fullName: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  notes?: string;
  provenanceJson?: string;
  freshness?: FreshnessStatus;
}

export interface UpdateContactInput {
  companyId?: string;
  dealId?: string;
  fullName?: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  notes?: string;
  provenanceJson?: string;
  freshness?: FreshnessStatus;
}

// ============================================================================
// Database Row Types
// ============================================================================

export interface IMaContactRow {
  id: string;
  company_id: string | null;
  deal_id: string | null;
  full_name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  notes: string | null;
  provenance_json: string | null;
  freshness: string | null;
  created_at: number;
  updated_at: number;
}

// ============================================================================
// Row Mappers
// ============================================================================

export function contactToRow(contact: Contact): IMaContactRow {
  return {
    id: contact.id,
    company_id: contact.companyId ?? null,
    deal_id: contact.dealId ?? null,
    full_name: contact.fullName,
    role: contact.role ?? null,
    email: contact.email ?? null,
    phone: contact.phone ?? null,
    linkedin_url: contact.linkedinUrl ?? null,
    notes: contact.notes ?? null,
    provenance_json: contact.provenanceJson ?? null,
    freshness: contact.freshness ?? null,
    created_at: contact.createdAt,
    updated_at: contact.updatedAt,
  };
}

export function rowToContact(row: IMaContactRow): Contact {
  return {
    id: row.id,
    companyId: row.company_id ?? undefined,
    dealId: row.deal_id ?? undefined,
    fullName: row.full_name,
    role: row.role ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    linkedinUrl: row.linkedin_url ?? undefined,
    notes: row.notes ?? undefined,
    provenanceJson: row.provenance_json ?? undefined,
    freshness: (row.freshness as FreshnessStatus) ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
