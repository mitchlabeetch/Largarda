/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

export { KNOWN_TEMPLATE_KEYS, TemplateKeySchema, isTemplateKey } from './types';
export type { TemplateKey, TemplateSpec, TemplateStatus, TemplateOutputFormat } from './types';

export {
  TEMPLATE_CATALOG,
  resolveTemplateSpec,
  isTemplateCallableInProd,
  getTemplatesByStatus,
  validateTemplateVariables,
} from './registry';

export {
  hashContent,
  buildProvenance,
  renderProvenanceLabel,
  parseProvenanceLabel,
  stampProvenanceLabel,
  verifyProvenanceIntegrity,
} from './provenance';

export {
  DOCUMENT_REVIEW_TERMINAL_STATUSES,
  DocumentReviewStatusSchema,
  GenerationProvenanceSchema,
  ExportMetadataSchema,
  GeneratedDocumentSchema,
  isTerminalReviewStatus,
  isValidReviewTransition,
} from './review';
export type {
  DocumentReviewStatus,
  GenerationProvenance,
  GeneratedDocument,
  ExportMetadata,
  DocumentReviewTerminalStatus,
} from './review';

export { RENDERER_MAP, resolveRenderer } from './renderers';
export type { RendererFn, RendererMap } from './renderers';
export { renderNda } from './renderers/ndaRenderer';
export { renderLoi } from './renderers/loiRenderer';
export { renderDdChecklist } from './renderers/ddChecklistRenderer';

export {
  TEASER_SECTIONS,
  IM_SECTIONS,
  STRUCTURE_RULES,
  validateDocumentStructure,
  isValidStructure,
  formatValidationReport,
  validateMultipleDocuments,
} from './structureValidator';
export type { DocumentSection, StructureValidationResult, StructureRuleSet } from './structureValidator';
