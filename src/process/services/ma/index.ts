/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

export { DocumentProcessor, getDocumentProcessor, detectFormat, isValidFormat } from './DocumentProcessor';
export type { ChunkingOptions, ProcessingProgress, DocumentProcessingResult } from './DocumentProcessor';

export { DealContextService, getDealContextService } from './DealContextService';
export type { DealContext, CreateDealInput, UpdateDealInput, DealStatus } from './DealContextService';

export {
  DueDiligenceService,
  getDueDiligenceService,
  calculateRiskScore,
  determineSeverity,
  calculateCategoryScores,
  calculateOverallScore,
} from './DueDiligenceService';
export type {
  AnalysisType,
  DueDiligenceRequest,
  DueDiligenceResult,
  ComparisonResult,
  DealComparison,
  AnalysisProgress,
} from './DueDiligenceService';

export { IntegrationService, getIntegrationService } from './IntegrationService';

export {
  PappersEnricher,
  getPappersEnricher,
  SOURCE_PRECEDENCE,
  MergeStrategy,
  FIELD_MERGE_CONFIG,
  type SourcePrecedenceKey,
  type Disagreement,
  type FieldProvenance,
  type ProvenanceJson,
} from './PappersEnricher';

export {
  EnrichmentMergeHelper,
  getEnrichmentMergeHelper,
  type EnrichmentSourceData,
  type MergeResult,
  type MergeOptions,
} from './EnrichmentMergeHelper';

export { ContactService, getContactService } from './ContactService';
export type { Contact, CreateContactInput, UpdateContactInput } from './ContactService';

export { WatchlistService, getWatchlistService } from './WatchlistService';
export type {
  Watchlist,
  CreateWatchlistInput,
  UpdateWatchlistInput,
  WatchlistHit,
  CreateWatchlistHitInput,
  UpdateWatchlistHitInput,
} from './WatchlistService';

export {
  DocumentGenerator,
  getDocumentGenerator,
  initDocumentGenerator,
  GenerationCancelledError,
  MissingVariablesError,
  TemplateNotCallableError,
} from './DocumentGenerator';
export type { FlowRunner, GenerateInput, GenerationProgress, GeneratorCancelSignal } from './DocumentGenerator';

export { ChecklistGenerator, getChecklistGenerator } from './ChecklistGenerator';
export type { ChecklistGenerateInput, ChecklistGenerateResult } from './ChecklistGenerator';

export {
  KnowledgeBaseService,
  getKnowledgeBaseService,
  type IngestionResult,
  type RetrievalOptions,
  type ChunkSearchResult,
  type KbStats,
  type KnowledgeBaseServiceDeps,
} from './KnowledgeBaseService';
