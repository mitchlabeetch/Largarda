/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ContactService Unit Tests
 * Tests the ContactService business logic layer.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContactService } from '@process/services/ma/ContactService';
import type { Contact, CreateContactInput, UpdateContactInput } from '@/common/ma/contact/schema';

// Mock the repository
vi.mock('@process/services/database/repositories/ma/ContactRepository', () => ({
  getContactRepository: () => ({
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    listByCompany: vi.fn(),
    listByDeal: vi.fn(),
    deleteByCompany: vi.fn(),
    deleteByDeal: vi.fn(),
  }),
}));

describe('ContactService', () => {
  let service: ContactService;
  let mockRepository: any;

  beforeEach(() => {
    const { getContactRepository } = require('@process/services/database/repositories/ma/ContactRepository');
    mockRepository = getContactRepository();
    service = new ContactService();
    // Replace the repository with the mock
    (service as any).repository = mockRepository;
  });

  describe('createContact', () => {
    it('should create a contact with valid input', async () => {
      const input: CreateContactInput = {
        fullName: 'John Doe',
        email: 'john@example.com',
        role: 'CEO',
      };

      const expectedContact: Contact = {
        id: 'contact_123',
        fullName: 'John Doe',
        email: 'john@example.com',
        role: 'CEO',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRepository.create.mockResolvedValue({ success: true, data: expectedContact });

      const result = await service.createContact(input);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedContact);
      expect(mockRepository.create).toHaveBeenCalledWith(input);
    });

    it('should reject invalid email format', async () => {
      const input: CreateContactInput = {
        fullName: 'John Doe',
        email: 'invalid-email',
      };

      const result = await service.createContact(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email format');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject invalid LinkedIn URL format', async () => {
      const input: CreateContactInput = {
        fullName: 'John Doe',
        linkedinUrl: 'not-a-url',
      };

      const result = await service.createContact(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid LinkedIn URL format');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject empty full name', async () => {
      const input: CreateContactInput = {
        fullName: '   ',
      };

      const result = await service.createContact(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Full name is required');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateContact', () => {
    it('should update a contact with valid input', async () => {
      const id = 'contact_123';
      const updates: UpdateContactInput = {
        email: 'newemail@example.com',
      };

      const expectedContact: Contact = {
        id,
        fullName: 'John Doe',
        email: 'newemail@example.com',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRepository.update.mockResolvedValue({ success: true, data: expectedContact });

      const result = await service.updateContact(id, updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedContact);
      expect(mockRepository.update).toHaveBeenCalledWith(id, updates);
    });

    it('should reject invalid email format on update', async () => {
      const id = 'contact_123';
      const updates: UpdateContactInput = {
        email: 'invalid-email',
      };

      const result = await service.updateContact(id, updates);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email format');
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('getContact', () => {
    it('should get a contact by ID', async () => {
      const id = 'contact_123';
      const expectedContact: Contact = {
        id,
        fullName: 'John Doe',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRepository.get.mockResolvedValue({ success: true, data: expectedContact });

      const result = await service.getContact(id);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedContact);
      expect(mockRepository.get).toHaveBeenCalledWith(id);
    });

    it('should return null for non-existent contact', async () => {
      const id = 'nonexistent';
      mockRepository.get.mockResolvedValue({ success: true, data: null });

      const result = await service.getContact(id);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('deleteContact', () => {
    it('should delete a contact', async () => {
      const id = 'contact_123';
      mockRepository.delete.mockResolvedValue({ success: true, data: true });

      const result = await service.deleteContact(id);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith(id);
    });
  });

  describe('listContactsByCompany', () => {
    it('should list contacts for a company', async () => {
      const companyId = 'company_123';
      const expectedContacts: Contact[] = [
        {
          id: 'contact_1',
          companyId,
          fullName: 'John Doe',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      mockRepository.listByCompany.mockResolvedValue({
        success: true,
        data: expectedContacts,
        total: 1,
        page: 0,
        pageSize: 50,
        hasMore: false,
      });

      const result = await service.listContactsByCompany(companyId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedContacts);
      expect(mockRepository.listByCompany).toHaveBeenCalledWith(companyId, 0, 50);
    });
  });

  describe('listContactsByDeal', () => {
    it('should list contacts for a deal', async () => {
      const dealId = 'deal_123';
      const expectedContacts: Contact[] = [
        {
          id: 'contact_1',
          dealId,
          fullName: 'John Doe',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      mockRepository.listByDeal.mockResolvedValue({
        success: true,
        data: expectedContacts,
        total: 1,
        page: 0,
        pageSize: 50,
        hasMore: false,
      });

      const result = await service.listContactsByDeal(dealId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedContacts);
      expect(mockRepository.listByDeal).toHaveBeenCalledWith(dealId, 0, 50);
    });
  });

  describe('deleteContactsByCompany', () => {
    it('should delete all contacts for a company', async () => {
      const companyId = 'company_123';
      mockRepository.deleteByCompany.mockResolvedValue({ success: true, data: 5 });

      const result = await service.deleteContactsByCompany(companyId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
      expect(mockRepository.deleteByCompany).toHaveBeenCalledWith(companyId);
    });
  });

  describe('deleteContactsByDeal', () => {
    it('should delete all contacts for a deal', async () => {
      const dealId = 'deal_123';
      mockRepository.deleteByDeal.mockResolvedValue({ success: true, data: 3 });

      const result = await service.deleteContactsByDeal(dealId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(3);
      expect(mockRepository.deleteByDeal).toHaveBeenCalledWith(dealId);
    });
  });
});
