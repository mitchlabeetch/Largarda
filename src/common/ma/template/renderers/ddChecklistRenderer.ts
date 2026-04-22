/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Due Diligence Checklist Renderer
 *
 * Produces a structured DD checklist in markdown, organised by risk
 * category. The checklist is deterministic and driven by the existing
 * `RISK_CATEGORIES` from the M&A constants.
 *
 * Required variables: `dealId`, `dealName`
 * Optional variables: `focusAreas` (comma-separated categories to highlight)
 */

import type { RendererFn } from './types';
import { RISK_CATEGORIES, RISK_CATEGORY_LABELS, RISK_CATEGORY_DESCRIPTIONS } from '@/common/ma/constants';
import type { RiskCategory } from '@/common/ma/types';

/**
 * Standard DD checklist items per risk category. Each entry is a
 * `[item text, guidance text]` pair.
 */
const DD_CHECKLIST_ITEMS: Record<RiskCategory, Array<[string, string]>> = {
  financial: [
    ['Audited financial statements (last 3 years)', 'Obtain from target; verify auditor opinion'],
    ['Management accounts and budgets', 'Compare to audited figures; identify variances'],
    ['Revenue breakdown by segment / geography', 'Assess concentration risk'],
    ['Working capital analysis', 'Calculate NWC; identify seasonal patterns'],
    ['Capital expenditure plan', 'Distinguish maintenance vs growth capex'],
    ['Debt schedule and covenants', 'Review change-of-control provisions'],
    ['Tax returns and outstanding disputes', 'Identify potential exposures'],
  ],
  legal: [
    ['Corporate structure and organigram', 'Map all entities; identify dormant subs'],
    ['Material contracts and change-of-control clauses', 'Flag consents required on transfer'],
    ['Pending and threatened litigation', 'Obtain counsel opinion on merits and exposure'],
    ['IP portfolio: patents, trademarks, licences', 'Verify ownership; identify encumbrances'],
    ['Employment agreements and key-person clauses', 'Review non-compete and garden-leave terms'],
    ['Regulatory licences and permits', 'Confirm transferability on change of control'],
  ],
  operational: [
    ['Key supplier contracts and concentration', 'Assess single-source dependency risk'],
    ['Customer concentration analysis', 'Top-10 customer revenue share'],
    ['IT systems and data security posture', 'Review penetration test reports'],
    ['Business continuity and disaster recovery plan', 'Verify RTO / RPO targets'],
    ['Environmental compliance and permits', 'Identify remediation liabilities'],
    ['Insurance coverage review', 'Confirm adequacy of D&O, E&O, cyber policies'],
  ],
  regulatory: [
    ['Sector-specific regulatory status', 'Confirm licences are current and transferable'],
    ['Anti-money-laundering (AML) compliance', 'Review KYC / AML programme'],
    ['Data protection and GDPR compliance', 'Assess DPIAs, cross-border transfers, consent records'],
    ['Sanctions and export control screening', 'Screen target and key counterparties'],
    ['Sector merger control / antitrust filing', 'Determine notification thresholds and timelines'],
  ],
  reputational: [
    ['Media and press review (last 3 years)', 'Identify negative coverage patterns'],
    ['Online reviews and social media sentiment', 'Quantify reputation risk score'],
    ['ESG and sustainability disclosures', 'Review alignment with investor expectations'],
    ['Key personnel background checks', 'Verify integrity of management team'],
    ['Customer and supplier references', 'Obtain independent feedback on target'],
  ],
};

/**
 * Render a DD checklist document in markdown.
 */
export const renderDdChecklist: RendererFn = (variables) => {
  const dealName = String(variables.dealName ?? 'Target Company');
  const focusAreasRaw = variables.focusAreas ? String(variables.focusAreas) : '';
  const focusAreas = focusAreasRaw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const lines: string[] = [
    `# Due Diligence Checklist — ${dealName}`,
    '',
    `> This checklist covers the standard due diligence workstream for **${dealName}**.`,
    focusAreas.length > 0
      ? `> **Focus areas:** ${focusAreas.map((f) => RISK_CATEGORY_LABELS[f as RiskCategory] ?? f).join(', ')}`
      : '> All risk categories are included.',
    '',
    '---',
    '',
  ];

  for (const category of RISK_CATEGORIES) {
    const label = RISK_CATEGORY_LABELS[category];
    const description = RISK_CATEGORY_DESCRIPTIONS[category];
    const isHighlighted = focusAreas.length === 0 || focusAreas.includes(category);
    const items = DD_CHECKLIST_ITEMS[category];

    if (!isHighlighted) continue;

    lines.push(`## ${label}`, '');
    lines.push(`*${description}*`, '');
    lines.push('| # | Item | Guidance | Status |', '|---|------|----------|--------|');

    items.forEach(([item, guidance], idx) => {
      lines.push(`| ${idx + 1} | ${item} | ${guidance} | ☐ |`);
    });

    lines.push('', '---', '');
  }

  lines.push(
    '## Notes',
    '',
    '- Mark each item as complete (☑), in progress (⏳), or not applicable (N/A) as the workstream advances.',
    '- Items marked with guidance are suggestions; adapt to the specific deal context.',
    '- Attach supporting documents to each completed item for audit trail.',
    '',
    `*This checklist was generated by Largo M&A Assistant for deal: ${dealName}.*`
  );

  return lines.join('\n');
};
