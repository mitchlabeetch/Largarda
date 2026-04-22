/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Enrichment Merge Helper
 * Handles merging of enrichment data from multiple sources with explicit precedence rules
 * Tracks provenance and disagreements without obscuring data sources
 */

import type { UpdateCompanyInput } from '../../../common/ma/company/schema';
import {
  SOURCE_PRECEDENCE,
  type SourcePrecedenceKey,
  MergeStrategy,
  FIELD_MERGE_CONFIG,
  type Disagreement,
  type FieldProvenance,
  type ProvenanceJson,
} from './PappersEnricher';

/**
 * Enrichment source data with provenance
 */
export interface EnrichmentSourceData {
  source: string;
  update: Partial<UpdateCompanyInput>;
  precedence: number;
  timestamp: number;
}

/**
 * Merge result with provenance tracking
 */
export interface MergeResult {
  mergedUpdate: Partial<UpdateCompanyInput>;
  provenance: ProvenanceJson;
  disagreements: Disagreement[];
  sourcesUsed: string[];
}

/**
 * Merge options
 */
export interface MergeOptions {
  /** Override default merge strategies for specific fields */
  fieldStrategies?: Partial<Record<string, MergeStrategy>>;
  /** Whether to mark disagreements instead of resolving them */
  markDisagreements?: boolean;
  /** Current provenance JSON to merge into */
  existingProvenance?: ProvenanceJson;
}

/**
 * Enrichment Merge Helper
 */
export class EnrichmentMergeHelper {
  /**
   * Merge multiple enrichment sources into a single update
   */
  mergeSources(sources: EnrichmentSourceData[], options: MergeOptions = {}): MergeResult {
    const { fieldStrategies = {}, markDisagreements = false, existingProvenance } = options;
    const mergedUpdate: Partial<UpdateCompanyInput> = {};
    const disagreements: Disagreement[] = [];
    const sourcesUsed = new Set<string>();
    const provenanceFields: Record<string, FieldProvenance> = { ...existingProvenance?.fields };

    // Collect all fields from all sources
    const allFields = new Set<string>();
    for (const source of sources) {
      for (const field of Object.keys(source.update)) {
        allFields.add(field);
        sourcesUsed.add(source.source);
      }
    }

    // Process each field according to merge strategy
    for (const field of allFields) {
      const strategy = fieldStrategies[field] ?? FIELD_MERGE_CONFIG[field] ?? MergeStrategy.PRECEDENCE;
      const fieldSources = sources
        .filter((s) => s.update[field as keyof UpdateCompanyInput] !== undefined)
        .toSorted((a, b) => b.precedence - a.precedence);

      if (fieldSources.length === 0) {
        continue;
      }

      const result = this.mergeField(field, fieldSources, strategy, markDisagreements, provenanceFields);

      if (result.value !== undefined) {
        (mergedUpdate as Record<string, unknown>)[field] = result.value;
      }

      if (result.disagreement) {
        disagreements.push(result.disagreement);
      }
    }

    // Merge existing disagreements
    const existingDisagreements = existingProvenance?.disagreements ?? [];
    const mergedDisagreements = this.mergeDisagreements(existingDisagreements, disagreements);

    const provenance: ProvenanceJson = {
      fields: provenanceFields,
      disagreements: mergedDisagreements,
      lastMerged: Date.now(),
    };

    return {
      mergedUpdate,
      provenance,
      disagreements: mergedDisagreements,
      sourcesUsed: Array.from(sourcesUsed),
    };
  }

  /**
   * Merge a single field according to strategy
   */
  private mergeField(
    field: string,
    sources: EnrichmentSourceData[],
    strategy: MergeStrategy,
    markDisagreements: boolean,
    provenanceFields: Record<string, FieldProvenance>
  ): { value?: unknown; disagreement?: Disagreement } {
    if (sources.length === 0) {
      return {};
    }

    // Check KEEP_EXISTING strategy first - if there's an existing value, keep it
    if (strategy === MergeStrategy.KEEP_EXISTING) {
      const existing = provenanceFields[field];
      if (existing) {
        // Keep existing value, don't update provenance
        return { value: existing.value };
      }
      // No existing value, fall through to normal processing
    }

    // Check for disagreements (different values from different sources)
    const uniqueValues = new Set(sources.map((s) => JSON.stringify(s.update[field as keyof UpdateCompanyInput])));

    if (uniqueValues.size > 1 && strategy !== MergeStrategy.MERGE) {
      // Disagreement detected
      const disagreementSources = sources.map((s) => ({
        source: s.source,
        value: s.update[field as keyof UpdateCompanyInput],
        precedence: s.precedence,
      }));

      const disagreement: Disagreement = {
        field,
        sources: disagreementSources,
      };

      if (markDisagreements) {
        // Mark disagreement, don't resolve
        const existing = provenanceFields[field];
        return {
          value: existing?.value,
          disagreement,
        };
      }

      // Resolve by precedence
      const highestPrecedence = sources[0];
      disagreement.resolvedValue = highestPrecedence.update[field as keyof UpdateCompanyInput];
      disagreement.resolvedBy = highestPrecedence.source;

      // Update provenance
      provenanceFields[field] = {
        field,
        value: highestPrecedence.update[field as keyof UpdateCompanyInput],
        source: highestPrecedence.source,
        sourcePrecedence: highestPrecedence.precedence,
        lastUpdated: highestPrecedence.timestamp,
      };

      return {
        value: highestPrecedence.update[field as keyof UpdateCompanyInput],
        disagreement,
      };
    }

    // No disagreement, apply strategy
    switch (strategy) {
      case MergeStrategy.PRECEDENCE:
        const highest = sources[0];
        provenanceFields[field] = {
          field,
          value: highest.update[field as keyof UpdateCompanyInput],
          source: highest.source,
          sourcePrecedence: highest.precedence,
          lastUpdated: highest.timestamp,
        };
        return { value: highest.update[field as keyof UpdateCompanyInput] };

      case MergeStrategy.KEEP_EXISTING:
        // No existing value (handled above), use first source
        const first = sources[0];
        provenanceFields[field] = {
          field,
          value: first.update[field as keyof UpdateCompanyInput],
          source: first.source,
          sourcePrecedence: first.precedence,
          lastUpdated: first.timestamp,
        };
        return { value: first.update[field as keyof UpdateCompanyInput] };

      case MergeStrategy.OVERRIDE:
        const latest = sources[0];
        provenanceFields[field] = {
          field,
          value: latest.update[field as keyof UpdateCompanyInput],
          source: latest.source,
          sourcePrecedence: latest.precedence,
          lastUpdated: latest.timestamp,
        };
        return { value: latest.update[field as keyof UpdateCompanyInput] };

      case MergeStrategy.MERGE:
        // Merge arrays/objects
        const merged = this.mergeValues(sources.map((s) => s.update[field as keyof UpdateCompanyInput]));
        provenanceFields[field] = {
          field,
          value: merged,
          source: sources.map((s) => s.source).join(','),
          sourcePrecedence: Math.max(...sources.map((s) => s.precedence)),
          lastUpdated: Date.now(),
        };
        return { value: merged };

      case MergeStrategy.DISAGREE:
        const disagreeSources = sources.map((s) => ({
          source: s.source,
          value: s.update[field as keyof UpdateCompanyInput],
          precedence: s.precedence,
        }));
        return {
          value: undefined,
          disagreement: {
            field,
            sources: disagreeSources,
          },
        };

      default:
        const defaultSource = sources[0];
        provenanceFields[field] = {
          field,
          value: defaultSource.update[field as keyof UpdateCompanyInput],
          source: defaultSource.source,
          sourcePrecedence: defaultSource.precedence,
          lastUpdated: defaultSource.timestamp,
        };
        return { value: defaultSource.update[field as keyof UpdateCompanyInput] };
    }
  }

  /**
   * Merge multiple values (for arrays/objects)
   */
  private mergeValues(values: unknown[]): unknown {
    if (values.length === 0) {
      return undefined;
    }

    if (values.length === 1) {
      return values[0];
    }

    // Check if all values are arrays
    if (values.every((v) => Array.isArray(v))) {
      const merged = new Set<string>();
      for (const arr of values as unknown[][]) {
        for (const item of arr) {
          merged.add(JSON.stringify(item));
        }
      }
      return Array.from(merged).map((s) => JSON.parse(s) as unknown);
    }

    // Check if all values are objects
    if (values.every((v) => typeof v === 'object' && v !== null && !Array.isArray(v))) {
      const merged: Record<string, unknown> = {};
      for (const obj of values as Record<string, unknown>[]) {
        Object.assign(merged, obj);
      }
      return merged;
    }

    // Default: use first value
    return values[0];
  }

  /**
   * Merge existing disagreements with new ones
   */
  private mergeDisagreements(existing: Disagreement[], newDisagreements: Disagreement[]): Disagreement[] {
    const disagreementMap = new Map<string, Disagreement>();

    // Add existing disagreements
    for (const d of existing) {
      disagreementMap.set(d.field, d);
    }

    // Update with new disagreements
    for (const d of newDisagreements) {
      disagreementMap.set(d.field, d);
    }

    return Array.from(disagreementMap.values());
  }

  /**
   * Get source precedence for a source name
   */
  getSourcePrecedence(source: string): number {
    return SOURCE_PRECEDENCE[source as SourcePrecedenceKey] || 0;
  }

  /**
   * Compare two sources by precedence
   */
  compareSources(sourceA: string, sourceB: string): number {
    const precedenceA = this.getSourcePrecedence(sourceA);
    const precedenceB = this.getSourcePrecedence(sourceB);
    return precedenceB - precedenceA;
  }

  /**
   * Get unresolved disagreements from provenance
   */
  getUnresolvedDisagreements(provenance: ProvenanceJson): Disagreement[] {
    return provenance.disagreements.filter((d) => !d.resolvedValue);
  }

  /**
   * Resolve a specific disagreement
   */
  resolveDisagreement(
    provenance: ProvenanceJson,
    field: string,
    resolvedValue: unknown,
    resolvedBy: string
  ): ProvenanceJson {
    const disagreement = provenance.disagreements.find((d) => d.field === field);
    if (disagreement) {
      disagreement.resolvedValue = resolvedValue;
      disagreement.resolvedBy = resolvedBy;
    }

    // Update field provenance
    provenance.fields[field] = {
      field,
      value: resolvedValue,
      source: resolvedBy,
      sourcePrecedence: this.getSourcePrecedence(resolvedBy),
      lastUpdated: Date.now(),
    };

    provenance.lastMerged = Date.now();

    return provenance;
  }
}

/**
 * Singleton instance
 */
let enrichmentMergeHelper: EnrichmentMergeHelper | null = null;

export function getEnrichmentMergeHelper(): EnrichmentMergeHelper {
  if (!enrichmentMergeHelper) {
    enrichmentMergeHelper = new EnrichmentMergeHelper();
  }
  return enrichmentMergeHelper;
}
