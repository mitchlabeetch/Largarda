/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * DailyBriefService
 * Generates navigable, traceable daily briefs and reports that preserve provenance.
 * Part of Wave 10 / Batch 10C.
 */

import type {
  DailyBrief,
  BriefItem,
  DataProvenance,
  Report,
  ReportSection,
  ReportType,
  ReportFilter,
  GenerateBriefInput,
  GenerateReportInput,
  BriefGenerationResult,
  ReportGenerationResult,
  DealContext,
  MaDocument,
  MaAnalysis,
  RiskFinding,
} from '@/common/ma/types';
import { DealRepository } from '@process/services/database/repositories/ma/DealRepository';
import { DocumentRepository } from '@process/services/database/repositories/ma/DocumentRepository';
import { AnalysisRepository } from '@process/services/database/repositories/ma/AnalysisRepository';
import { IntegrationConnectionRepository } from '@process/services/database/repositories/ma/IntegrationConnectionRepository';
import { SyncJobRepository } from '@process/services/database/repositories/ma/SyncJobRepository';

// ============================================================================
// Utility Functions
// ============================================================================

function generateBriefId(): string {
  return `brief_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateReportId(): string {
  return `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateItemId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function calculateWindow(
  timeWindow: NonNullable<GenerateBriefInput['timeWindow']>,
  customStart?: number,
  customEnd?: number
): { start: number; end: number } {
  const now = Date.now();
  const end = now;
  let start: number;

  switch (timeWindow) {
    case '24h':
      start = now - 24 * 60 * 60 * 1000;
      break;
    case '7d':
      start = now - 7 * 24 * 60 * 60 * 1000;
      break;
    case '30d':
      start = now - 30 * 24 * 60 * 60 * 1000;
      break;
    case 'custom':
      start = customStart ?? now - 24 * 60 * 60 * 1000;
      break;
    default:
      start = now - 24 * 60 * 60 * 1000;
  }

  return { start, end };
}

function createProvenance(
  sourceType: DataProvenance['sourceType'],
  sourceId: string,
  sourceName: string,
  generatedAt: number,
  drillDownPath: string
): DataProvenance {
  return {
    sourceType,
    sourceId,
    sourceName,
    generatedAt,
    drillDownPath,
  };
}

// ============================================================================
// DailyBriefService Class
// ============================================================================

export class DailyBriefService {
  private dealRepo: DealRepository;
  private documentRepo: DocumentRepository;
  private analysisRepo: AnalysisRepository;
  private integrationRepo: IntegrationConnectionRepository;
  private syncJobRepo: SyncJobRepository;

  constructor(
    dealRepo?: DealRepository,
    documentRepo?: DocumentRepository,
    analysisRepo?: AnalysisRepository,
    integrationRepo?: IntegrationConnectionRepository,
    syncJobRepo?: SyncJobRepository
  ) {
    this.dealRepo = dealRepo ?? new DealRepository();
    this.documentRepo = documentRepo ?? new DocumentRepository();
    this.analysisRepo = analysisRepo ?? new AnalysisRepository();
    this.integrationRepo = integrationRepo ?? new IntegrationConnectionRepository();
    this.syncJobRepo = syncJobRepo ?? new SyncJobRepository();
  }

  // ============================================================================
  // Daily Brief Generation
  // ============================================================================

  /**
   * Generate a daily brief for the specified time window.
   * Produces navigable, traceable summary with full provenance.
   */
  async generateDailyBrief(input: GenerateBriefInput = {}): Promise<BriefGenerationResult> {
    try {
      const timeWindow = input.timeWindow ?? '24h';
      const { start: windowStart, end: windowEnd } = calculateWindow(timeWindow, input.customStart, input.customEnd);

      const items: BriefItem[] = [];
      const byDeal: Record<string, BriefItem[]> = {};
      let summary = {
        totalDeals: 0,
        activeDeals: 0,
        documentsUploaded: 0,
        documentsProcessed: 0,
        analysesCompleted: 0,
        risksIdentified: 0,
        integrationsConnected: 0,
      };

      // Fetch all deals
      const dealsResult = await this.dealRepo.list();
      const deals = dealsResult.data ?? [];
      summary.totalDeals = deals.length;
      summary.activeDeals = deals.filter((d: DealContext) => d.status === 'active').length;

      // Process each deal
      for (const deal of deals) {
        const dealItems = await this.processDealForBrief(deal, windowStart, windowEnd);
        items.push(...dealItems);
        byDeal[deal.id] = dealItems;
      }

      // Fetch global items (integrations, sync jobs not tied to deals)
      const globalItems = await this.processGlobalItems(windowStart, windowEnd);
      items.push(...globalItems);

      // Calculate summary counts from items
      summary = this.calculateSummary(items, summary.totalDeals, summary.activeDeals);

      // Sort items by timestamp descending
      items.sort((a, b) => b.timestamp - a.timestamp);

      const brief: DailyBrief = {
        generatedAt: Date.now(),
        timeWindow,
        windowStart,
        windowEnd,
        summary,
        items,
        byDeal,
      };

      return { success: true, brief };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Failed to generate daily brief: ${message}` };
    }
  }

  /**
   * Process a single deal to extract brief items.
   */
  private async processDealForBrief(deal: DealContext, windowStart: number, windowEnd: number): Promise<BriefItem[]> {
    const items: BriefItem[] = [];
    const now = Date.now();

    // Check if deal was created in window
    if (deal.createdAt >= windowStart && deal.createdAt <= windowEnd) {
      items.push({
        id: generateItemId(),
        type: 'deal_created',
        title: `Deal created: ${deal.name}`,
        description: `New ${deal.transactionType} deal "${deal.name}" for ${deal.targetCompany.name}`,
        timestamp: deal.createdAt,
        dealId: deal.id,
        dealName: deal.name,
        provenance: createProvenance('deal', deal.id, deal.name, now, `/ma/deals/${deal.id}`),
        metadata: {
          transactionType: deal.transactionType,
          targetCompany: deal.targetCompany.name,
          jurisdiction: deal.targetCompany.jurisdiction,
        },
      });
    }

    // Fetch documents for this deal
    const docsResult = await this.documentRepo.listByDeal(deal.id, 0, 1000);
    const documents = docsResult.data ?? [];

    for (const doc of documents) {
      // Document uploaded
      if (doc.createdAt >= windowStart && doc.createdAt <= windowEnd) {
        items.push({
          id: generateItemId(),
          type: 'document_uploaded',
          title: `Document uploaded: ${doc.filename}`,
          description: `New ${doc.format.toUpperCase()} document uploaded for "${deal.name}"`,
          timestamp: doc.createdAt,
          dealId: deal.id,
          dealName: deal.name,
          provenance: createProvenance(
            'document',
            doc.id,
            doc.filename,
            now,
            `/ma/deals/${deal.id}/documents/${doc.id}`
          ),
          metadata: {
            format: doc.format,
            size: doc.size,
            filename: doc.filename,
          },
        });
      }

      // Document processed (completed status change)
      if (doc.status === 'completed' && doc.metadata?.provenance?.processedAt) {
        const processedAt = doc.metadata.provenance.processedAt;
        if (processedAt >= windowStart && processedAt <= windowEnd) {
          items.push({
            id: generateItemId(),
            type: 'document_processed',
            title: `Document processed: ${doc.filename}`,
            description: `Document "${doc.filename}" has been processed and is ready for analysis`,
            timestamp: processedAt,
            dealId: deal.id,
            dealName: deal.name,
            provenance: createProvenance(
              'document',
              doc.id,
              doc.filename,
              now,
              `/ma/deals/${deal.id}/documents/${doc.id}`
            ),
            metadata: {
              format: doc.format,
              pageCount: doc.metadata?.pageCount,
              processingTime: doc.metadata?.provenance?.processingMs,
            },
          });
        }
      }
    }

    // Fetch analyses for this deal
    const analysesResult = await this.analysisRepo.listByDeal(deal.id, 0, 1000);
    const analyses = analysesResult.data ?? [];

    for (const analysis of analyses) {
      // Analysis completed
      if (analysis.status === 'completed' && analysis.completedAt) {
        if (analysis.completedAt >= windowStart && analysis.completedAt <= windowEnd) {
          items.push({
            id: generateItemId(),
            type: 'analysis_completed',
            title: `Analysis completed: ${analysis.type}`,
            description: `Due diligence analysis completed for "${deal.name}"`,
            timestamp: analysis.completedAt,
            dealId: deal.id,
            dealName: deal.name,
            provenance: createProvenance(
              'analysis',
              analysis.id,
              analysis.type,
              now,
              `/ma/deals/${deal.id}/analyses/${analysis.id}`
            ),
            metadata: {
              analysisType: analysis.type,
              documentCount: analysis.input.documentIds.length,
            },
          });
        }
      }
    }

    // Fetch risk findings for this deal's analyses
    const analysesResult2 = await this.analysisRepo.listByDeal(deal.id, 0, 1000);
    const analyses2 = analysesResult2.data ?? [];

    for (const analysis of analyses2) {
      const findingsResult = await this.analysisRepo.getRiskFindings(analysis.id);
      if (findingsResult.success) {
        const findings = findingsResult.data ?? [];

        for (const finding of findings) {
          if (finding.createdAt >= windowStart && finding.createdAt <= windowEnd) {
            items.push({
              id: generateItemId(),
              type: 'risk_found',
              title: `Risk identified: ${finding.title}`,
              description: `${finding.severity.toUpperCase()} risk found in "${deal.name}": ${finding.description.substring(0, 100)}${finding.description.length > 100 ? '...' : ''}`,
              timestamp: finding.createdAt,
              dealId: deal.id,
              dealName: deal.name,
              provenance: createProvenance(
                'analysis',
                analysis.id,
                analysis.type,
                now,
                `/ma/deals/${deal.id}/analyses/${analysis.id}/findings/${finding.id}`
              ),
              metadata: {
                severity: finding.severity,
                category: finding.category,
                score: finding.score,
                recommendation: finding.recommendation,
              },
            });
          }
        }
      }
    }

    return items;
  }

  /**
   * Process global items (integrations, sync jobs not tied to specific deals).
   */
  private async processGlobalItems(windowStart: number, windowEnd: number): Promise<BriefItem[]> {
    const items: BriefItem[] = [];
    const now = Date.now();

    // Fetch integration connections
    const connectionsResult = await this.integrationRepo.list();
    if (connectionsResult.success) {
      const connections = connectionsResult.data ?? [];

      for (const conn of connections) {
        if (conn.connectedAt && conn.connectedAt >= windowStart && conn.connectedAt <= windowEnd) {
          items.push({
            id: generateItemId(),
            type: 'integration_connected',
            title: `Integration connected: ${conn.displayName ?? conn.providerId}`,
            description: `New integration established with ${conn.displayName ?? conn.providerId}`,
            timestamp: conn.connectedAt,
            provenance: createProvenance(
              'integration',
              conn.id,
              conn.displayName ?? conn.providerId,
              now,
              `/settings/integrations/${conn.providerId}`
            ),
            metadata: {
              providerId: conn.providerId,
              status: conn.status,
            },
          });
        }
      }
    }

    // Fetch sync jobs
    const jobsResult = await this.syncJobRepo.list({ status: 'completed' });
    if (jobsResult.success) {
      const jobs = jobsResult.data ?? [];

      for (const job of jobs) {
        if (
          job.completedAt &&
          job.completedAt >= windowStart &&
          job.completedAt <= windowEnd &&
          job.status === 'completed'
        ) {
          items.push({
            id: generateItemId(),
            type: 'sync_completed',
            title: `Sync completed: ${job.jobType}`,
            description: `Data synchronization completed successfully`,
            timestamp: job.completedAt,
            provenance: createProvenance('sync', job.id, job.jobType, now, `/settings/sync/${job.id}`),
            metadata: {
              jobType: job.jobType,
              providerId: job.providerId,
              itemsProcessed: job.itemsProcessed,
              itemsTotal: job.itemsTotal,
            },
          });
        }
      }
    }

    return items;
  }

  /**
   * Calculate summary statistics from brief items.
   */
  private calculateSummary(items: BriefItem[], totalDeals: number, activeDeals: number) {
    return {
      totalDeals,
      activeDeals,
      documentsUploaded: items.filter((i) => i.type === 'document_uploaded').length,
      documentsProcessed: items.filter((i) => i.type === 'document_processed').length,
      analysesCompleted: items.filter((i) => i.type === 'analysis_completed').length,
      risksIdentified: items.filter((i) => i.type === 'risk_found').length,
      integrationsConnected: items.filter((i) => i.type === 'integration_connected').length,
    };
  }

  // ============================================================================
  // Report Generation
  // ============================================================================

  /**
   * Generate a detailed report of the specified type.
   */
  async generateReport(input: GenerateReportInput): Promise<ReportGenerationResult> {
    try {
      const reportId = generateReportId();
      const generatedAt = Date.now();
      const filter = input.filter ?? {};

      let sections: ReportSection[] = [];
      let totalItems = 0;

      switch (input.type) {
        case 'executive_summary':
          sections = await this.generateExecutiveSummary(filter);
          break;
        case 'due_diligence':
          sections = await this.generateDueDiligenceReport(filter);
          break;
        case 'risk_assessment':
          sections = await this.generateRiskAssessmentReport(filter);
          break;
        case 'document_status':
          sections = await this.generateDocumentStatusReport(filter);
          break;
        case 'deal_comparison':
          sections = await this.generateDealComparisonReport(filter);
          break;
        default:
          return { success: false, error: `Unknown report type: ${input.type}` };
      }

      // Calculate total items from sections
      totalItems = sections.reduce((acc, section) => {
        if (Array.isArray(section.content)) {
          return acc + section.content.length;
        }
        return acc + 1;
      }, 0);

      const report: Report = {
        id: reportId,
        type: input.type,
        title: input.title ?? this.getDefaultReportTitle(input.type),
        generatedAt,
        filter,
        sections,
        totalItems,
      };

      return { success: true, report };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Failed to generate report: ${message}` };
    }
  }

  /**
   * Get default title for a report type.
   */
  private getDefaultReportTitle(type: ReportType): string {
    const titles: Record<ReportType, string> = {
      executive_summary: 'Executive Summary Report',
      due_diligence: 'Due Diligence Report',
      risk_assessment: 'Risk Assessment Report',
      document_status: 'Document Status Report',
      deal_comparison: 'Deal Comparison Report',
    };
    return titles[type];
  }

  /**
   * Generate executive summary sections.
   */
  private async generateExecutiveSummary(filter: ReportFilter): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];
    const now = Date.now();

    // Summary section
    const dealsResult = await this.dealRepo.list();
    const deals = dealsResult.data ?? [];
    const activeDeals = deals.filter((d: DealContext) => d.status === 'active');

    sections.push({
      id: 'summary',
      title: 'Portfolio Summary',
      type: 'summary',
      content: {
        totalDeals: deals.length,
        activeDeals: activeDeals.length,
        archivedDeals: deals.filter((d: DealContext) => d.status === 'archived').length,
        closedDeals: deals.filter((d: DealContext) => d.status === 'closed').length,
      },
      provenance: deals.map((d: DealContext) => createProvenance('deal', d.id, d.name, now, `/ma/deals/${d.id}`)),
    });

    // Recent activity section
    const briefResult = await this.generateDailyBrief({ timeWindow: '7d' });
    if (briefResult.success && briefResult.brief) {
      sections.push({
        id: 'recent_activity',
        title: 'Recent Activity (7 Days)',
        type: 'list',
        content: briefResult.brief.items.slice(0, 20),
        provenance: briefResult.brief.items.map((item) => item.provenance),
      });
    }

    return sections;
  }

  /**
   * Generate due diligence report sections.
   */
  private async generateDueDiligenceReport(filter: ReportFilter): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];
    const now = Date.now();

    // Get analyses for filtered deals
    const dealIds = filter.dealIds;
    let analyses: MaAnalysis[] = [];

    if (dealIds && dealIds.length > 0) {
      for (const dealId of dealIds) {
        const result = await this.analysisRepo.listByDeal(dealId, 0, 1000);
        analyses.push(...(result.data ?? []));
      }
    } else {
      // Get all analyses across all deals
      const dealsResult = await this.dealRepo.list();
      for (const deal of dealsResult.data ?? []) {
        const result = await this.analysisRepo.listByDeal(deal.id, 0, 1000);
        analyses.push(...(result.data ?? []));
      }
    }

    // Filter by date range
    if (filter.startDate || filter.endDate) {
      analyses = analyses.filter((a: MaAnalysis) => {
        const date = a.completedAt ?? a.createdAt;
        if (filter.startDate && date < filter.startDate) return false;
        if (filter.endDate && date > filter.endDate) return false;
        return true;
      });
    }

    // Filter by analysis type
    if (filter.analysisTypes && filter.analysisTypes.length > 0) {
      analyses = analyses.filter((a: MaAnalysis) => filter.analysisTypes?.includes(a.type));
    }

    sections.push({
      id: 'analyses',
      title: 'Due Diligence Analyses',
      type: 'table',
      content: analyses.map((a: MaAnalysis) => ({
        id: a.id,
        dealId: a.dealId,
        type: a.type,
        status: a.status,
        createdAt: a.createdAt,
        completedAt: a.completedAt,
        documentCount: a.input.documentIds.length,
      })),
      provenance: analyses.map((a: MaAnalysis) =>
        createProvenance('analysis', a.id, a.type, now, `/ma/analyses/${a.id}`)
      ),
    });

    return sections;
  }

  /**
   * Generate risk assessment report sections.
   */
  private async generateRiskAssessmentReport(filter: ReportFilter): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];
    const now = Date.now();

    // Collect all risk findings
    const allFindings: Array<RiskFinding & { dealId?: string; dealName?: string }> = [];

    const dealsResult = await this.dealRepo.list();
    for (const deal of dealsResult.data ?? []) {
      if (filter.dealIds && !filter.dealIds.includes(deal.id)) continue;

      const analysesResult = await this.analysisRepo.listByDeal(deal.id, 0, 1000);
      for (const analysis of analysesResult.data ?? []) {
        const findingsResult = await this.analysisRepo.getRiskFindings(analysis.id);
        if (findingsResult.success) {
          for (const finding of findingsResult.data ?? []) {
            allFindings.push({
              ...finding,
              dealId: deal.id,
              dealName: deal.name,
            });
          }
        }
      }
    }

    // Apply filters
    let filteredFindings = allFindings;

    if (filter.riskCategories && filter.riskCategories.length > 0) {
      filteredFindings = filteredFindings.filter((f: RiskFinding) => filter.riskCategories?.includes(f.category));
    }

    if (filter.severityLevels && filter.severityLevels.length > 0) {
      filteredFindings = filteredFindings.filter((f: RiskFinding) => filter.severityLevels?.includes(f.severity));
    }

    if (filter.startDate || filter.endDate) {
      filteredFindings = filteredFindings.filter((f) => {
        if (filter.startDate && f.createdAt < filter.startDate) return false;
        if (filter.endDate && f.createdAt > filter.endDate) return false;
        return true;
      });
    }

    // Group by severity
    const bySeverity = {
      critical: filteredFindings.filter((f) => f.severity === 'critical'),
      high: filteredFindings.filter((f) => f.severity === 'high'),
      medium: filteredFindings.filter((f) => f.severity === 'medium'),
      low: filteredFindings.filter((f) => f.severity === 'low'),
    };

    sections.push({
      id: 'risk_summary',
      title: 'Risk Summary by Severity',
      type: 'summary',
      content: {
        critical: bySeverity.critical.length,
        high: bySeverity.high.length,
        medium: bySeverity.medium.length,
        low: bySeverity.low.length,
        total: filteredFindings.length,
      },
      provenance: filteredFindings.map((f) =>
        createProvenance('analysis', f.analysisId, f.title, now, `/ma/analyses/${f.analysisId}/findings/${f.id}`)
      ),
    });

    sections.push({
      id: 'critical_risks',
      title: 'Critical Risks',
      type: 'table',
      content: bySeverity.critical.map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        category: f.category,
        score: f.score,
        dealId: f.dealId,
        dealName: f.dealName,
        recommendation: f.recommendation,
      })),
      provenance: bySeverity.critical.map((f) =>
        createProvenance('analysis', f.analysisId, f.title, now, `/ma/analyses/${f.analysisId}/findings/${f.id}`)
      ),
      drillDownPath: '/ma/risk-findings',
    });

    sections.push({
      id: 'all_findings',
      title: 'All Risk Findings',
      type: 'table',
      content: filteredFindings.map((f) => ({
        id: f.id,
        title: f.title,
        severity: f.severity,
        category: f.category,
        score: f.score,
        dealId: f.dealId,
        dealName: f.dealName,
      })),
      provenance: filteredFindings.map((f) =>
        createProvenance('analysis', f.analysisId, f.title, now, `/ma/analyses/${f.analysisId}/findings/${f.id}`)
      ),
      drillDownPath: '/ma/risk-findings',
    });

    return sections;
  }

  /**
   * Generate document status report sections.
   */
  private async generateDocumentStatusReport(filter: ReportFilter): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];
    const now = Date.now();

    const allDocuments: Array<MaDocument & { dealName?: string }> = [];

    const dealsResult = await this.dealRepo.list();
    for (const deal of dealsResult.data ?? []) {
      if (filter.dealIds && !filter.dealIds.includes(deal.id)) continue;

      const docsResult = await this.documentRepo.listByDeal(deal.id, 0, 1000);
      for (const doc of docsResult.data ?? []) {
        allDocuments.push({
          ...doc,
          dealName: deal.name,
        });
      }
    }

    // Apply filters
    let filteredDocs = allDocuments;

    if (filter.documentTypes && filter.documentTypes.length > 0) {
      filteredDocs = filteredDocs.filter(
        (d: MaDocument & { dealName?: string }) =>
          d.metadata?.documentType && filter.documentTypes?.includes(d.metadata.documentType)
      );
    }

    // Group by status
    const byStatus = {
      completed: filteredDocs.filter((d: MaDocument & { dealName?: string }) => d.status === 'completed'),
      processing: filteredDocs.filter((d: MaDocument & { dealName?: string }) =>
        ['processing', 'extracting', 'chunking', 'queued'].includes(d.status)
      ),
      failed: filteredDocs.filter(
        (d: MaDocument & { dealName?: string }) => d.status === 'failed' || d.status === 'error'
      ),
      pending: filteredDocs.filter((d: MaDocument & { dealName?: string }) => d.status === 'pending'),
    };

    sections.push({
      id: 'status_summary',
      title: 'Document Status Summary',
      type: 'summary',
      content: {
        completed: byStatus.completed.length,
        processing: byStatus.processing.length,
        failed: byStatus.failed.length,
        pending: byStatus.pending.length,
        total: filteredDocs.length,
      },
      provenance: filteredDocs.map((d) => createProvenance('document', d.id, d.filename, now, `/ma/documents/${d.id}`)),
    });

    sections.push({
      id: 'failed_documents',
      title: 'Failed Documents',
      type: 'table',
      content: byStatus.failed.map((d) => ({
        id: d.id,
        filename: d.filename,
        dealId: d.dealId,
        dealName: d.dealName,
        format: d.format,
        error: d.error,
      })),
      provenance: byStatus.failed.map((d) =>
        createProvenance('document', d.id, d.filename, now, `/ma/documents/${d.id}`)
      ),
      drillDownPath: '/ma/documents?status=failed',
    });

    sections.push({
      id: 'recent_completed',
      title: 'Recently Completed',
      type: 'table',
      content: byStatus.completed
        .toSorted(
          (a, b) =>
            (b.metadata?.provenance?.processedAt ?? b.createdAt) - (a.metadata?.provenance?.processedAt ?? a.createdAt)
        )
        .slice(0, 50)
        .map((d) => ({
          id: d.id,
          filename: d.filename,
          dealId: d.dealId,
          dealName: d.dealName,
          format: d.format,
          processedAt: d.metadata?.provenance?.processedAt,
          pageCount: d.metadata?.pageCount,
        })),
      provenance: byStatus.completed.map((d) =>
        createProvenance('document', d.id, d.filename, now, `/ma/documents/${d.id}`)
      ),
      drillDownPath: '/ma/documents?status=completed',
    });

    return sections;
  }

  /**
   * Generate deal comparison report sections.
   */
  private async generateDealComparisonReport(filter: ReportFilter): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];
    const now = Date.now();

    const dealsResult = await this.dealRepo.list();
    let deals = dealsResult.data ?? [];

    if (filter.dealIds && filter.dealIds.length > 0) {
      deals = deals.filter((d: DealContext) => filter.dealIds?.includes(d.id));
    }

    // Get analysis counts for each deal
    const dealsWithStats = await Promise.all(
      deals.map(async (deal: DealContext) => {
        const analysesResult = await this.analysisRepo.listByDeal(deal.id, 0, 1000);
        const analyses = analysesResult.data ?? [];

        const docsResult = await this.documentRepo.listByDeal(deal.id, 0, 1000);
        const documents = docsResult.data ?? [];

        // Count findings
        let totalFindings = 0;
        let criticalFindings = 0;
        let highFindings = 0;

        for (const analysis of analyses) {
          const findingsResult = await this.analysisRepo.getRiskFindings(analysis.id);
          if (findingsResult.success) {
            const findings = findingsResult.data ?? [];
            totalFindings += findings.length;
            criticalFindings += findings.filter((f: RiskFinding) => f.severity === 'critical').length;
            highFindings += findings.filter((f: RiskFinding) => f.severity === 'high').length;
          }
        }

        return {
          ...deal,
          analysisCount: analyses.length,
          completedAnalyses: analyses.filter((a: MaAnalysis) => a.status === 'completed').length,
          documentCount: documents.length,
          processedDocuments: documents.filter((d: MaDocument) => d.status === 'completed').length,
          totalFindings,
          criticalFindings,
          highFindings,
        };
      })
    );

    sections.push({
      id: 'deal_comparison',
      title: 'Deal Comparison Matrix',
      type: 'table',
      content: dealsWithStats.map((d) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        transactionType: d.transactionType,
        targetCompany: d.targetCompany.name,
        documents: d.documentCount,
        processedDocs: d.processedDocuments,
        analyses: d.analysisCount,
        completedAnalyses: d.completedAnalyses,
        totalRisks: d.totalFindings,
        criticalRisks: d.criticalFindings,
        highRisks: d.highFindings,
      })),
      provenance: dealsWithStats.map((d) => createProvenance('deal', d.id, d.name, now, `/ma/deals/${d.id}`)),
      drillDownPath: '/ma/deals',
    });

    return sections;
  }
}

// Singleton instance
let dailyBriefServiceInstance: DailyBriefService | null = null;

export function getDailyBriefService(): DailyBriefService {
  if (!dailyBriefServiceInstance) {
    dailyBriefServiceInstance = new DailyBriefService();
  }
  return dailyBriefServiceInstance;
}
