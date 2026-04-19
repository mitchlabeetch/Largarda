/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initSchema, CURRENT_DB_VERSION } from '@process/services/database/schema';
import { runMigrations } from '@process/services/database/migrations';
import { BetterSqlite3Driver } from '@process/services/database/drivers/BetterSqlite3Driver';
import type { ISqliteDriver } from '@process/services/database/drivers/ISqliteDriver';
import { DealRepository } from '@process/services/database/repositories/ma/DealRepository';
import { DocumentRepository } from '@process/services/database/repositories/ma/DocumentRepository';
import { AnalysisRepository } from '@process/services/database/repositories/ma/AnalysisRepository';
import type {
  CreateDealInput,
  CreateDocumentInput,
  CreateAnalysisInput,
  CreateRiskFindingInput,
} from '@/common/ma/types';

// Check if native module is available
let nativeModuleAvailable = true;
try {
  const d = new BetterSqlite3Driver(':memory:');
  d.close();
} catch (e) {
  nativeModuleAvailable = false;
}

const describeOrSkip = nativeModuleAvailable ? describe : describe.skip;

describeOrSkip('M&A Repositories', () => {
  let driver: ISqliteDriver;
  let dealRepo: DealRepository;
  let documentRepo: DocumentRepository;
  let analysisRepo: AnalysisRepository;

  beforeEach(async () => {
    // Create in-memory database
    driver = new BetterSqlite3Driver(':memory:');
    initSchema(driver);

    // Run migrations to create M&A tables
    runMigrations(driver, 0, CURRENT_DB_VERSION);

    // Create repository instances
    dealRepo = new DealRepository();
    documentRepo = new DocumentRepository();
    analysisRepo = new AnalysisRepository();
  });

  afterEach(() => {
    if (driver) {
      driver.close();
    }
  });

  // ============================================================================
  // DealRepository Tests
  // ============================================================================

  describe('DealRepository', () => {
    const sampleDealInput: CreateDealInput = {
      name: 'Test Acquisition',
      parties: [
        { name: 'Acquirer Corp', role: 'buyer' },
        { name: 'Target Inc', role: 'target' },
      ],
      transactionType: 'acquisition',
      targetCompany: {
        name: 'Target Inc',
        industry: 'Technology',
        jurisdiction: 'France',
        employees: 150,
        revenue: 50000000,
      },
    };

    it('should create a deal', async () => {
      const result = await dealRepo.create(sampleDealInput);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe(sampleDealInput.name);
      expect(result.data?.transactionType).toBe('acquisition');
      expect(result.data?.status).toBe('active');
      expect(result.data?.parties).toHaveLength(2);
      expect(result.data?.createdAt).toBeDefined();
      expect(result.data?.updatedAt).toBeDefined();
    });

    it('should get a deal by ID', async () => {
      const createResult = await dealRepo.create(sampleDealInput);
      const dealId = createResult.data!.id;

      const result = await dealRepo.get(dealId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(dealId);
      expect(result.data?.name).toBe(sampleDealInput.name);
    });

    it('should return null for non-existent deal', async () => {
      const result = await dealRepo.get('non-existent-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should update a deal', async () => {
      const createResult = await dealRepo.create(sampleDealInput);
      const dealId = createResult.data!.id;

      const result = await dealRepo.update(dealId, {
        name: 'Updated Deal Name',
        status: 'archived',
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Updated Deal Name');
      expect(result.data?.status).toBe('archived');
    });

    it('should delete a deal', async () => {
      const createResult = await dealRepo.create(sampleDealInput);
      const dealId = createResult.data!.id;

      const deleteResult = await dealRepo.delete(dealId);
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.data).toBe(true);

      const getResult = await dealRepo.get(dealId);
      expect(getResult.data).toBeNull();
    });

    it('should list deals', async () => {
      await dealRepo.create(sampleDealInput);
      await dealRepo.create({ ...sampleDealInput, name: 'Second Deal' });

      const result = await dealRepo.list();

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should list deals with status filter', async () => {
      await dealRepo.create(sampleDealInput);
      const archivedDeal = await dealRepo.create({ ...sampleDealInput, name: 'Archived Deal' });
      await dealRepo.archive(archivedDeal.data!.id);

      const result = await dealRepo.list({ status: 'active' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('active');
    });

    it('should get active deals', async () => {
      await dealRepo.create(sampleDealInput);
      const archivedDeal = await dealRepo.create({ ...sampleDealInput, name: 'Archived Deal' });
      await dealRepo.archive(archivedDeal.data!.id);

      const result = await dealRepo.getActiveDeals();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should archive a deal', async () => {
      const createResult = await dealRepo.create(sampleDealInput);
      const dealId = createResult.data!.id;

      const result = await dealRepo.archive(dealId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('archived');
    });

    it('should close a deal', async () => {
      const createResult = await dealRepo.create(sampleDealInput);
      const dealId = createResult.data!.id;

      const result = await dealRepo.close(dealId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('closed');
    });

    it('should reactivate an archived deal', async () => {
      const createResult = await dealRepo.create(sampleDealInput);
      const dealId = createResult.data!.id;
      await dealRepo.archive(dealId);

      const result = await dealRepo.reactivate(dealId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('active');
    });
  });

  // ============================================================================
  // DocumentRepository Tests
  // ============================================================================

  describe('DocumentRepository', () => {
    let dealId: string;

    beforeEach(async () => {
      const dealResult = await dealRepo.create({
        name: 'Test Deal',
        parties: [{ name: 'Buyer', role: 'buyer' }],
        transactionType: 'acquisition',
        targetCompany: { name: 'Target' },
      });
      dealId = dealResult.data!.id;
    });

    const sampleDocInput: CreateDocumentInput = {
      dealId: '',
      filename: 'test-document.pdf',
      originalPath: '/path/to/test-document.pdf',
      format: 'pdf',
      size: 1024000,
      metadata: {
        title: 'Test Document',
        documentType: 'financial_statement',
      },
    };

    it('should create a document', async () => {
      const result = await documentRepo.create({ ...sampleDocInput, dealId });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.filename).toBe(sampleDocInput.filename);
      expect(result.data?.status).toBe('pending');
    });

    it('should get a document by ID', async () => {
      const createResult = await documentRepo.create({ ...sampleDocInput, dealId });
      const docId = createResult.data!.id;

      const result = await documentRepo.get(docId);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(docId);
    });

    it('should update a document', async () => {
      const createResult = await documentRepo.create({ ...sampleDocInput, dealId });
      const docId = createResult.data!.id;

      const result = await documentRepo.update(docId, {
        status: 'completed',
        textContent: 'Extracted text content',
      });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('completed');
      expect(result.data?.textContent).toBe('Extracted text content');
    });

    it('should delete a document', async () => {
      const createResult = await documentRepo.create({ ...sampleDocInput, dealId });
      const docId = createResult.data!.id;

      const deleteResult = await documentRepo.delete(docId);
      expect(deleteResult.success).toBe(true);
      expect(deleteResult.data).toBe(true);

      const getResult = await documentRepo.get(docId);
      expect(getResult.data).toBeNull();
    });

    it('should list documents by deal', async () => {
      await documentRepo.create({ ...sampleDocInput, dealId, filename: 'doc1.pdf' });
      await documentRepo.create({ ...sampleDocInput, dealId, filename: 'doc2.pdf' });

      const result = await documentRepo.listByDeal(dealId);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should list documents by status', async () => {
      await documentRepo.create({ ...sampleDocInput, dealId });
      const doc2 = await documentRepo.create({ ...sampleDocInput, dealId, filename: 'doc2.pdf' });
      await documentRepo.markCompleted(doc2.data!.id, 'text', []);

      const result = await documentRepo.listByStatus('pending');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('pending');
    });

    it('should mark document as processing', async () => {
      const createResult = await documentRepo.create({ ...sampleDocInput, dealId });
      const docId = createResult.data!.id;

      const result = await documentRepo.markProcessing(docId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('processing');
    });

    it('should mark document as completed', async () => {
      const createResult = await documentRepo.create({ ...sampleDocInput, dealId });
      const docId = createResult.data!.id;

      const result = await documentRepo.markCompleted(docId, 'Extracted text', [
        { id: 'chunk1', text: 'chunk text', position: { start: 0, end: 10 } },
      ]);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('completed');
      expect(result.data?.textContent).toBe('Extracted text');
      expect(result.data?.chunks).toHaveLength(1);
    });

    it('should mark document as error', async () => {
      const createResult = await documentRepo.create({ ...sampleDocInput, dealId });
      const docId = createResult.data!.id;

      const result = await documentRepo.markError(docId, 'Failed to extract text');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('error');
      expect(result.data?.error).toBe('Failed to extract text');
    });

    it('should delete all documents for a deal', async () => {
      await documentRepo.create({ ...sampleDocInput, dealId, filename: 'doc1.pdf' });
      await documentRepo.create({ ...sampleDocInput, dealId, filename: 'doc2.pdf' });

      const result = await documentRepo.deleteByDeal(dealId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);

      const listResult = await documentRepo.listByDeal(dealId);
      expect(listResult.data).toHaveLength(0);
    });
  });

  // ============================================================================
  // AnalysisRepository Tests
  // ============================================================================

  describe('AnalysisRepository', () => {
    let dealId: string;

    beforeEach(async () => {
      const dealResult = await dealRepo.create({
        name: 'Test Deal',
        parties: [{ name: 'Buyer', role: 'buyer' }],
        transactionType: 'acquisition',
        targetCompany: { name: 'Target' },
      });
      dealId = dealResult.data!.id;
    });

    const sampleAnalysisInput: CreateAnalysisInput = {
      dealId: '',
      type: 'due_diligence',
      input: {
        documentIds: ['doc1', 'doc2'],
        analysisTypes: ['due_diligence'],
      },
    };

    it('should create an analysis', async () => {
      const result = await analysisRepo.create({ ...sampleAnalysisInput, dealId });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.type).toBe('due_diligence');
      expect(result.data?.status).toBe('pending');
    });

    it('should get an analysis by ID', async () => {
      const createResult = await analysisRepo.create({ ...sampleAnalysisInput, dealId });
      const analysisId = createResult.data!.id;

      const result = await analysisRepo.get(analysisId);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(analysisId);
    });

    it('should update an analysis', async () => {
      const createResult = await analysisRepo.create({ ...sampleAnalysisInput, dealId });
      const analysisId = createResult.data!.id;

      const result = await analysisRepo.update(analysisId, {
        status: 'completed',
        result: { risks: [], summary: 'Analysis complete' },
      });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('completed');
      expect(result.data?.result).toBeDefined();
    });

    it('should delete an analysis', async () => {
      const createResult = await analysisRepo.create({ ...sampleAnalysisInput, dealId });
      const analysisId = createResult.data!.id;

      const deleteResult = await analysisRepo.delete(analysisId);
      expect(deleteResult.success).toBe(true);

      const getResult = await analysisRepo.get(analysisId);
      expect(getResult.data).toBeNull();
    });

    it('should list analyses by deal', async () => {
      await analysisRepo.create({ ...sampleAnalysisInput, dealId });
      await analysisRepo.create({ ...sampleAnalysisInput, dealId, type: 'risk_assessment' });

      const result = await analysisRepo.listByDeal(dealId);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should list analyses by type', async () => {
      await analysisRepo.create({ ...sampleAnalysisInput, dealId });
      await analysisRepo.create({ ...sampleAnalysisInput, dealId, type: 'risk_assessment' });

      const result = await analysisRepo.listByType('due_diligence');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('due_diligence');
    });

    it('should mark analysis as running', async () => {
      const createResult = await analysisRepo.create({ ...sampleAnalysisInput, dealId });
      const analysisId = createResult.data!.id;

      const result = await analysisRepo.markRunning(analysisId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('running');
    });

    it('should mark analysis as completed', async () => {
      const createResult = await analysisRepo.create({ ...sampleAnalysisInput, dealId });
      const analysisId = createResult.data!.id;

      const result = await analysisRepo.markCompleted(analysisId, { summary: 'Done' });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('completed');
      expect(result.data?.completedAt).toBeDefined();
    });

    it('should mark analysis as error', async () => {
      const createResult = await analysisRepo.create({ ...sampleAnalysisInput, dealId });
      const analysisId = createResult.data!.id;

      const result = await analysisRepo.markError(analysisId, 'Analysis failed');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('error');
      expect(result.data?.error).toBe('Analysis failed');
    });

    // Risk Findings Tests

    describe('Risk Findings', () => {
      let analysisId: string;

      beforeEach(async () => {
        const analysisResult = await analysisRepo.create({ ...sampleAnalysisInput, dealId });
        analysisId = analysisResult.data!.id;
      });

      const sampleRiskInput: CreateRiskFindingInput = {
        analysisId: '',
        category: 'financial',
        severity: 'high',
        score: 75,
        title: 'Revenue Decline Risk',
        description: 'Revenue has declined 15% year-over-year',
        evidence: 'Financial statements show declining trend',
        recommendation: 'Investigate root cause of revenue decline',
      };

      it('should create a risk finding', async () => {
        const result = await analysisRepo.createRiskFinding({ ...sampleRiskInput, analysisId });

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.category).toBe('financial');
        expect(result.data?.severity).toBe('high');
        expect(result.data?.score).toBe(75);
      });

      it('should get risk findings for an analysis', async () => {
        await analysisRepo.createRiskFinding({ ...sampleRiskInput, analysisId });
        await analysisRepo.createRiskFinding({
          ...sampleRiskInput,
          analysisId,
          category: 'legal',
          title: 'Legal Risk',
        });

        const result = await analysisRepo.getRiskFindings(analysisId);

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
      });

      it('should get risk findings by category', async () => {
        await analysisRepo.createRiskFinding({ ...sampleRiskInput, analysisId });
        await analysisRepo.createRiskFinding({
          ...sampleRiskInput,
          analysisId,
          category: 'legal',
        });

        const result = await analysisRepo.getRiskFindingsByCategory(analysisId, 'financial');

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].category).toBe('financial');
      });

      it('should get risk findings by severity', async () => {
        await analysisRepo.createRiskFinding({ ...sampleRiskInput, analysisId });
        await analysisRepo.createRiskFinding({
          ...sampleRiskInput,
          analysisId,
          severity: 'low',
        });

        const result = await analysisRepo.getRiskFindingsBySeverity(analysisId, 'high');

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].severity).toBe('high');
      });

      it('should delete a risk finding', async () => {
        const createResult = await analysisRepo.createRiskFinding({ ...sampleRiskInput, analysisId });
        const riskId = createResult.data!.id;

        const deleteResult = await analysisRepo.deleteRiskFinding(riskId);
        expect(deleteResult.success).toBe(true);

        const findings = await analysisRepo.getRiskFindings(analysisId);
        expect(findings.data).toHaveLength(0);
      });

      it('should delete all risk findings for an analysis', async () => {
        await analysisRepo.createRiskFinding({ ...sampleRiskInput, analysisId });
        await analysisRepo.createRiskFinding({
          ...sampleRiskInput,
          analysisId,
          category: 'legal',
        });

        const result = await analysisRepo.deleteRiskFindingsByAnalysis(analysisId);

        expect(result.success).toBe(true);
        expect(result.data).toBe(2);

        const findings = await analysisRepo.getRiskFindings(analysisId);
        expect(findings.data).toHaveLength(0);
      });

      it('should batch create risk findings', async () => {
        const inputs: CreateRiskFindingInput[] = [
          { ...sampleRiskInput, analysisId, title: 'Risk 1' },
          { ...sampleRiskInput, analysisId, title: 'Risk 2', category: 'legal' },
          { ...sampleRiskInput, analysisId, title: 'Risk 3', category: 'operational' },
        ];

        const result = await analysisRepo.createRiskFindings(inputs);

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(3);

        const findings = await analysisRepo.getRiskFindings(analysisId);
        expect(findings.data).toHaveLength(3);
      });
    });
  });

  // ============================================================================
  // Foreign Key Constraint Tests
  // ============================================================================

  describe('Foreign Key Constraints', () => {
    it('should cascade delete documents when deal is deleted', async () => {
      const dealResult = await dealRepo.create({
        name: 'Test Deal',
        parties: [{ name: 'Buyer', role: 'buyer' }],
        transactionType: 'acquisition',
        targetCompany: { name: 'Target' },
      });
      const dealId = dealResult.data!.id;

      await documentRepo.create({
        dealId,
        filename: 'doc1.pdf',
        originalPath: '/path/doc1.pdf',
        format: 'pdf',
        size: 1000,
      });

      await dealRepo.delete(dealId);

      const docs = await documentRepo.listByDeal(dealId);
      expect(docs.data).toHaveLength(0);
    });

    it('should cascade delete analyses when deal is deleted', async () => {
      const dealResult = await dealRepo.create({
        name: 'Test Deal',
        parties: [{ name: 'Buyer', role: 'buyer' }],
        transactionType: 'acquisition',
        targetCompany: { name: 'Target' },
      });
      const dealId = dealResult.data!.id;

      await analysisRepo.create({
        dealId,
        type: 'due_diligence',
        input: { documentIds: [], analysisTypes: [] },
      });

      await dealRepo.delete(dealId);

      const analyses = await analysisRepo.listByDeal(dealId);
      expect(analyses.data).toHaveLength(0);
    });

    it('should cascade delete risk findings when analysis is deleted', async () => {
      const dealResult = await dealRepo.create({
        name: 'Test Deal',
        parties: [{ name: 'Buyer', role: 'buyer' }],
        transactionType: 'acquisition',
        targetCompany: { name: 'Target' },
      });
      const dealId = dealResult.data!.id;

      const analysisResult = await analysisRepo.create({
        dealId,
        type: 'due_diligence',
        input: { documentIds: [], analysisTypes: [] },
      });
      const analysisId = analysisResult.data!.id;

      await analysisRepo.createRiskFinding({
        analysisId,
        category: 'financial',
        severity: 'high',
        score: 80,
        title: 'Test Risk',
        description: 'Test description',
      });

      await analysisRepo.delete(analysisId);

      const findings = await analysisRepo.getRiskFindings(analysisId);
      expect(findings.data).toHaveLength(0);
    });
  });
});
