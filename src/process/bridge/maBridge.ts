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
  FlowiseReadiness,
  MaIntegrationProvider,
  MaIntegrationConnection,
  MaIntegrationDescriptor,
  CreateIntegrationSessionInput,
  IntegrationSessionResult,
  IntegrationProxyRequest,
  IntegrationProxyResponse,
} from '@/common/ma/types';
import { DealRepository } from '@process/services/database/repositories/ma/DealRepository';
import { DocumentRepository } from '@process/services/database/repositories/ma/DocumentRepository';
import { AnalysisRepository } from '@process/services/database/repositories/ma/AnalysisRepository';
import {
  getFlowiseSessionRepository,
  type FlowiseSessionRepository,
} from '@process/services/database/repositories/ma/FlowiseSessionRepository';
import { DealContextService } from '@process/services/ma/DealContextService';
import type { DocumentIngestionService } from '@process/services/ma/DocumentIngestionService';
import { initDocumentIngestionService } from '@process/services/ma/DocumentIngestionService';
import { getIntegrationService, type IntegrationService } from '@process/services/ma/IntegrationService';
import { probeFlowiseReadiness } from '@process/agent/flowise/FloWiseConnection';

// Repository instances
let dealRepo: DealRepository | null = null;
let documentRepo: DocumentRepository | null = null;
let analysisRepo: AnalysisRepository | null = null;
let dealContextService: DealContextService | null = null;
let flowiseSessionRepo: FlowiseSessionRepository | null = null;
let integrationService: IntegrationService | null = null;
let ingestionService: DocumentIngestionService | null = null;

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

function getDealContextServiceInstance(): DealContextService {
  if (!dealContextService) {
    dealContextService = new DealContextService();
  }
  return dealContextService;
}

function getFlowiseSessionRepo(): FlowiseSessionRepository {
  flowiseSessionRepo ??= getFlowiseSessionRepository();
  return flowiseSessionRepo;
}

function getIntegrationServiceInstance(): IntegrationService {
  integrationService ??= getIntegrationService();
  return integrationService;
}

function getIngestionService(): DocumentIngestionService {
  if (!ingestionService) {
    ingestionService = initDocumentIngestionService({
      repository: getDocumentRepo(),
      emit: (event) => ipcBridge.ma.document.progress.emit(event),
    });
  }
  return ingestionService;
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
    const result = await getDealContextServiceInstance().archiveDeal(id);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to archive deal');
    }
    return result.data ?? null;
  });

  // Set active deal
  ipcBridge.ma.deal.setActive.provider(async (params): Promise<DealContext | null> => {
    const { id } = params as { id: string };
    const result = await getDealContextServiceInstance().setActiveDeal(id);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to set active deal');
    }
    return result.data ?? null;
  });

  // Get active deal
  ipcBridge.ma.deal.getActive.provider(async (): Promise<DealContext | null> => {
    const result = await getDealContextServiceInstance().getActiveDeal();
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to get active deal');
    }
    return result.data;
  });

  // Clear active deal
  ipcBridge.ma.deal.clearActive.provider(async (): Promise<void> => {
    await getDealContextServiceInstance().clearActiveDeal();
  });

  // Get deal context for AI
  ipcBridge.ma.deal.getContextForAI.provider(
    async (): Promise<{
      hasContext: boolean;
      deal?: DealContext;
      contextString?: string;
    }> => {
      return getDealContextServiceInstance().getDealContextForAI();
    }
  );

  // Close a deal
  ipcBridge.ma.deal.close.provider(async (params): Promise<DealContext | null> => {
    const { id } = params as { id: string };
    const result = await getDealContextServiceInstance().closeDeal(id);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to close deal');
    }
    return result.data ?? null;
  });

  // Reactivate a deal
  ipcBridge.ma.deal.reactivate.provider(async (params): Promise<DealContext | null> => {
    const { id } = params as { id: string };
    const result = await getDealContextServiceInstance().reactivateDeal(id);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to reactivate deal');
    }
    return result.data ?? null;
  });

  // Validate deal input
  ipcBridge.ma.deal.validate.provider(async (params): Promise<{ valid: boolean; errors: string[] }> => {
    const input = params as CreateDealInput;
    return getDealContextServiceInstance().validateDealInput(input);
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
  // Document Ingestion (process-backed state machine)
  // ============================================================================

  // Run the real process-side ingestion pipeline. Resolves when the document
  // reaches a terminal state (completed / failed / cancelled). Truthful
  // progress is streamed via the `ma.document.progress` emitter.
  ipcBridge.ma.document.ingest.provider(async (params): Promise<MaDocument> => {
    const { id, filePath, options } = params as {
      id: string;
      filePath: string;
      options?: {
        strategy?: 'fixed' | 'sentence' | 'paragraph' | 'semantic';
        chunkSize?: number;
        chunkOverlap?: number;
      };
    };
    return getIngestionService().ingest(id, filePath, options);
  });

  // Cancel an in-flight ingestion. Returns true when a matching task existed.
  ipcBridge.ma.document.cancel.provider(async (params): Promise<boolean> => {
    const { id } = params as { id: string };
    return getIngestionService().cancel(id);
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
    const result = await getFlowiseSessionRepo().create(input);
    if (!result.success || !result.data) {
      throw new Error(result.error ?? 'Failed to create Flowise session');
    }
    return result.data;
  });

  // Get a Flowise session by conversation ID
  ipcBridge.ma.flowiseSession.getByConversation.provider(async (params): Promise<FlowiseSession | null> => {
    const { conversationId } = params as { conversationId: string };
    const result = await getFlowiseSessionRepo().getByConversation(conversationId);
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to get Flowise session');
    }
    return result.data;
  });

  // ============================================================================
  // Flowise Readiness Operations
  // ============================================================================

  // Get Flowise readiness status
  ipcBridge.ma.flowise.getReadiness.provider(async (): Promise<FlowiseReadiness> => {
    return probeFlowiseReadiness();
  });

  // ============================================================================
  // External Integration Operations
  // ============================================================================

  ipcBridge.ma.integration.listProviders.provider(async (): Promise<MaIntegrationProvider[]> => {
    return getIntegrationServiceInstance().listProviders();
  });

  ipcBridge.ma.integration.listConnections.provider(async (): Promise<MaIntegrationConnection[]> => {
    return getIntegrationServiceInstance().listConnections();
  });

  ipcBridge.ma.integration.listDescriptors.provider(async (): Promise<MaIntegrationDescriptor[]> => {
    return getIntegrationServiceInstance().listDescriptors();
  });

  ipcBridge.ma.integration.createConnectSession.provider(async (params): Promise<IntegrationSessionResult> => {
    const input = params as CreateIntegrationSessionInput;
    return getIntegrationServiceInstance().createConnectSession(input);
  });

  ipcBridge.ma.integration.createReconnectSession.provider(async (params): Promise<IntegrationSessionResult> => {
    const input = params as CreateIntegrationSessionInput;
    return getIntegrationServiceInstance().createReconnectSession(input);
  });

  ipcBridge.ma.integration.disconnect.provider(async (params): Promise<boolean> => {
    const { providerId } = params as { providerId: string };
    return getIntegrationServiceInstance().disconnect(providerId);
  });

  ipcBridge.ma.integration.proxyRequest.provider(async (params): Promise<IntegrationProxyResponse> => {
    const input = params as IntegrationProxyRequest;
    return getIntegrationServiceInstance().proxyRequest(input);
  });

  // ============================================================================
  // Due Diligence Operations
  // ============================================================================

  // Run due diligence analysis
  ipcBridge.ma.dueDiligence.analyze.provider(async (params) => {
    const { DueDiligenceService } = await import('@process/services/ma/DueDiligenceService');
    const request = params as any;
    const service = new DueDiligenceService();
    const result = await service.analyze(request);
    if (!result.success || !result.data) {
      throw new Error(result.error ?? 'Failed to run analysis');
    }
    return result.data;
  });

  // Get due diligence analysis result
  ipcBridge.ma.dueDiligence.getAnalysis.provider(async (params) => {
    const { DueDiligenceService } = await import('@process/services/ma/DueDiligenceService');
    const { id } = params as { id: string };
    const service = new DueDiligenceService();
    const result = await service.getAnalysis(id);
    return result.data;
  });

  // List due diligence analyses for a deal
  ipcBridge.ma.dueDiligence.listAnalyses.provider(async (params) => {
    const { DueDiligenceService } = await import('@process/services/ma/DueDiligenceService');
    const { dealId } = params as { dealId: string };
    const service = new DueDiligenceService();
    const result = await service.listAnalyses(dealId);
    return result.data;
  });

  // Compare multiple deals
  ipcBridge.ma.dueDiligence.compareDeals.provider(async (params) => {
    const { DueDiligenceService } = await import('@process/services/ma/DueDiligenceService');
    const { dealIds } = params as { dealIds: string[] };
    const service = new DueDiligenceService();
    const result = await service.compareDeals(dealIds);
    if (!result.success || !result.data) {
      throw new Error(result.error ?? 'Failed to compare deals');
    }
    return result.data;
  });
}
