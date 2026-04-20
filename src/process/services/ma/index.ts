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
