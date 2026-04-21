/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for datagouvClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DatagouvClient, getDatagouvClient } from '../../../src/process/services/data/datagouvClient';
import { getDatagouvCacheRepository } from '../../../src/process/services/database/repositories/ma/DatagouvCacheRepository';

// Mock fetch
global.fetch = vi.fn() as any;

// Mock cache repository
const mockCacheRepo = {
  get: vi.fn(),
  create: vi.fn(),
  deleteByApiSurface: vi.fn(),
  deleteExpired: vi.fn(),
  clear: vi.fn(),
  getStatistics: vi.fn(),
};

vi.mock('../../../src/process/services/database/repositories/ma/DatagouvCacheRepository', () => ({
  getDatagouvCacheRepository: vi.fn(() => mockCacheRepo),
}));

describe('DatagouvClient', () => {
  let client: DatagouvClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheRepo.get.mockResolvedValue({ success: false });
    mockCacheRepo.create.mockResolvedValue({ success: true });
    client = new DatagouvClient({ timeout: 5000 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      const defaultClient = new DatagouvClient();
      expect(defaultClient).toBeInstanceOf(DatagouvClient);
    });

    it('should create client with custom config', () => {
      const customClient = new DatagouvClient({
        baseUrl: 'https://custom.api.com',
        timeout: 10000,
        apiKey: 'test-key',
      });
      expect(customClient).toBeInstanceOf(DatagouvClient);
    });
  });

  describe('API methods', () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });
    });

    it('should search datasets', async () => {
      const mockData = { data: [], total: 0, page: 1, page_size: 20 };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await client.searchDatasets({ q: 'test' });
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should get dataset by ID', async () => {
      const mockData = { id: 'test-id', title: 'Test Dataset' };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await client.getDataset('test-id');
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should list dataset resources', async () => {
      const mockResources = [{ id: 'res1', title: 'Resource 1' }];
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockResources }),
      });

      const result = await client.listDatasetResources('test-id');
      expect(result).toEqual(mockResources);
    });

    it('should query tabular data', async () => {
      const mockData = { data: [{ col1: 'val1' }], total: 1, page: 1, page_size: 100 };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await client.queryTabular({ rid: 'resource-123' });
      expect(result).toEqual(mockData);
    });

    it('should get metrics', async () => {
      const mockMetrics = { views: 100, downloads: 50 };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockMetrics,
      });

      const result = await client.getMetrics({ model: 'dataset' });
      expect(result).toEqual(mockMetrics);
    });

    it('should search dataservices', async () => {
      const mockData = { data: [], total: 0, page: 1, page_size: 20 };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await client.searchDataservices({ q: 'api' });
      expect(result).toEqual(mockData);
    });

    it('should get dataservice by ID', async () => {
      const mockData = { id: 'svc-1', title: 'API Service' };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await client.getDataservice('svc-1');
      expect(result).toEqual(mockData);
    });
  });

  describe('testConnection', () => {
    it('should return success on successful connection', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], total: 0 }),
      });

      const result = await client.testConnection();
      expect(result).toEqual({ success: true });
    });

    it('should return error on failed connection', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await client.testConnection();
      expect(result).toEqual({ success: false, error: 'Network error' });
    });
  });

  describe('clearCache', () => {
    it('should clear cache', async () => {
      await client.clearCache();
      expect(mockCacheRepo.clear).toHaveBeenCalled();
    });
  });
});

describe('getDatagouvClient', () => {
  it('should return singleton instance', () => {
    const client1 = getDatagouvClient();
    const client2 = getDatagouvClient();
    expect(client1).toBe(client2);
  });
});
