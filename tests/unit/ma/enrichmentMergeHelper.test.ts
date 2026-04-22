/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { EnrichmentMergeHelper } from '../../../src/process/services/ma/EnrichmentMergeHelper';
import {
  getEnrichmentMergeHelper,
  type EnrichmentSourceData,
  type MergeResult,
  type MergeOptions,
} from '../../../src/process/services/ma/EnrichmentMergeHelper';
import {
  SOURCE_PRECEDENCE,
  MergeStrategy,
  type ProvenanceJson,
} from '../../../src/process/services/ma/PappersEnricher';
import type { UpdateCompanyInput } from '../../../src/common/ma/company/schema';

describe('EnrichmentMergeHelper', () => {
  let helper: EnrichmentMergeHelper;

  beforeEach(() => {
    helper = getEnrichmentMergeHelper();
  });

  describe('mergeSources - merge precedence', () => {
    it('should use highest precedence source when sources disagree', () => {
      const sources: EnrichmentSourceData[] = [
        {
          source: 'rechercheEntreprises',
          update: { name: 'Company A' } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.rechercheEntreprises,
          timestamp: Date.now(),
        },
        {
          source: 'pappers',
          update: { name: 'Company B' } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.pappers,
          timestamp: Date.now(),
        },
      ];

      const result = helper.mergeSources(sources);

      expect(result.mergedUpdate.name).toBe('Company B'); // Pappers has higher precedence
      expect(result.disagreements).toHaveLength(1);
      expect(result.disagreements[0].field).toBe('name');
      expect(result.disagreements[0].resolvedValue).toBe('Company B');
      expect(result.disagreements[0].resolvedBy).toBe('pappers');
    });

    it('should respect manual source precedence over all others', () => {
      const sources: EnrichmentSourceData[] = [
        {
          source: 'pappers',
          update: { name: 'Pappers Name' } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.pappers,
          timestamp: Date.now(),
        },
        {
          source: 'manual',
          update: { name: 'Manual Name' } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.manual,
          timestamp: Date.now(),
        },
      ];

      const result = helper.mergeSources(sources);

      expect(result.mergedUpdate.name).toBe('Manual Name');
      expect(result.disagreements[0].resolvedBy).toBe('manual');
    });

    it('should handle multiple fields with different precedence', () => {
      const sources: EnrichmentSourceData[] = [
        {
          source: 'rechercheEntreprises',
          update: {
            name: 'RE Name',
            legalForm: 'SARL',
          } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.rechercheEntreprises,
          timestamp: Date.now(),
        },
        {
          source: 'pappers',
          update: {
            name: 'Pappers Name',
            employeeCount: 100,
          } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.pappers,
          timestamp: Date.now(),
        },
      ];

      const result = helper.mergeSources(sources);

      expect(result.mergedUpdate.name).toBe('Pappers Name'); // Pappers higher
      expect(result.mergedUpdate.legalForm).toBe('SARL'); // Only from RE
      expect(result.mergedUpdate.employeeCount).toBe(100); // Only from Pappers
    });

    it('should use field-specific merge strategy when configured', () => {
      const sources: EnrichmentSourceData[] = [
        {
          source: 'rechercheEntreprises',
          update: { registeredAt: 1000 } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.rechercheEntreprises,
          timestamp: Date.now(),
        },
        {
          source: 'pappers',
          update: { registeredAt: 2000 } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.pappers,
          timestamp: Date.now(),
        },
      ];

      const existingProvenance: ProvenanceJson = {
        fields: {
          registeredAt: {
            field: 'registeredAt',
            value: 500,
            source: 'manual',
            sourcePrecedence: SOURCE_PRECEDENCE.manual,
            lastUpdated: Date.now(),
          },
        },
        disagreements: [],
        lastMerged: Date.now(),
      };

      const result = helper.mergeSources(sources, {
        fieldStrategies: { registeredAt: MergeStrategy.KEEP_EXISTING },
        existingProvenance,
      });

      // KEEP_EXISTING strategy should preserve existing value
      expect(result.mergedUpdate.registeredAt).toBe(500);
    });

    it('should override with OVERRIDE strategy regardless of precedence', () => {
      const sources: EnrichmentSourceData[] = [
        {
          source: 'rechercheEntreprises',
          update: { revenue: 1000000 } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.rechercheEntreprises,
          timestamp: Date.now(),
        },
        {
          source: 'pappers',
          update: { revenue: 2000000 } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.pappers,
          timestamp: Date.now(),
        },
      ];

      const result = helper.mergeSources(sources, {
        fieldStrategies: { revenue: MergeStrategy.OVERRIDE },
      });

      // OVERRIDE should use latest (highest precedence in our sort)
      expect(result.mergedUpdate.revenue).toBe(2000000);
    });
  });

  describe('mergeSources - disagreement handling', () => {
    it('should mark disagreements when markDisagreements is true', () => {
      const sources: EnrichmentSourceData[] = [
        {
          source: 'rechercheEntreprises',
          update: { name: 'RE Name' } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.rechercheEntreprises,
          timestamp: Date.now(),
        },
        {
          source: 'pappers',
          update: { name: 'Pappers Name' } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.pappers,
          timestamp: Date.now(),
        },
      ];

      const existingProvenance: ProvenanceJson = {
        fields: {
          name: {
            field: 'name',
            value: 'Original Name',
            source: 'manual',
            sourcePrecedence: SOURCE_PRECEDENCE.manual,
            lastUpdated: Date.now(),
          },
        },
        disagreements: [],
        lastMerged: Date.now(),
      };

      const result = helper.mergeSources(sources, {
        markDisagreements: true,
        existingProvenance,
      });

      // Should keep existing value when marking disagreements
      expect(result.mergedUpdate.name).toBe('Original Name');
      expect(result.disagreements).toHaveLength(1);
      expect(result.disagreements[0].resolvedValue).toBeUndefined();
    });

    it('should track all sources in disagreement record', () => {
      const sources: EnrichmentSourceData[] = [
        {
          source: 'rechercheEntreprises',
          update: { name: 'RE Name' } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.rechercheEntreprises,
          timestamp: Date.now(),
        },
        {
          source: 'pappers',
          update: { name: 'Pappers Name' } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.pappers,
          timestamp: Date.now(),
        },
      ];

      const result = helper.mergeSources(sources);

      expect(result.disagreements[0].sources).toHaveLength(2);
      expect(result.disagreements[0].sources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            source: 'rechercheEntreprises',
            value: 'RE Name',
            precedence: SOURCE_PRECEDENCE.rechercheEntreprises,
          }),
          expect.objectContaining({
            source: 'pappers',
            value: 'Pappers Name',
            precedence: SOURCE_PRECEDENCE.pappers,
          }),
        ])
      );
    });

    it('should not create disagreement for identical values', () => {
      const sources: EnrichmentSourceData[] = [
        {
          source: 'rechercheEntreprises',
          update: { name: 'Same Name' } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.rechercheEntreprises,
          timestamp: Date.now(),
        },
        {
          source: 'pappers',
          update: { name: 'Same Name' } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.pappers,
          timestamp: Date.now(),
        },
      ];

      const result = helper.mergeSources(sources);

      expect(result.disagreements).toHaveLength(0);
    });

    it('should merge existing disagreements with new ones', () => {
      const existingProvenance: ProvenanceJson = {
        fields: {},
        disagreements: [
          {
            field: 'legalForm',
            sources: [
              { source: 'rechercheEntreprises', value: 'SARL', precedence: 5 },
              { source: 'pappers', value: 'SAS', precedence: 10 },
            ],
            resolvedValue: 'SAS',
            resolvedBy: 'pappers',
          },
        ],
        lastMerged: Date.now(),
      };

      const sources: EnrichmentSourceData[] = [
        {
          source: 'rechercheEntreprises',
          update: { name: 'RE Name' } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.rechercheEntreprises,
          timestamp: Date.now(),
        },
        {
          source: 'pappers',
          update: { name: 'Pappers Name' } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.pappers,
          timestamp: Date.now(),
        },
      ];

      const result = helper.mergeSources(sources, { existingProvenance });

      expect(result.disagreements).toHaveLength(2);
      expect(result.disagreements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'legalForm' }),
          expect.objectContaining({ field: 'name' }),
        ])
      );
    });
  });

  describe('mergeSources - provenance retention', () => {
    it('should track field-level provenance for merged fields', () => {
      const sources: EnrichmentSourceData[] = [
        {
          source: 'pappers',
          update: {
            name: 'Pappers Name',
            employeeCount: 100,
          } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.pappers,
          timestamp: Date.now(),
        },
      ];

      const result = helper.mergeSources(sources);

      expect(result.provenance.fields.name).toBeDefined();
      expect(result.provenance.fields.name.field).toBe('name');
      expect(result.provenance.fields.name.value).toBe('Pappers Name');
      expect(result.provenance.fields.name.source).toBe('pappers');
      expect(result.provenance.fields.name.sourcePrecedence).toBe(SOURCE_PRECEDENCE.pappers);
      expect(result.provenance.fields.name.lastUpdated).toBeGreaterThan(0);

      expect(result.provenance.fields.employeeCount).toBeDefined();
      expect(result.provenance.fields.employeeCount.source).toBe('pappers');
    });

    it('should preserve existing provenance when merging', () => {
      const existingProvenance: ProvenanceJson = {
        fields: {
          name: {
            field: 'name',
            value: 'Old Name',
            source: 'manual',
            sourcePrecedence: SOURCE_PRECEDENCE.manual,
            lastUpdated: Date.now() - 10000,
          },
        },
        disagreements: [],
        lastMerged: Date.now() - 10000,
      };

      const sources: EnrichmentSourceData[] = [
        {
          source: 'pappers',
          update: { employeeCount: 100 } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.pappers,
          timestamp: Date.now(),
        },
      ];

      const result = helper.mergeSources(sources, { existingProvenance });

      // Existing provenance should be preserved
      expect(result.provenance.fields.name).toBeDefined();
      expect(result.provenance.fields.name.value).toBe('Old Name');
      expect(result.provenance.fields.name.source).toBe('manual');

      // New field should be added
      expect(result.provenance.fields.employeeCount).toBeDefined();
    });

    it('should update provenance when field is overridden', () => {
      const existingProvenance: ProvenanceJson = {
        fields: {
          name: {
            field: 'name',
            value: 'Old Name',
            source: 'rechercheEntreprises',
            sourcePrecedence: SOURCE_PRECEDENCE.rechercheEntreprises,
            lastUpdated: Date.now() - 10000,
          },
        },
        disagreements: [],
        lastMerged: Date.now() - 10000,
      };

      const sources: EnrichmentSourceData[] = [
        {
          source: 'pappers',
          update: { name: 'New Name' } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.pappers,
          timestamp: Date.now(),
        },
      ];

      const result = helper.mergeSources(sources, { existingProvenance });

      expect(result.provenance.fields.name.value).toBe('New Name');
      expect(result.provenance.fields.name.source).toBe('pappers');
      expect(result.provenance.fields.name.lastUpdated).toBeGreaterThan(existingProvenance.fields.name.lastUpdated);
    });

    it('should track lastMerged timestamp', () => {
      const beforeMerge = Date.now();

      const sources: EnrichmentSourceData[] = [
        {
          source: 'pappers',
          update: { name: 'Test' } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.pappers,
          timestamp: Date.now(),
        },
      ];

      const result = helper.mergeSources(sources);

      expect(result.provenance.lastMerged).toBeGreaterThanOrEqual(beforeMerge);
    });

    it('should track all sources used in merge', () => {
      const sources: EnrichmentSourceData[] = [
        {
          source: 'rechercheEntreprises',
          update: { legalForm: 'SARL' } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.rechercheEntreprises,
          timestamp: Date.now(),
        },
        {
          source: 'pappers',
          update: { name: 'Test' } as Partial<UpdateCompanyInput>,
          precedence: SOURCE_PRECEDENCE.pappers,
          timestamp: Date.now(),
        },
      ];

      const result = helper.mergeSources(sources);

      expect(result.sourcesUsed).toHaveLength(2);
      expect(result.sourcesUsed).toContain('rechercheEntreprises');
      expect(result.sourcesUsed).toContain('pappers');
    });
  });

  describe('getSourcePrecedence', () => {
    it('should return correct precedence for known sources', () => {
      expect(helper.getSourcePrecedence('pappers')).toBe(SOURCE_PRECEDENCE.pappers);
      expect(helper.getSourcePrecedence('rechercheEntreprises')).toBe(SOURCE_PRECEDENCE.rechercheEntreprises);
      expect(helper.getSourcePrecedence('manual')).toBe(SOURCE_PRECEDENCE.manual);
    });

    it('should return 0 for unknown sources', () => {
      expect(helper.getSourcePrecedence('unknown')).toBe(0);
    });
  });

  describe('compareSources', () => {
    it('should return positive when sourceA has lower precedence', () => {
      const result = helper.compareSources('rechercheEntreprises', 'pappers');
      expect(result).toBeGreaterThan(0); // pappers (10) > rechercheEntreprises (5)
    });

    it('should return negative when sourceA has higher precedence', () => {
      const result = helper.compareSources('pappers', 'rechercheEntreprises');
      expect(result).toBeLessThan(0);
    });

    it('should return 0 for equal precedence', () => {
      const result = helper.compareSources('unknown', 'unknown');
      expect(result).toBe(0);
    });
  });

  describe('getUnresolvedDisagreements', () => {
    it('should return only unresolved disagreements', () => {
      const provenance: ProvenanceJson = {
        fields: {},
        disagreements: [
          {
            field: 'name',
            sources: [{ source: 'pappers', value: 'A', precedence: 10 }],
          },
          {
            field: 'legalForm',
            sources: [{ source: 'pappers', value: 'SAS', precedence: 10 }],
            resolvedValue: 'SAS',
            resolvedBy: 'manual',
          },
        ],
        lastMerged: Date.now(),
      };

      const unresolved = helper.getUnresolvedDisagreements(provenance);

      expect(unresolved).toHaveLength(1);
      expect(unresolved[0].field).toBe('name');
    });
  });

  describe('resolveDisagreement', () => {
    it('should resolve a disagreement and update provenance', () => {
      const provenance: ProvenanceJson = {
        fields: {},
        disagreements: [
          {
            field: 'name',
            sources: [
              { source: 'pappers', value: 'A', precedence: 10 },
              { source: 'rechercheEntreprises', value: 'B', precedence: 5 },
            ],
          },
        ],
        lastMerged: Date.now(),
      };

      const updated = helper.resolveDisagreement(provenance, 'name', 'C', 'manual');

      expect(updated.disagreements[0].resolvedValue).toBe('C');
      expect(updated.disagreements[0].resolvedBy).toBe('manual');
      expect(updated.fields.name.value).toBe('C');
      expect(updated.fields.name.source).toBe('manual');
    });
  });
});
