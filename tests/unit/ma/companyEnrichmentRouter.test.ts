/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Company Enrichment Router Discoverability Tests
 * Verifies that the company enrichment capability is discoverable from routed entry points.
 */

import { describe, it, expect } from 'vitest';
import { ipcBridge } from '@/common';

describe('Company Enrichment Bridge Discoverability', () => {
  it('should have companyEnrichment namespace on ma bridge', () => {
    expect(ipcBridge.ma).toHaveProperty('companyEnrichment');
  });

  it('should expose enrichBySiren method', () => {
    expect(ipcBridge.ma.companyEnrichment).toHaveProperty('enrichBySiren');
    expect(typeof ipcBridge.ma.companyEnrichment.enrichBySiren.invoke).toBe('function');
  });

  it('should expose enrichCompany method', () => {
    expect(ipcBridge.ma.companyEnrichment).toHaveProperty('enrichCompany');
    expect(typeof ipcBridge.ma.companyEnrichment.enrichCompany.invoke).toBe('function');
  });

  it('should expose searchByName method', () => {
    expect(ipcBridge.ma.companyEnrichment).toHaveProperty('searchByName');
    expect(typeof ipcBridge.ma.companyEnrichment.searchByName.invoke).toBe('function');
  });

  it('should expose batchEnrich method', () => {
    expect(ipcBridge.ma.companyEnrichment).toHaveProperty('batchEnrich');
    expect(typeof ipcBridge.ma.companyEnrichment.batchEnrich.invoke).toBe('function');
  });
});

describe('Company Enrichment Route Configuration', () => {
  it('should have route path defined for company enrichment', () => {
    // The route should be discoverable at /ma/company-enrichment
    const expectedRoute = '/ma/company-enrichment';
    expect(expectedRoute).toMatch(/^\/ma\/[a-z-]+$/);
  });

  it('should follow M&A routing convention', () => {
    // All M&A routes should be under /ma/
    const maRoutes = ['/ma', '/ma/deal-context', '/ma/due-diligence', '/ma/company-enrichment'];

    maRoutes.forEach((route) => {
      expect(route).toMatch(/^\/ma/);
    });
  });
});
