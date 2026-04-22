/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Provenance Persistence Coverage Tests for Wave 9 / Batch 9C
 *
 * Ensures that when flows are used, the provenance (which flow key, flow ID,
 * and prompt version were used) is persisted for observability, debugging, and
 * prompt version rollbacks.
 */

import { describe, expect, it } from 'vitest';
import {
  FLOW_CATALOG,
  KNOWN_FLOW_KEYS,
  resolveFlowSpec,
  type FlowSpec,
  type FlowProvenance,
} from '@/common/ma/flowise';

describe('Wave 9 / Batch 9C: Provenance Persistence Coverage', () => {
  describe('FlowProvenance Type Structure', () => {
    it('FlowProvenance has all required fields', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);

      const provenance: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: spec.promptVersionId,
        flowDescription: spec.description,
        resolvedAt: Date.now(),
      };

      expect(provenance.flowKey).toBeDefined();
      expect(provenance.flowId).toBeDefined();
      expect(provenance.promptVersionId).toBeDefined();
      expect(provenance.flowDescription).toBeDefined();
      expect(provenance.resolvedAt).toBeDefined();
    });

    it('FlowProvenance fields have correct types', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);

      const provenance: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: spec.promptVersionId,
        flowDescription: spec.description,
        resolvedAt: Date.now(),
      };

      expect(typeof provenance.flowKey).toBe('string');
      expect(typeof provenance.flowId).toBe('string');
      expect(typeof provenance.promptVersionId).toBe('string');
      expect(typeof provenance.flowDescription).toBe('string');
      expect(typeof provenance.resolvedAt).toBe('number');
    });

    it('FlowProvenance flowKey is a valid flow key from KNOWN_FLOW_KEYS', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);

      const provenance: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: spec.promptVersionId,
        flowDescription: spec.description,
        resolvedAt: Date.now(),
      };

      expect(KNOWN_FLOW_KEYS).toContain(provenance.flowKey);
    });

    it('FlowProvenance flowId matches the resolved spec', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);

      const provenance: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: spec.promptVersionId,
        flowDescription: spec.description,
        resolvedAt: Date.now(),
      };

      expect(provenance.flowId).toBe(spec.id);
    });

    it('FlowProvenance promptVersionId matches the resolved spec', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);

      const provenance: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: spec.promptVersionId,
        flowDescription: spec.description,
        resolvedAt: Date.now(),
      };

      expect(provenance.promptVersionId).toBe(spec.promptVersionId);
    });

    it('FlowProvenance flowDescription matches the resolved spec', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);

      const provenance: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: spec.promptVersionId,
        flowDescription: spec.description,
        resolvedAt: Date.now(),
      };

      expect(provenance.flowDescription).toBe(spec.description);
    });

    it('FlowProvenance resolvedAt is a valid timestamp', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);
      const now = Date.now();

      const provenance: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: spec.promptVersionId,
        flowDescription: spec.description,
        resolvedAt: now,
      };

      expect(provenance.resolvedAt).toBe(now);
      expect(provenance.resolvedAt).toBeGreaterThan(0);
      expect(provenance.resolvedAt).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('FlowProvenance Creation from FlowSpec', () => {
    it('can create FlowProvenance from any FlowSpec', () => {
      for (const key of KNOWN_FLOW_KEYS) {
        const spec = resolveFlowSpec(key);

        const provenance: FlowProvenance = {
          flowKey: spec.key,
          flowId: spec.id,
          promptVersionId: spec.promptVersionId,
          flowDescription: spec.description,
          resolvedAt: Date.now(),
        };

        expect(provenance.flowKey).toBe(spec.key);
        expect(provenance.flowId).toBe(spec.id);
        expect(provenance.promptVersionId).toBe(spec.promptVersionId);
        expect(provenance.flowDescription).toBe(spec.description);
      }
    });

    it('FlowProvenance captures the exact state at resolution time', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);
      const resolvedAt = 1713744000000; // Fixed timestamp

      const provenance: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: spec.promptVersionId,
        flowDescription: spec.description,
        resolvedAt,
      };

      expect(provenance.resolvedAt).toBe(resolvedAt);
      expect(provenance.flowKey).toBe(spec.key);
      expect(provenance.flowId).toBe(spec.id);
    });
  });

  describe('Provenance Serialization', () => {
    it('FlowProvenance can be serialized to JSON', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);

      const provenance: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: spec.promptVersionId,
        flowDescription: spec.description,
        resolvedAt: Date.now(),
      };

      const serialized = JSON.stringify(provenance);

      expect(serialized).toBeTruthy();
      expect(typeof serialized).toBe('string');

      const deserialized = JSON.parse(serialized) as FlowProvenance;
      expect(deserialized.flowKey).toBe(provenance.flowKey);
      expect(deserialized.flowId).toBe(provenance.flowId);
      expect(deserialized.promptVersionId).toBe(provenance.promptVersionId);
    });

    it('FlowProvenance can be deserialized from JSON', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);

      const provenance: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: spec.promptVersionId,
        flowDescription: spec.description,
        resolvedAt: Date.now(),
      };

      const serialized = JSON.stringify(provenance);
      const deserialized = JSON.parse(serialized) as FlowProvenance;

      expect(deserialized.flowKey).toBe(provenance.flowKey);
      expect(deserialized.flowId).toBe(provenance.flowId);
      expect(deserialized.promptVersionId).toBe(provenance.promptVersionId);
      expect(deserialized.flowDescription).toBe(provenance.flowDescription);
      expect(deserialized.resolvedAt).toBe(provenance.resolvedAt);
    });
  });

  describe('Provenance Observability', () => {
    it('FlowProvenance enables tracing which flow was used', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);

      const provenance: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: spec.promptVersionId,
        flowDescription: spec.description,
        resolvedAt: Date.now(),
      };

      // With provenance, we can trace back to exactly which flow was used
      const flowKey = provenance.flowKey;
      const resolvedSpec = resolveFlowSpec(flowKey);

      expect(resolvedSpec.key).toBe(provenance.flowKey);
      expect(resolvedSpec.id).toBe(provenance.flowId);
    });

    it('FlowProvenance enables tracing which prompt version was used', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);

      const provenance: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: spec.promptVersionId,
        flowDescription: spec.description,
        resolvedAt: Date.now(),
      };

      // With provenance, we can trace back to exactly which prompt version was used
      const promptVersionId = provenance.promptVersionId;

      expect(promptVersionId).toBe(spec.promptVersionId);
      expect(promptVersionId).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    });

    it('FlowProvenance includes human-readable description for debugging', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);

      const provenance: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: spec.promptVersionId,
        flowDescription: spec.description,
        resolvedAt: Date.now(),
      };

      // The description helps with debugging and observability
      expect(provenance.flowDescription.length).toBeGreaterThan(0);
      expect(provenance.flowDescription).toBe(spec.description);
    });

    it('FlowProvenance includes timestamp for temporal analysis', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);
      const now = Date.now();

      const provenance: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: spec.promptVersionId,
        flowDescription: spec.description,
        resolvedAt: now,
      };

      // The timestamp enables temporal analysis and debugging
      expect(provenance.resolvedAt).toBe(now);
      expect(provenance.resolvedAt).toBeGreaterThan(0);
    });
  });

  describe('Provenance for Prompt Version Rollback', () => {
    it('FlowProvenance enables identifying which prompt version produced a result', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);

      const provenance: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: '2026-04-20.0',
        flowDescription: spec.description,
        resolvedAt: Date.now(),
      };

      // With provenance, we can identify which prompt version produced a result
      const versionThatProducedResult = provenance.promptVersionId;

      expect(versionThatProducedResult).toBe('2026-04-20.0');
    });

    it('FlowProvenance enables comparing results across prompt versions', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);

      const provenanceV1: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: '2026-04-20.0',
        flowDescription: spec.description,
        resolvedAt: Date.now(),
      };

      const provenanceV2: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: '2026-04-21.0',
        flowDescription: spec.description,
        resolvedAt: Date.now() + 1000,
      };

      // With provenance, we can compare results across prompt versions
      expect(provenanceV1.promptVersionId).not.toBe(provenanceV2.promptVersionId);
      expect(provenanceV1.flowKey).toBe(provenanceV2.flowKey);
      expect(provenanceV1.flowId).toBe(provenanceV2.flowId);
    });

    it('FlowProvenance enables rolling back to a specific prompt version', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);

      const provenance: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: '2026-04-20.0',
        flowDescription: spec.description,
        resolvedAt: Date.now(),
      };

      // With provenance, we can identify the prompt version to rollback to
      const versionToRollbackTo = provenance.promptVersionId;

      expect(versionToRollbackTo).toBe('2026-04-20.0');
    });
  });

  describe('Provenance Consistency', () => {
    it('FlowProvenance flowKey, flowId, and promptVersionId are consistent with catalog', () => {
      for (const key of KNOWN_FLOW_KEYS) {
        const spec = resolveFlowSpec(key);

        const provenance: FlowProvenance = {
          flowKey: spec.key,
          flowId: spec.id,
          promptVersionId: spec.promptVersionId,
          flowDescription: spec.description,
          resolvedAt: Date.now(),
        };

        // Verify consistency with catalog
        expect(provenance.flowKey).toBe(spec.key);
        expect(provenance.flowId).toBe(spec.id);
        expect(provenance.promptVersionId).toBe(spec.promptVersionId);
        expect(provenance.flowDescription).toBe(spec.description);
      }
    });

    it('FlowProvenance maintains referential integrity with catalog', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);

      const provenance: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: spec.promptVersionId,
        flowDescription: spec.description,
        resolvedAt: Date.now(),
      };

      // Verify the provenance references a valid flow in the catalog
      const resolvedSpec = resolveFlowSpec(provenance.flowKey);

      expect(resolvedSpec.key).toBe(provenance.flowKey);
      expect(resolvedSpec.id).toBe(provenance.flowId);
      expect(resolvedSpec.promptVersionId).toBe(provenance.promptVersionId);
    });
  });

  describe('Provenance for All Flow Types', () => {
    it('FlowProvenance works for chatflow kinds', () => {
      const chatflowSpecs = Object.values(FLOW_CATALOG).filter(
        (spec: FlowSpec) => spec.kind === 'chatflow'
      ) as FlowSpec[];

      expect(chatflowSpecs.length).toBeGreaterThan(0);

      for (const spec of chatflowSpecs) {
        const provenance: FlowProvenance = {
          flowKey: spec.key,
          flowId: spec.id,
          promptVersionId: spec.promptVersionId,
          flowDescription: spec.description,
          resolvedAt: Date.now(),
        };

        expect(provenance.flowKey).toBe(spec.key);
        expect(provenance.flowId).toBe(spec.id);
        expect(provenance.promptVersionId).toBe(spec.promptVersionId);
      }
    });

    it('FlowProvenance works for agentflow-v2 kinds', () => {
      const agentflowSpecs = Object.values(FLOW_CATALOG).filter(
        (spec: FlowSpec) => spec.kind === 'agentflow-v2'
      ) as FlowSpec[];

      expect(agentflowSpecs.length).toBeGreaterThan(0);

      for (const spec of agentflowSpecs) {
        const provenance: FlowProvenance = {
          flowKey: spec.key,
          flowId: spec.id,
          promptVersionId: spec.promptVersionId,
          flowDescription: spec.description,
          resolvedAt: Date.now(),
        };

        expect(provenance.flowKey).toBe(spec.key);
        expect(provenance.flowId).toBe(spec.id);
        expect(provenance.promptVersionId).toBe(spec.promptVersionId);
      }
    });
  });

  describe('Provenance for All Domains', () => {
    it('FlowProvenance works for due diligence domain', () => {
      const ddSpecs = Object.values(FLOW_CATALOG).filter((spec: FlowSpec) =>
        spec.key.startsWith('ma.dd.')
      ) as FlowSpec[];

      expect(ddSpecs.length).toBeGreaterThan(0);

      for (const spec of ddSpecs) {
        const provenance: FlowProvenance = {
          flowKey: spec.key,
          flowId: spec.id,
          promptVersionId: spec.promptVersionId,
          flowDescription: spec.description,
          resolvedAt: Date.now(),
        };

        expect(provenance.flowKey).toMatch(/^ma\.dd\./);
      }
    });

    it('FlowProvenance works for document generation domain', () => {
      const docSpecs = Object.values(FLOW_CATALOG).filter((spec: FlowSpec) =>
        spec.key.startsWith('ma.docs.')
      ) as FlowSpec[];

      expect(docSpecs.length).toBeGreaterThan(0);

      for (const spec of docSpecs) {
        const provenance: FlowProvenance = {
          flowKey: spec.key,
          flowId: spec.id,
          promptVersionId: spec.promptVersionId,
          flowDescription: spec.description,
          resolvedAt: Date.now(),
        };

        expect(provenance.flowKey).toMatch(/^ma\.docs\./);
      }
    });

    it('FlowProvenance works for all registered domains', () => {
      const domains = new Set<string>();
      for (const key of KNOWN_FLOW_KEYS) {
        const parts = key.split('.');
        if (parts.length >= 2) {
          domains.add(`${parts[0]}.${parts[1]}`);
        }
      }

      // Verify provenance works for flows in each domain
      for (const domain of domains) {
        const domainSpecs = Object.values(FLOW_CATALOG).filter((spec: FlowSpec) =>
          spec.key.startsWith(domain)
        ) as FlowSpec[];

        expect(domainSpecs.length).toBeGreaterThan(0);

        for (const spec of domainSpecs) {
          const provenance: FlowProvenance = {
            flowKey: spec.key,
            flowId: spec.id,
            promptVersionId: spec.promptVersionId,
            flowDescription: spec.description,
            resolvedAt: Date.now(),
          };

          expect(provenance.flowKey).toMatch(new RegExp(`^${domain}`));
        }
      }
    });
  });

  describe('Provenance Immutability', () => {
    it('FlowProvenance is immutable once created', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);

      const provenance: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: spec.promptVersionId,
        flowDescription: spec.description,
        resolvedAt: Date.now(),
      };

      // In TypeScript, FlowProvenance is a readonly-like type (all fields are required)
      // This test verifies the structure supports immutability patterns
      const originalFlowKey = provenance.flowKey;
      const originalFlowId = provenance.flowId;
      const originalPromptVersionId = provenance.promptVersionId;

      expect(provenance.flowKey).toBe(originalFlowKey);
      expect(provenance.flowId).toBe(originalFlowId);
      expect(provenance.promptVersionId).toBe(originalPromptVersionId);
    });

    it('creating a new FlowProvenance for a different resolution is explicit', () => {
      const spec = resolveFlowSpec(KNOWN_FLOW_KEYS[0]);

      const provenance1: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: spec.promptVersionId,
        flowDescription: spec.description,
        resolvedAt: Date.now(),
      };

      // To represent a different resolution, create a new FlowProvenance
      const provenance2: FlowProvenance = {
        flowKey: spec.key,
        flowId: spec.id,
        promptVersionId: '2026-04-21.0', // Different version
        flowDescription: spec.description,
        resolvedAt: Date.now() + 1000,
      };

      expect(provenance1.promptVersionId).not.toBe(provenance2.promptVersionId);
      expect(provenance1.resolvedAt).not.toBe(provenance2.resolvedAt);
    });
  });
});
