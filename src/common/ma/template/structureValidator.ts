/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Document Structure Validator
 *
 * Validates that generated marketing documents (teaser, IM) conform to
 * expected structure and contain required sections. Provides detailed
 * validation reports for review workflows.
 *
 * Used for:
 * - Structure consistency coverage in tests
 * - Pre-review validation of generated documents
 * - Quality gates before document export
 */

import type { TemplateKey } from './types';

// ============================================================================
// Types
// ============================================================================

export type DocumentSection = {
  name: string;
  required: boolean;
  patterns: RegExp[];
  minLength?: number;
};

export type StructureValidationResult = {
  valid: boolean;
  templateKey: TemplateKey;
  sectionsFound: string[];
  sectionsMissing: string[];
  sectionsIncomplete: string[];
  errors: string[];
  warnings: string[];
  metadata: {
    wordCount: number;
    sectionCount: number;
    hasProvenance: boolean;
  };
};

export type StructureRuleSet = {
  templateKey: TemplateKey;
  sections: DocumentSection[];
  minWordCount?: number;
  maxWordCount?: number;
  requireProvenance: boolean;
};

// ============================================================================
// Structure Rules by Template
// ============================================================================

export const TEASER_SECTIONS: DocumentSection[] = [
  {
    name: 'executiveSummary',
    required: true,
    patterns: [/executive\s+summary/i, /overview/i, /investment\s+highlight/i, /opportunity/i],
    minLength: 50,
  },
  {
    name: 'companyOverview',
    required: true,
    patterns: [/company\s+(overview|profile)/i, /business\s+description/i, /the\s+company/i],
    minLength: 100,
  },
  {
    name: 'marketPosition',
    required: true,
    patterns: [/market\s+(position|overview)/i, /industry/i, /sector/i, /competitive\s+landscape/i],
    minLength: 80,
  },
  {
    name: 'financialHighlights',
    required: true,
    patterns: [/financial\s+(highlights|summary)/i, /key\s+metrics/i, /revenue/i, /ebitda/i, /performance/i],
    minLength: 50,
  },
  {
    name: 'investmentHighlights',
    required: true,
    patterns: [/investment\s+(highlights|rationale)/i, /why\s+invest/i, /growth\s+(opportunities|drivers)/i],
    minLength: 80,
  },
  {
    name: 'contactInformation',
    required: false,
    patterns: [/contact/i, /advisor/i, /for\s+more\s+information/i],
  },
];

export const IM_SECTIONS: DocumentSection[] = [
  {
    name: 'executiveSummary',
    required: true,
    patterns: [/executive\s+summary/i, /investment\s+opportunity/i],
    minLength: 100,
  },
  {
    name: 'companyOverview',
    required: true,
    patterns: [/company\s+(overview|profile)/i, /business\s+description/i, /history/i],
    minLength: 200,
  },
  {
    name: 'marketAnalysis',
    required: true,
    patterns: [/market\s+(analysis|overview)/i, /industry\s+analysis/i, /market\s+(size|trends)/i],
    minLength: 200,
  },
  {
    name: 'businessModel',
    required: true,
    patterns: [/business\s+model/i, /products?\s+and\s+services?/i, /revenue\s+streams/i, /operations/i],
    minLength: 150,
  },
  {
    name: 'financialInformation',
    required: true,
    patterns: [
      /financial\s+(information|statements)/i,
      /historical\s+performance/i,
      /financial\s+highlights/i,
      /balance\s+sheet/i,
      /p\.?\s*l/i,
    ],
    minLength: 200,
  },
  {
    name: 'managementTeam',
    required: true,
    patterns: [/management\s+(team|biographies)/i, /key\s+personnel/i, /leadership/i],
    minLength: 100,
  },
  {
    name: 'growthStrategy',
    required: true,
    patterns: [/growth\s+(strategy|plan)/i, /strategic\s+outlook/i, /expansion/i],
    minLength: 150,
  },
  {
    name: 'riskFactors',
    required: true,
    patterns: [/risk\s+(factors|considerations)/i, /risk\s+analysis/i, /potential\s+risks/i],
    minLength: 100,
  },
  {
    name: 'transactionOverview',
    required: true,
    patterns: [
      /transaction\s+(overview|structure)/i,
      /deal\s+structure/i,
      /investment\s+thesis/i,
      /use\s+of\s+(proceeds|funds)/i,
    ],
    minLength: 100,
  },
  {
    name: 'nextSteps',
    required: false,
    patterns: [/next\s+steps/i, /process/i, /timeline/i, /contact/i],
  },
];

export const STRUCTURE_RULES: Record<TemplateKey, StructureRuleSet> = {
  'tpl.teaser': {
    templateKey: 'tpl.teaser',
    sections: TEASER_SECTIONS,
    minWordCount: 300,
    maxWordCount: 1500,
    requireProvenance: true,
  },
  'tpl.im': {
    templateKey: 'tpl.im',
    sections: IM_SECTIONS,
    minWordCount: 1500,
    maxWordCount: 10000,
    requireProvenance: true,
  },
  'tpl.nda': {
    templateKey: 'tpl.nda',
    sections: [],
    requireProvenance: true,
  },
  'tpl.loi': {
    templateKey: 'tpl.loi',
    sections: [],
    requireProvenance: true,
  },
  'tpl.dd': {
    templateKey: 'tpl.dd',
    sections: [],
    requireProvenance: true,
  },
  'tpl.valuation': {
    templateKey: 'tpl.valuation',
    sections: [],
    requireProvenance: true,
  },
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Extract all sections found in document content based on patterns.
 */
function findSections(content: string, sections: DocumentSection[]): Map<string, { found: boolean; length: number }> {
  const results = new Map<string, { found: boolean; length: number }>();

  for (const section of sections) {
    let found = false;
    let matchedLength = 0;

    for (const pattern of section.patterns) {
      const match = content.match(pattern);
      if (match) {
        found = true;
        // Estimate section length by finding next section header or end of doc
        const matchIndex = match.index ?? 0;
        const nextSectionPattern = /(?:^|\n)(?:#{1,3}\s+|#{1,3}\s+[\w\s]+\n|(?:[A-Z][\w\s]{2,50}):\s*\n)/m;
        const remainingContent = content.slice(matchIndex + match[0].length);
        const nextMatch = remainingContent.match(nextSectionPattern);
        matchedLength = nextMatch ? (nextMatch.index ?? remainingContent.length) : remainingContent.length;
        break;
      }
    }

    results.set(section.name, { found, length: matchedLength });
  }

  return results;
}

/**
 * Count words in content (excluding markdown syntax).
 */
function countWords(content: string): number {
  // Remove markdown syntax
  const cleanContent = content
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .replace(/`[^`]+`/g, '') // Inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/[#*_~]/g, '') // Formatting
    .replace(/---\n[\s\S]*?---/g, ''); // Front matter / provenance

  const words = cleanContent
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  return words.length;
}

/**
 * Check if content has a provenance label.
 */
function hasProvenanceLabel(content: string): boolean {
  return /---\nlargo-provenance:/.test(content);
}

/**
 * Validate document structure against rules for the template type.
 */
export function validateDocumentStructure(content: string, templateKey: TemplateKey): StructureValidationResult {
  const ruleSet = STRUCTURE_RULES[templateKey];
  const sectionsFound: string[] = [];
  const sectionsMissing: string[] = [];
  const sectionsIncomplete: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check provenance
  const hasProvenance = hasProvenanceLabel(content);
  if (ruleSet.requireProvenance && !hasProvenance) {
    errors.push('Document missing provenance label');
  }

  // Word count validation
  const wordCount = countWords(content);
  if (ruleSet.minWordCount && wordCount < ruleSet.minWordCount) {
    errors.push(`Document too short: ${wordCount} words (minimum ${ruleSet.minWordCount})`);
  }
  if (ruleSet.maxWordCount && wordCount > ruleSet.maxWordCount) {
    warnings.push(`Document exceeds recommended length: ${wordCount} words (maximum ${ruleSet.maxWordCount})`);
  }

  // Section validation
  if (ruleSet.sections.length > 0) {
    const sectionResults = findSections(content, ruleSet.sections);

    for (const section of ruleSet.sections) {
      const result = sectionResults.get(section.name);
      if (!result?.found) {
        if (section.required) {
          sectionsMissing.push(section.name);
          errors.push(`Required section missing: ${section.name}`);
        } else {
          warnings.push(`Optional section not found: ${section.name}`);
        }
      } else {
        sectionsFound.push(section.name);
        if (section.minLength && result.length < section.minLength) {
          sectionsIncomplete.push(section.name);
          warnings.push(
            `Section "${section.name}" may be incomplete (${result.length} chars, expected ${section.minLength})`
          );
        }
      }
    }
  }

  const valid = errors.length === 0;

  return {
    valid,
    templateKey,
    sectionsFound,
    sectionsMissing,
    sectionsIncomplete,
    errors,
    warnings,
    metadata: {
      wordCount,
      sectionCount: sectionsFound.length,
      hasProvenance,
    },
  };
}

/**
 * Quick check if document passes structure validation.
 */
export function isValidStructure(content: string, templateKey: TemplateKey): boolean {
  const result = validateDocumentStructure(content, templateKey);
  return result.valid;
}

/**
 * Get validation summary as a human-readable string.
 */
export function formatValidationReport(result: StructureValidationResult): string {
  const lines: string[] = [
    `Structure Validation Report for ${result.templateKey}`,
    `Status: ${result.valid ? 'PASS' : 'FAIL'}`,
    `Word Count: ${result.metadata.wordCount}`,
    `Sections Found: ${result.metadata.sectionCount}`,
    `Provenance: ${result.metadata.hasProvenance ? 'Yes' : 'No'}`,
    '',
  ];

  if (result.sectionsFound.length > 0) {
    lines.push('Sections Found:');
    for (const section of result.sectionsFound) {
      const incomplete = result.sectionsIncomplete.includes(section);
      lines.push(`  ${incomplete ? '⚠️' : '✓'} ${section}${incomplete ? ' (incomplete)' : ''}`);
    }
    lines.push('');
  }

  if (result.sectionsMissing.length > 0) {
    lines.push('Sections Missing:');
    for (const section of result.sectionsMissing) {
      lines.push(`  ✗ ${section}`);
    }
    lines.push('');
  }

  if (result.errors.length > 0) {
    lines.push('Errors:');
    for (const error of result.errors) {
      lines.push(`  ✗ ${error}`);
    }
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push('Warnings:');
    for (const warning of result.warnings) {
      lines.push(`  ⚠️ ${warning}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Batch validate multiple documents.
 */
export function validateMultipleDocuments(
  documents: Array<{ content: string; templateKey: TemplateKey }>
): Array<StructureValidationResult> {
  return documents.map((doc) => validateDocumentStructure(doc.content, doc.templateKey));
}
