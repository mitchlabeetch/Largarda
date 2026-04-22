/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { renderNda } from '@/common/ma/template/renderers/ndaRenderer';
import { renderLoi } from '@/common/ma/template/renderers/loiRenderer';
import { renderDdChecklist } from '@/common/ma/template/renderers/ddChecklistRenderer';
import { RENDERER_MAP, resolveRenderer } from '@/common/ma/template/renderers';
import { ChecklistGenerator } from '@process/services/ma/ChecklistGenerator';
import type { ChecklistGenerateInput } from '@process/services/ma/ChecklistGenerator';

// ============================================================================
// Tests
// ============================================================================

describe('Template Rendering', () => {
  // --------------------------------------------------------------------------
  // NDA Renderer
  // --------------------------------------------------------------------------

  describe('renderNda', () => {
    it('renders an NDA with all required variables', () => {
      const content = renderNda({
        dealId: 'deal-001',
        disclosingParty: 'Acme Corp',
        receivingParty: 'Beta LLC',
      });

      expect(content).toContain('# Non-Disclosure Agreement');
      expect(content).toContain('Acme Corp');
      expect(content).toContain('Beta LLC');
      expect(content).toContain('Disclosing Party');
      expect(content).toContain('Receiving Party');
    });

    it('includes optional jurisdiction when provided', () => {
      const content = renderNda({
        dealId: 'deal-001',
        disclosingParty: 'A',
        receivingParty: 'B',
        jurisdiction: 'France',
      });

      expect(content).toContain('France');
    });

    it('includes optional durationMonths when provided', () => {
      const content = renderNda({
        dealId: 'deal-001',
        disclosingParty: 'A',
        receivingParty: 'B',
        durationMonths: '36',
      });

      expect(content).toContain('36 months');
    });

    it('uses default jurisdiction when not provided', () => {
      const content = renderNda({
        dealId: 'deal-001',
        disclosingParty: 'A',
        receivingParty: 'B',
      });

      expect(content).toContain('Applicable Jurisdiction');
    });

    it('uses default 24 months when durationMonths not provided', () => {
      const content = renderNda({
        dealId: 'deal-001',
        disclosingParty: 'A',
        receivingParty: 'B',
      });

      expect(content).toContain('24 months');
    });

    it('contains key NDA sections', () => {
      const content = renderNda({
        dealId: 'deal-001',
        disclosingParty: 'A',
        receivingParty: 'B',
      });

      expect(content).toContain('## 1. Purpose');
      expect(content).toContain('## 2. Definition of Confidential Information');
      expect(content).toContain('## 3. Obligations of the Receiving Party');
      expect(content).toContain('## 4. Exclusions');
      expect(content).toContain('## 5. Term');
      expect(content).toContain('## 6. Governing Law');
      expect(content).toContain('## 7. Remedies');
      expect(content).toContain('## 8. Return of Information');
    });

    it('contains Largo attribution footer', () => {
      const content = renderNda({
        dealId: 'deal-001',
        disclosingParty: 'A',
        receivingParty: 'B',
      });

      expect(content).toContain('Largo M&A Assistant');
      expect(content).toContain('Review by qualified legal counsel');
    });
  });

  // --------------------------------------------------------------------------
  // LOI Renderer
  // --------------------------------------------------------------------------

  describe('renderLoi', () => {
    it('renders an LOI with all required variables', () => {
      const content = renderLoi({
        dealId: 'deal-002',
        buyerName: 'Alpha Inc',
        targetName: 'Target SA',
      });

      expect(content).toContain('# Letter of Intent');
      expect(content).toContain('Alpha Inc');
      expect(content).toContain('Target SA');
    });

    it('includes indicative price when provided', () => {
      const content = renderLoi({
        dealId: 'deal-002',
        buyerName: 'Alpha Inc',
        targetName: 'Target SA',
        indicativePrice: '€50M',
      });

      expect(content).toContain('€50M');
      expect(content).toContain('indicative enterprise value');
    });

    it('omits indicative price section when not provided', () => {
      const content = renderLoi({
        dealId: 'deal-002',
        buyerName: 'Alpha Inc',
        targetName: 'Target SA',
      });

      expect(content).not.toContain('indicative enterprise value');
    });

    it('includes exclusivity period', () => {
      const content = renderLoi({
        dealId: 'deal-002',
        buyerName: 'Alpha Inc',
        targetName: 'Target SA',
        exclusivityPeriod: '90',
      });

      expect(content).toContain('90 days');
    });

    it('uses default 60-day exclusivity', () => {
      const content = renderLoi({
        dealId: 'deal-002',
        buyerName: 'Alpha Inc',
        targetName: 'Target SA',
      });

      expect(content).toContain('60 days');
    });

    it('contains key LOI sections', () => {
      const content = renderLoi({
        dealId: 'deal-002',
        buyerName: 'Alpha Inc',
        targetName: 'Target SA',
      });

      expect(content).toContain('## 1. Introduction');
      expect(content).toContain('## 2. Proposed Transaction');
      expect(content).toContain('## 4. Exclusivity');
      expect(content).toContain('## 5. Due Diligence');
      expect(content).toContain('## 6. Confidentiality');
      expect(content).toContain('## 7. Binding Provisions');
    });

    it('contains Largo attribution footer', () => {
      const content = renderLoi({
        dealId: 'deal-002',
        buyerName: 'Alpha Inc',
        targetName: 'Target SA',
      });

      expect(content).toContain('Largo M&A Assistant');
    });
  });

  // --------------------------------------------------------------------------
  // DD Checklist Renderer
  // --------------------------------------------------------------------------

  describe('renderDdChecklist', () => {
    it('renders a DD checklist with all risk categories by default', () => {
      const content = renderDdChecklist({
        dealId: 'deal-003',
        dealName: 'Project Delta',
      });

      expect(content).toContain('# Due Diligence Checklist — Project Delta');
      expect(content).toContain('## Financial');
      expect(content).toContain('## Legal');
      expect(content).toContain('## Operational');
      expect(content).toContain('## Regulatory');
      expect(content).toContain('## Reputational');
    });

    it('filters to focus areas when provided', () => {
      const content = renderDdChecklist({
        dealId: 'deal-003',
        dealName: 'Project Delta',
        focusAreas: 'financial, legal',
      });

      expect(content).toContain('## Financial');
      expect(content).toContain('## Legal');
      expect(content).not.toContain('## Operational');
      expect(content).not.toContain('## Regulatory');
      expect(content).not.toContain('## Reputational');
    });

    it('renders checklist items in a table format', () => {
      const content = renderDdChecklist({
        dealId: 'deal-003',
        dealName: 'Project Delta',
        focusAreas: 'financial',
      });

      expect(content).toContain('| # | Item | Guidance | Status |');
      expect(content).toContain('☐');
    });

    it('includes specific financial checklist items', () => {
      const content = renderDdChecklist({
        dealId: 'deal-003',
        dealName: 'Project Delta',
        focusAreas: 'financial',
      });

      expect(content).toContain('Audited financial statements');
      expect(content).toContain('Working capital analysis');
      expect(content).toContain('Debt schedule and covenants');
    });

    it('includes specific legal checklist items', () => {
      const content = renderDdChecklist({
        dealId: 'deal-003',
        dealName: 'Project Delta',
        focusAreas: 'legal',
      });

      expect(content).toContain('Corporate structure');
      expect(content).toContain('Material contracts');
      expect(content).toContain('IP portfolio');
    });

    it('contains deal name attribution', () => {
      const content = renderDdChecklist({
        dealId: 'deal-003',
        dealName: 'Project Delta',
      });

      expect(content).toContain('Project Delta');
      expect(content).toContain('Largo M&A Assistant');
    });

    it('shows focus area labels in header when provided', () => {
      const content = renderDdChecklist({
        dealId: 'deal-003',
        dealName: 'Project Delta',
        focusAreas: 'financial, legal',
      });

      expect(content).toContain('Focus areas:');
      expect(content).toContain('Financial');
      expect(content).toContain('Legal');
    });
  });

  // --------------------------------------------------------------------------
  // RENDERER_MAP
  // --------------------------------------------------------------------------

  describe('RENDERER_MAP', () => {
    it('has entries for tpl.nda, tpl.loi, tpl.dd', () => {
      expect(RENDERER_MAP['tpl.nda']).toBeDefined();
      expect(RENDERER_MAP['tpl.loi']).toBeDefined();
      expect(RENDERER_MAP['tpl.dd']).toBeDefined();
    });

    it('does not have entries for tpl.teaser, tpl.im, tpl.valuation', () => {
      expect(RENDERER_MAP['tpl.teaser']).toBeUndefined();
      expect(RENDERER_MAP['tpl.im']).toBeUndefined();
      expect(RENDERER_MAP['tpl.valuation']).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // resolveRenderer
  // --------------------------------------------------------------------------

  describe('resolveRenderer', () => {
    it('returns renderer for known keys', () => {
      expect(resolveRenderer('tpl.nda')).toBe(renderNda);
      expect(resolveRenderer('tpl.loi')).toBe(renderLoi);
      expect(resolveRenderer('tpl.dd')).toBe(renderDdChecklist);
    });

    it('returns undefined for keys without a local renderer', () => {
      expect(resolveRenderer('tpl.teaser')).toBeUndefined();
      expect(resolveRenderer('tpl.im')).toBeUndefined();
      expect(resolveRenderer('tpl.valuation')).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // ChecklistGenerator integration
  // --------------------------------------------------------------------------

  describe('ChecklistGenerator', () => {
    const generator = new ChecklistGenerator();

    it('generates an NDA document via local renderer', () => {
      const input: ChecklistGenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-100',
        variables: {
          dealId: 'deal-100',
          disclosingParty: 'A',
          receivingParty: 'B',
        },
      };

      const result = generator.generate(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.document.templateKey).toBe('tpl.nda');
        expect(result.document.content).toContain('# Non-Disclosure Agreement');
        expect(result.document.reviewStatus).toBe('generated');
      }
    });

    it('generates an LOI document via local renderer', () => {
      const input: ChecklistGenerateInput = {
        templateKey: 'tpl.loi',
        dealId: 'deal-101',
        variables: {
          dealId: 'deal-101',
          buyerName: 'Buyer',
          targetName: 'Target',
        },
      };

      const result = generator.generate(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.document.templateKey).toBe('tpl.loi');
        expect(result.document.content).toContain('# Letter of Intent');
      }
    });

    it('generates a DD checklist via local renderer', () => {
      const input: ChecklistGenerateInput = {
        templateKey: 'tpl.dd',
        dealId: 'deal-102',
        variables: {
          dealId: 'deal-102',
          dealName: 'Project X',
        },
      };

      const result = generator.generate(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.document.templateKey).toBe('tpl.dd');
        expect(result.document.content).toContain('Due Diligence Checklist');
      }
    });

    it('returns error for template without local renderer', () => {
      const input: ChecklistGenerateInput = {
        templateKey: 'tpl.teaser',
        dealId: 'deal-103',
        variables: { dealId: 'deal-103' },
      };

      const result = generator.generate(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('No local renderer');
      }
    });

    it('generates unique ids for each document', () => {
      const input: ChecklistGenerateInput = {
        templateKey: 'tpl.nda',
        dealId: 'deal-104',
        variables: { dealId: 'deal-104', disclosingParty: 'A', receivingParty: 'B' },
      };

      const result1 = generator.generate(input);
      const result2 = generator.generate(input);
      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (result1.ok && result2.ok) {
        expect(result1.document.id).not.toBe(result2.document.id);
      }
    });
  });
});
