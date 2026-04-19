/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * M&A IPC Bridge
 * Provides IPC handlers for all M&A operations including deals, documents, and analyses.
 */

import { ipcBridge } from '@/common';
import type {
  DealContext,
  CreateDealInput,
  UpdateDealInput,
  MaDocument,
  CreateDocumentInput,
  UpdateDocumentInput,
  MaAnalysis,
  CreateAnalysisInput,
  UpdateAnalysisInput,
  RiskFinding,
  CreateRiskFindingInput,
  FlowiseSession,
  CreateFlowiseSessionInput,
} from '@/common/ma/types';
import { DealRepository } from '@process/services/database/repositories/ma/DealRepository';
import { DocumentRepository } from '@process/services/database/repositories/ma/DocumentRepository';
import { AnalysisRepository } from '@process/services/database/repositories/ma/AnalysisRepository';

// Repository instances
let dealRepo: DealRepository | null = null;
let documentRepo: DocumentRepository | null = null;
let analysisRepo: AnalysisRepository | null = null;

function getDealRepo(): DealRepository {
  if (!dealRepo) {
    dealRepo = new DealRepository();
  }
  return dealRepo;
}

function getDocumentRepo(): DocumentRepository {
  if (!documentRepo) {
    documentRepo = new DocumentRepository();
  }
  return documentRepo;
}

function getAnalysisRepo(): AnalysisRepository {
  if (!analysisRepo) {
    analysisRepo = new AnalysisRepository();
  }
  return analysisRepo;
}

/**
 * Initialize M&A IPC Bridge handlers.
 */
export function initMaBridge(): void {
  // ============================================================================
  // Deal Operations
  // ============================================================================

  // Create a new deal
  ipcBridge.ma.deal.create.provider(async (params): Promise<DealContext> => {
    const input = params as CreateDealInput;
    const result = await getDealRepo().create(input);
    if (!result.success || !result.data) {
      throw new Error(result.error ?? 'Failed to create deal');
    }
    return result.data;
  });

  // Get a deal by ID
  ipcBridge.ma.deal.get.provider(async (params): Promise<DealContext | null> => {
    const { id } = params as { id: string };
    const result = await getDealRepo().get(id);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to get deal');
    }
    return result.data;
  });

  // Update a deal
  ipcBridge.ma.deal.update.provider(async (params): Promise<DealContext | null> => {
    const { id, updates } = params as { id: string; updates: UpdateDealInput };
    const result = await getDealRepo().update(id, updates);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to update deal');
    }
    return result.data ?? null;
  });

  // Delete a deal
  ipcBridge.ma.deal.delete.provider(async (params): Promise<boolean> => {
    const { id } = params as { id: string };
    const result = await getDealRepo().delete(id);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to delete deal');
    }
    return result.data;
  });

  // List all deals
  ipcBridge.ma.deal.list.provider(async (params): Promise<DealContext[]> => {
    const { status } = params as { status?: string };
    const result = await getDealRepo().list(status ? { status } : undefined);
    return result.data;
  });

  // Get active deals
  ipcBridge.ma.deal.listActive.provider(async (): Promise<DealContext[]> => {
    const result = await getDealRepo().getActiveDeals();
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to list active deals');
    }
    return result.data;
  });

  // Archive a deal
  ipcBridge.ma.deal.archive.provider(async (params): Promise<DealContext | null> => {
    const { id } = params as { id: string };
    const result = await getDealRepo().archive(id);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to archive deal');
    }
    return result.data ?? null;
  });

  // ============================================================================
  // Document Operations
  // ============================================================================

  // Create a new document
  ipcBridge.ma.document.create.provider(async (params): Promise<MaDocument> => {
    const input = params as CreateDocumentInput;
    const result = await getDocumentRepo().create(input);
    if (!result.success || !result.data) {
      throw new Error(result.error ?? 'Failed to create document');
    }
    return result.data;
  });

  // Get a document by ID
  ipcBridge.ma.document.get.provider(async (params): Promise<MaDocument | null> => {
    const { id } = params as { id: string };
    const result = await getDocumentRepo().get(id);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to get document');
    }
    return result.data;
  });

  // Update a document
  ipcBridge.ma.document.update.provider(async (params): Promise<MaDocument | null> => {
    const { id, updates } = params as { id: string; updates: UpdateDocumentInput };
    const result = await getDocumentRepo().update(id, updates);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to update document');
    }
    return result.data ?? null;
  });

  // Delete a document
  ipcBridge.ma.document.delete.provider(async (params): Promise<boolean> => {
    const { id } = params as { id: string };
    const result = await getDocumentRepo().delete(id);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to delete document');
    }
    return result.data;
  });

  // List documents by deal
  ipcBridge.ma.document.listByDeal.provider(async (params): Promise<MaDocument[]> => {
    const { dealId } = params as { dealId: string };
    const result = await getDocumentRepo().listByDeal(dealId);
    return result.data;
  });

  // Update document status
  ipcBridge.ma.document.updateStatus.provider(async (params): Promise<MaDocument | null> => {
    const { id, status, error } = params as {
      id: string;
      status: string;
      error?: string;
    };
    const result = await getDocumentRepo().update(id, { status: status as any, error });
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to update document status');
    }
    return result.data ?? null;
  });

  // ============================================================================
  // Analysis Operations
  // ============================================================================

  // Create a new analysis
  ipcBridge.ma.analysis.create.provider(async (params): Promise<MaAnalysis> => {
    const input = params as CreateAnalysisInput;
    const result = await getAnalysisRepo().create(input);
    if (!result.success || !result.data) {
      throw new Error(result.error ?? 'Failed to create analysis');
    }
    return result.data;
  });

  // Get an analysis by ID
  ipcBridge.ma.analysis.get.provider(async (params): Promise<MaAnalysis | null> => {
    const { id } = params as { id: string };
    const result = await getAnalysisRepo().get(id);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to get analysis');
    }
    return result.data;
  });

  // Update an analysis
  ipcBridge.ma.analysis.update.provider(async (params): Promise<MaAnalysis | null> => {
    const { id, updates } = params as { id: string; updates: UpdateAnalysisInput };
    const result = await getAnalysisRepo().update(id, updates);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to update analysis');
    }
    return result.data ?? null;
  });

  // Delete an analysis
  ipcBridge.ma.analysis.delete.provider(async (params): Promise<boolean> => {
    const { id } = params as { id: string };
    const result = await getAnalysisRepo().delete(id);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to delete analysis');
    }
    return result.data;
  });

  // List analyses by deal
  ipcBridge.ma.analysis.listByDeal.provider(async (params): Promise<MaAnalysis[]> => {
    const { dealId } = params as { dealId: string };
    const result = await getAnalysisRepo().listByDeal(dealId);
    return result.data;
  });

  // Update analysis status
  ipcBridge.ma.analysis.updateStatus.provider(async (params): Promise<MaAnalysis | null> => {
    const { id, status, error } = params as {
      id: string;
      status: string;
      error?: string;
    };
    const result = await getAnalysisRepo().update(id, { status: status as any, error });
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to update analysis status');
    }
    return result.data ?? null;
  });

  // ============================================================================
  // Risk Finding Operations
  // ============================================================================

  // Create a risk finding
  ipcBridge.ma.riskFinding.create.provider(async (params): Promise<RiskFinding> => {
    const input = params as CreateRiskFindingInput;
    const result = await getAnalysisRepo().createRiskFinding(input);
    if (!result.success || !result.data) {
      throw new Error(result.error ?? 'Failed to create risk finding');
    }
    return result.data;
  });

  // Get risk findings by analysis
  ipcBridge.ma.riskFinding.listByAnalysis.provider(async (params): Promise<RiskFinding[]> => {
    const { analysisId } = params as { analysisId: string };
    const result = await getAnalysisRepo().getRiskFindings(analysisId);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to get risk findings');
    }
    return result.data;
  });

  // Delete a risk finding
  ipcBridge.ma.riskFinding.delete.provider(async (params): Promise<boolean> => {
    const { id } = params as { id: string };
    const result = await getAnalysisRepo().deleteRiskFinding(id);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to delete risk finding');
    }
    return result.data;
  });

  // ============================================================================
  // Flowise Session Operations
  // ============================================================================

  // Create a Flowise session
  ipcBridge.ma.flowiseSession.create.provider(async (params): Promise<FlowiseSession> => {
    const input = params as CreateFlowiseSessionInput;
    // TODO: Implement FlowiseSessionRepository
    // For now, return a placeholder
    return {
      id: crypto.randomUUID(),
      conversationId: input.conversationId,
      flowId: input.flowId,
      dealId: input.dealId,
      sessionKey: input.sessionKey,
      config: input.config,
      createdAt: Date.now(),
    };
  });

  // Get a Flowise session by conversation ID
  ipcBridge.ma.flowiseSession.getByConversation.provider(async (params): Promise<FlowiseSession | null> => {
    const { conversationId } = params as { conversationId: string };
    // TODO: Implement FlowiseSessionRepository
    return null;
  });
}
