/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContactService } from '@process/services/ma/ContactService';
import type { Contact, CreateContactInput, UpdateContactInput } from '@common/ma/contact/schema';

describe('ContactService', () => {
  let mockDb: any;
  let service: ContactService;

  beforeEach(() => {
    mockDb = {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new ContactService(mockDb);
  });

  describe('create', () => {
    it('should create a contact with valid input', async () => {
      const input: CreateContactInput = {
        fullName: 'John Doe',
        email: 'john@example.com',
        companyId: 'company-123',
      };

      mockDb.insert.mockResolvedValue(undefined);

      const result = await service.create(input);

      expect(mockDb.insert).toHaveBeenCalledWith(
        'ma_contacts',
        expect.objectContaining({
          full_name: 'John Doe',
          email: 'john@example.com',
          company_id: 'company-123',
        })
      );
      expect(result.fullName).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.companyId).toBe('company-123');
      expect(result.id).toBeDefined();
    });

    it('should create contact with minimal required fields', async () => {
      const input: CreateContactInput = {
        fullName: 'Jane Smith',
      };

      mockDb.insert.mockResolvedValue(undefined);

      const result = await service.create(input);

      expect(mockDb.insert).toHaveBeenCalledWith(
        'ma_contacts',
        expect.objectContaining({
          full_name: 'Jane Smith',
          company_id: null,
          deal_id: null,
          email: null,
          phone: null,
        })
      );
      expect(result.fullName).toBe('Jane Smith');
    });
  });

  describe('getById', () => {
    it('should return contact by id', async () => {
      const mockRow = {
        id: 'contact-123',
        company_id: 'company-123',
        deal_id: 'deal-123',
        full_name: 'John Doe',
        role: 'CEO',
        email: 'john@example.com',
        phone: '+1234567890',
        linkedin_url: 'https://linkedin.com/in/john',
        notes: 'Important contact',
        created_at: 1234567890,
        updated_at: 1234567890,
      };

      mockDb.select.mockResolvedValue(mockRow);

      const result = await service.getById('contact-123');

      expect(mockDb.select).toHaveBeenCalledWith('ma_contacts', { id: 'contact-123' });
      expect(result).toEqual({
        id: 'contact-123',
        companyId: 'company-123',
        dealId: 'deal-123',
        fullName: 'John Doe',
        role: 'CEO',
        email: 'john@example.com',
        phone: '+1234567890',
        linkedinUrl: 'https://linkedin.com/in/john',
        notes: 'Important contact',
        createdAt: 1234567890,
        updatedAt: 1234567890,
      });
    });

    it('should return null if contact not found', async () => {
      mockDb.select.mockResolvedValue(null);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should return all contacts when no filters provided', async () => {
      const mockRows = [
        {
          id: 'contact-1',
          company_id: 'company-1',
          deal_id: null,
          full_name: 'John Doe',
          role: null,
          email: 'john@example.com',
          phone: null,
          linkedin_url: null,
          notes: null,
          created_at: 1234567890,
          updated_at: 1234567890,
        },
        {
          id: 'contact-2',
          company_id: 'company-2',
          deal_id: null,
          full_name: 'Jane Smith',
          role: null,
          email: 'jane@example.com',
          phone: null,
          linkedin_url: null,
          notes: null,
          created_at: 1234567891,
          updated_at: 1234567891,
        },
      ];

      mockDb.select.mockResolvedValue(mockRows);

      const result = await service.list({});

      expect(mockDb.select).toHaveBeenCalledWith('ma_contacts', {});
      expect(result).toHaveLength(2);
      expect(result[0].fullName).toBe('John Doe');
      expect(result[1].fullName).toBe('Jane Smith');
    });

    it('should filter contacts by company', async () => {
      const mockRows = [
        {
          id: 'contact-1',
          company_id: 'company-123',
          deal_id: null,
          full_name: 'John Doe',
          role: null,
          email: 'john@example.com',
          phone: null,
          linkedin_url: null,
          notes: null,
          created_at: 1234567890,
          updated_at: 1234567890,
        },
      ];

      mockDb.select.mockResolvedValue(mockRows);

      const result = await service.list({ companyId: 'company-123' });

      expect(mockDb.select).toHaveBeenCalledWith('ma_contacts', { company_id: 'company-123' });
      expect(result).toHaveLength(1);
      expect(result[0].companyId).toBe('company-123');
    });

    it('should filter contacts by deal', async () => {
      const mockRows = [
        {
          id: 'contact-1',
          company_id: null,
          deal_id: 'deal-123',
          full_name: 'John Doe',
          role: null,
          email: 'john@example.com',
          phone: null,
          linkedin_url: null,
          notes: null,
          created_at: 1234567890,
          updated_at: 1234567890,
        },
      ];

      mockDb.select.mockResolvedValue(mockRows);

      const result = await service.list({ dealId: 'deal-123' });

      expect(mockDb.select).toHaveBeenCalledWith('ma_contacts', { deal_id: 'deal-123' });
      expect(result).toHaveLength(1);
      expect(result[0].dealId).toBe('deal-123');
    });
  });

  describe('update', () => {
    it('should update contact with valid input', async () => {
      const input: UpdateContactInput = {
        fullName: 'John Updated',
        email: 'john.updated@example.com',
      };

      const mockRow = {
        id: 'contact-123',
        company_id: 'company-123',
        deal_id: null,
        full_name: 'John Updated',
        role: null,
        email: 'john.updated@example.com',
        phone: null,
        linkedin_url: null,
        notes: null,
        created_at: 1234567890,
        updated_at: 1234567890,
      };

      mockDb.select.mockResolvedValue(mockRow);
      mockDb.update.mockResolvedValue(1);

      const result = await service.update('contact-123', input);

      expect(mockDb.update).toHaveBeenCalledWith(
        'ma_contacts',
        { id: 'contact-123' },
        expect.objectContaining({
          full_name: 'John Updated',
          email: 'john.updated@example.com',
          updated_at: expect.any(Number),
        })
      );
      expect(result.fullName).toBe('John Updated');
      expect(result.email).toBe('john.updated@example.com');
    });

    it('should throw error if contact not found during update', async () => {
      const input: UpdateContactInput = { fullName: 'Updated' };

      mockDb.select.mockResolvedValue(null);

      await expect(service.update('nonexistent', input)).rejects.toThrow('Contact not found: nonexistent');
    });
  });

  describe('delete', () => {
    it('should delete contact by id', async () => {
      mockDb.delete.mockResolvedValue(1);

      await service.delete('contact-123');

      expect(mockDb.delete).toHaveBeenCalledWith('ma_contacts', { id: 'contact-123' });
    });
  });
});
