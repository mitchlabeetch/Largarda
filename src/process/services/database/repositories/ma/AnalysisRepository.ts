/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDatabase } from '@process/services/database';
import type {
  MaAnalysis,
  RiskFinding,
  CreateAnalysisInput,
  UpdateAnalysisInput,
  CreateRiskFindingInput,
  IMaAnalysisRow,
  IMaRiskFindingRow,
} from '@/common/ma/types';
import { analysisToRow, rowToAnalysis, riskFindingToRow, rowToRiskFinding } from '@/common/ma/types';
import type { IQueryResult, IPaginatedResult } from '@process/services/database/types';

/**
 * Repository for M&A analysis operations.
 * Provides CRUD operations for analyses and risk findings storage.
 */
export class AnalysisRepository {
  /**
   * Create a new analysis
   */
  async create(input: CreateAnalysisInput): Promise<IQueryResult<MaAnalysis>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const id = `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      const analysis: MaAnalysis = {
        id,
        dealId: input.dealId,
        type: input.type,
        flowId: input.flowId,
        input: input.input,
        status: 'pending',
        createdAt: now,
      };

      const row = analysisToRow(analysis);
      const stmt = driver.prepare(`
        INSERT INTO ma_analyses (id, deal_id, type, flow_id, input, result, status, error, created_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        row.id,
        row.deal_id,
        row.type,
        row.flow_id,
        row.input,
        row.result,
        row.status,
        row.error,
        row.created_at,
        row.completed_at
      );

      return { success: true, data: analysis };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Get an analysis by ID
   */
  async get(id: string): Promise<IQueryResult<MaAnalysis | null>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const row = driver.prepare('SELECT * FROM ma_analyses WHERE id = ?').get(id) as IMaAnalysisRow | undefined;

      return {
        success: true,
        data: row ? rowToAnalysis(row) : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: null };
    }
  }

  /**
   * Update an analysis
   */
  async update(id: string, input: UpdateAnalysisInput): Promise<IQueryResult<MaAnalysis>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const existing = await this.get(id);
      if (!existing.success || !existing.data) {
        return { success: false, error: 'Analysis not found' };
      }

      const updated: MaAnalysis = {
        ...existing.data,
        result: input.result ?? existing.data.result,
        status: input.status ?? existing.data.status,
        error: input.error ?? existing.data.error,
        completedAt: input.completedAt ?? existing.data.completedAt,
      };

      const row = analysisToRow(updated);
      const stmt = driver.prepare(`
        UPDATE ma_analyses
        SET result = ?, status = ?, error = ?, completed_at = ?
        WHERE id = ?
      `);

      stmt.run(row.result, row.status, row.error, row.completed_at, id);

      return { success: true, data: updated };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Delete an analysis
   */
  async delete(id: string): Promise<IQueryResult<boolean>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_analyses WHERE id = ?');
      const result = stmt.run(id);

      return { success: true, data: result.changes > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: false };
    }
  }

  /**
   * List analyses for a deal
   */
  async listByDeal(dealId: string, page = 0, pageSize = 50): Promise<IPaginatedResult<MaAnalysis>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver.prepare('SELECT COUNT(*) as count FROM ma_analyses WHERE deal_id = ?').get(dealId) as {
        count: number;
      };

      const rows = driver
        .prepare('SELECT * FROM ma_analyses WHERE deal_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
        .all(dealId, pageSize, page * pageSize) as IMaAnalysisRow[];

      return {
        data: rows.map(rowToAnalysis),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[AnalysisRepository] List by deal error:', error);
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      };
    }
  }

  /**
   * List analyses by type
   */
  async listByType(type: string, page = 0, pageSize = 50): Promise<IPaginatedResult<MaAnalysis>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const countResult = driver.prepare('SELECT COUNT(*) as count FROM ma_analyses WHERE type = ?').get(type) as {
        count: number;
      };

      const rows = driver
        .prepare('SELECT * FROM ma_analyses WHERE type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
        .all(type, pageSize, page * pageSize) as IMaAnalysisRow[];

      return {
        data: rows.map(rowToAnalysis),
        total: countResult.count,
        page,
        pageSize,
        hasMore: (page + 1) * pageSize < countResult.count,
      };
    } catch (error: unknown) {
      console.error('[AnalysisRepository] List by type error:', error);
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      };
    }
  }

  /**
   * Mark analysis as running
   */
  async markRunning(id: string): Promise<IQueryResult<MaAnalysis>> {
    return this.update(id, { status: 'running' });
  }

  /**
   * Mark analysis as completed
   */
  async markCompleted(id: string, result: Record<string, unknown>): Promise<IQueryResult<MaAnalysis>> {
    return this.update(id, {
      status: 'completed',
      result,
      completedAt: Date.now(),
    });
  }

  /**
   * Mark analysis as error
   */
  async markError(id: string, error: string): Promise<IQueryResult<MaAnalysis>> {
    return this.update(id, { status: 'error', error });
  }

  // ============================================================================
  // Risk Findings Operations
  // ============================================================================

  /**
   * Create a risk finding
   */
  async createRiskFinding(input: CreateRiskFindingInput): Promise<IQueryResult<RiskFinding>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const id = `risk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();

      const finding: RiskFinding = {
        id,
        analysisId: input.analysisId,
        category: input.category,
        severity: input.severity,
        score: input.score,
        title: input.title,
        description: input.description,
        evidence: input.evidence,
        recommendation: input.recommendation,
        sourceDocumentId: input.sourceDocumentId,
        createdAt: now,
      };

      const row = riskFindingToRow(finding);
      const stmt = driver.prepare(`
        INSERT INTO ma_risk_findings (id, analysis_id, category, severity, score, title, description, evidence, recommendation, source_document_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        row.id,
        row.analysis_id,
        row.category,
        row.severity,
        row.score,
        row.title,
        row.description,
        row.evidence,
        row.recommendation,
        row.source_document_id,
        row.created_at
      );

      return { success: true, data: finding };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Get risk findings for an analysis
   */
  async getRiskFindings(analysisId: string): Promise<IQueryResult<RiskFinding[]>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const rows = driver
        .prepare('SELECT * FROM ma_risk_findings WHERE analysis_id = ? ORDER BY score DESC, created_at ASC')
        .all(analysisId) as IMaRiskFindingRow[];

      return { success: true, data: rows.map(rowToRiskFinding) };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: [] };
    }
  }

  /**
   * Get risk findings by category
   */
  async getRiskFindingsByCategory(analysisId: string, category: string): Promise<IQueryResult<RiskFinding[]>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const rows = driver
        .prepare('SELECT * FROM ma_risk_findings WHERE analysis_id = ? AND category = ? ORDER BY score DESC')
        .all(analysisId, category) as IMaRiskFindingRow[];

      return { success: true, data: rows.map(rowToRiskFinding) };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: [] };
    }
  }

  /**
   * Get risk findings by severity
   */
  async getRiskFindingsBySeverity(analysisId: string, severity: string): Promise<IQueryResult<RiskFinding[]>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const rows = driver
        .prepare('SELECT * FROM ma_risk_findings WHERE analysis_id = ? AND severity = ? ORDER BY score DESC')
        .all(analysisId, severity) as IMaRiskFindingRow[];

      return { success: true, data: rows.map(rowToRiskFinding) };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: [] };
    }
  }

  /**
   * Delete a risk finding
   */
  async deleteRiskFinding(id: string): Promise<IQueryResult<boolean>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_risk_findings WHERE id = ?');
      const result = stmt.run(id);

      return { success: true, data: result.changes > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: false };
    }
  }

  /**
   * Delete all risk findings for an analysis
   */
  async deleteRiskFindingsByAnalysis(analysisId: string): Promise<IQueryResult<number>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const stmt = driver.prepare('DELETE FROM ma_risk_findings WHERE analysis_id = ?');
      const result = stmt.run(analysisId);

      return { success: true, data: result.changes };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: 0 };
    }
  }

  /**
   * Batch create risk findings
   */
  async createRiskFindings(inputs: CreateRiskFindingInput[]): Promise<IQueryResult<RiskFinding[]>> {
    try {
      const db = await getDatabase();
      const driver = db.getDriver();

      const findings: RiskFinding[] = [];
      const now = Date.now();

      const stmt = driver.prepare(`
        INSERT INTO ma_risk_findings (id, analysis_id, category, severity, score, title, description, evidence, recommendation, source_document_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = driver.transaction((items: CreateRiskFindingInput[]) => {
        for (const input of items) {
          const id = `risk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const finding: RiskFinding = {
            id,
            analysisId: input.analysisId,
            category: input.category,
            severity: input.severity,
            score: input.score,
            title: input.title,
            description: input.description,
            evidence: input.evidence,
            recommendation: input.recommendation,
            sourceDocumentId: input.sourceDocumentId,
            createdAt: now,
          };

          const row = riskFindingToRow(finding);
          stmt.run(
            row.id,
            row.analysis_id,
            row.category,
            row.severity,
            row.score,
            row.title,
            row.description,
            row.evidence,
            row.recommendation,
            row.source_document_id,
            row.created_at
          );

          findings.push(finding);
        }
      });

      insertMany(inputs);

      return { success: true, data: findings };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, data: [] };
    }
  }
}

// Singleton instance
let analysisRepositoryInstance: AnalysisRepository | null = null;

export function getAnalysisRepository(): AnalysisRepository {
  if (!analysisRepositoryInstance) {
    analysisRepositoryInstance = new AnalysisRepository();
  }
  return analysisRepositoryInstance;
}
