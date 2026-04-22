/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Structure Validator Tests
 *
 * Coverage:
 * - Teaser structure validation (sections, word count, provenance)
 * - IM structure validation (comprehensive sections)
 * - Word count validation (min/max bounds)
 * - Provenance verification
 * - Multi-document batch validation
 * - Validation report formatting
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateDocumentStructure,
  isValidStructure,
  formatValidationReport,
  validateMultipleDocuments,
  TEASER_SECTIONS,
  IM_SECTIONS,
  STRUCTURE_RULES,
} from '@/common/ma/template/structureValidator';
import type { TemplateKey } from '@/common/ma/template/types';
import { hashContent } from '@/common/ma/template/provenance';

// ============================================================================
// Test Fixtures
// ============================================================================

function createProvenanceLabel(content: string): string {
  const hash = hashContent(content);
  return `\n---\nlargo-provenance:\n  template: tpl.teaser\n  flow-id: flow-123\n  prompt-version: v1.0.0\n  generated-at: 2025-01-01T00:00:00.000Z\n  duration-ms: 5000\n  content-sha256: ${hash}\n---`;
}

function createValidTeaser(): string {
  // Must be > 300 words with all required sections
  const content = `# Executive Summary

This is a compelling investment opportunity in the technology sector. The company represents an attractive acquisition target with significant growth potential and a strong market position. Investors will find this opportunity particularly appealing given the current market conditions and the company's strategic advantages.

## Investment Highlights
- Strong revenue growth of 25% year over year
- Market leading position in the enterprise software segment
- Experienced management team with proven track record
- Scalable business model with high margins

# Company Overview

The company is a leading software provider with over 10 years of experience serving enterprise clients across Europe and North America. It has established itself as a trusted partner for digital transformation initiatives and continues to innovate in the space.

## Business Description
Core business includes SaaS platforms and professional services delivery. The company serves mid-market to enterprise clients with comprehensive solutions that address critical business needs. Customer retention rates exceed 95% demonstrating strong product-market fit and customer satisfaction.

## Operations
Headquartered in Paris with offices in London and Berlin. The company employs 120 people including 45 engineers and maintains a strong culture of innovation.

# Market Position

The company holds a strong position in a rapidly growing market. Industry analysis indicates sustained demand for the company's core offerings with significant expansion opportunities.

## Industry Overview
The target market is growing at 15% CAGR with strong tailwinds from digital transformation initiatives. Enterprise software spending continues to increase as organizations prioritize efficiency and automation. The addressable market exceeds 10 billion euros annually.

## Competitive Landscape
Key competitors include established players and emerging startups. However the company maintains differentiation through proprietary technology and deep domain expertise. Customer switching costs are high creating natural moats around the business.

# Financial Highlights

The company has demonstrated consistent financial performance with strong growth and profitability metrics. Historical results provide confidence in future projections and investment returns.

## Revenue Performance
Annual revenue of 10 million euros with 25 percent year over year growth. Recurring revenue represents 80 percent of total providing visibility and stability.

## EBITDA
Strong margins at 20 percent EBITDA with improving unit economics as the business scales. Path to 25 percent margins over next 24 months.

## Key Metrics
- Annual Recurring Revenue: 10M euros
- Growth Rate: 25% YoY
- Gross Margin: 75%
- Customer Retention: 95%

# Investment Highlights

This opportunity offers compelling investment characteristics with multiple value creation levers and strategic appeal.

## Growth Opportunities
Expansion into new markets and product lines represents significant upside potential. International expansion into US and Asian markets could double addressable market. Adjacent product categories offer cross-sell opportunities.

## Investment Rationale
Strategic acquisition target with clear value creation potential. The company is positioned at the intersection of multiple growth trends. Management team has identified specific initiatives that can accelerate growth and improve margins.`;

  return content + createProvenanceLabel(content);
}

function createValidIM(): string {
  // Must be > 1500 words with all required sections
  const content = `# Executive Summary

This investment memorandum presents a compelling opportunity to acquire a leading enterprise software company positioned at the intersection of digital transformation and automation. The target company has demonstrated exceptional performance with consistent revenue growth, expanding margins, and strong market positioning in a rapidly growing addressable market.

The investment opportunity offers significant value creation potential through organic growth acceleration, operational improvements, and strategic add-on acquisitions. Management has identified multiple levers to double revenue within three to five years while maintaining industry-leading profitability metrics.

The transaction structure provides alignment between investors and management with meaningful rollover and performance-based earnout components. This memorandum details the company overview, market analysis, financial performance, growth strategy, risk factors, and transaction terms.

# Company Overview

## Business Description
Founded in 2010 and headquartered in Paris, France, the company provides enterprise software solutions that enable Fortune 500 and mid-market clients to automate critical business processes. The platform serves over 1,000 active customers across 25 countries with particular strength in European markets.

The core product offering combines workflow automation, document management, and analytics capabilities delivered through a modern cloud-native architecture. Customers typically achieve ROI within six months of implementation with measurable productivity gains and cost reductions.

The company maintains strong competitive positioning through proprietary technology, deep domain expertise, and long-standing customer relationships. Average customer tenure exceeds five years with consistent expansion revenue demonstrating product stickiness and customer satisfaction.

## History
The company was founded by two former management consultants who recognized the gap between enterprise needs and available solutions. Initially structured as a professional services firm, the founders invested heavily in product development beginning in 2012.

The pivot to SaaS business model occurred in 2015 following successful product-market validation with early adopters. The company achieved product-market fit in 2017 and has accelerated growth consistently since that milestone.

Key historical milestones include Series A financing in 2016, first international expansion in 2018, and achievement of operational profitability in 2020. The company has been cash flow positive for 36 consecutive quarters.

## Milestones and Achievements
Recognition as a leader in industry analyst reports for three consecutive years. Patent portfolio includes 12 granted patents with 8 additional applications pending. Industry awards for innovation and customer success demonstrate market validation.

# Market Analysis

## Industry Overview
The enterprise software market exceeds $500 billion globally with the specific automation segment representing approximately $50 billion annually. The addressable market for the company's solutions is growing at 20% CAGR driven by secular digital transformation trends.

Cloud migration continues to accelerate across all industries with enterprises prioritizing efficiency and automation initiatives. The COVID-19 pandemic permanently shifted attitudes toward remote work and digital processes, creating sustained demand tailwinds.

Market consolidation is actively occurring with strategics and private equity acquiring capabilities to build comprehensive platforms. The fragmented competitive landscape creates opportunities for consolidation plays with clear value creation potential.

## Market Trends
Several key trends are driving market growth and shaping competitive dynamics. Artificial intelligence and machine learning capabilities are becoming table stakes rather than differentiators. Integration requirements are increasing as customers seek unified platforms rather than point solutions.

Vertical specialization is emerging as a winning strategy with industry-specific solutions commanding premium pricing. Cybersecurity and compliance considerations are becoming primary selection criteria following increased regulatory scrutiny.

Customer expectations for consumer-grade user experiences are forcing legacy vendors to modernize or lose market share. The convergence of these trends creates favorable conditions for well-positioned players like the target company.

## Competitive Landscape
The competitive environment remains fragmented with no single dominant player holding more than 15% market share. Primary competitors include legacy enterprise vendors, emerging challengers, and in-house developed solutions.

The target company maintains differentiation through several sustainable advantages. Proprietary technology delivers superior performance at scale. Deep domain expertise accumulated over 14 years creates implementation accelerators that reduce time-to-value.

Strong customer relationships and switching costs create natural moats around the installed base. Referenceability and case studies provide competitive advantages in sales cycles against less established competitors.

## Competitive Positioning
Market position strengthened consistently over the past five years with share gains in all major segments. Win rates against primary competitors exceed 60% in competitive evaluations. Customer retention rates of 95% demonstrate strong product-market fit.

# Business Model

## Products and Services
The core platform offering provides comprehensive workflow automation delivered through cloud-native architecture. Key capabilities include visual process designers, integration connectors, document generation, approval workflows, and analytics dashboards.

Professional services support implementation, customization, and optimization engagements. Services revenue represents 15% of total and generates strong margins while ensuring customer success and expansion.

Training and certification programs build customer capability while creating additional revenue streams. The partner ecosystem includes 50 certified implementation partners extending reach without proportional cost increases.

## Revenue Streams
Subscription revenue represents 80% of total revenue with 95% annual retention rates. Average contract values have grown 15% annually through expansion and upsell initiatives. Pricing model aligns vendor success with customer outcomes.

Professional services contribute 15% of revenue with 40% gross margins. Services engagements typically lead to higher product adoption and faster expansion revenue recognition.

License fees from on-premise deployments represent 5% of revenue and declining as customers migrate to cloud delivery. Legacy maintenance revenue provides predictable cash flow from established relationships.

## Operations
Headquarters in Paris houses executive leadership, product development, and customer success teams. Satellite offices in London and Berlin support local market sales and service delivery. Remote work capabilities enable talent access beyond geographic constraints.

The company employs 120 people including 45 engineers organized in agile product teams. Sales organization includes 15 account executives supported by sales development and solutions engineering. Customer success team ensures high satisfaction and expansion rates.

Organizational culture emphasizes innovation, customer focus, and operational excellence. Employee satisfaction scores exceed industry benchmarks with retention rates above 90% for technical talent.

# Financial Information

## Historical Performance
Revenue grew from €5 million in 2021 to €10 million in 2023 representing a 40% compound annual growth rate. Growth has accelerated in recent quarters with Q4 2023 showing 50% year-over-year expansion.

Gross margins improved from 70% to 75% over the past three years through infrastructure optimization and pricing power. Operating leverage is evident with operating margins expanding from 10% to 20% over the same period.

Profitability has been consistently positive with net income margins of 15% in the most recent fiscal year. Cash generation is strong with operating cash flow exceeding net income due to subscription billing patterns.

## Balance Sheet
The company maintains a strong balance sheet with no debt and €3 million in cash and equivalents. Working capital is efficiently managed with negative cash conversion cycles due to advance billing practices.

Fixed asset investments are modest given the asset-light SaaS business model. Capital expenditures represent less than 5% of revenue primarily for computer equipment and office improvements.

Shareholder equity has grown consistently through retained earnings accumulation. The company has no outstanding warrants, options, or other dilutive securities that would impact acquisition economics.

## P&L Highlights
Gross margin of 75% reflects strong software economics and efficient delivery infrastructure. EBITDA margin of 20% demonstrates operational discipline and scalable business model characteristics.

Customer acquisition cost of €15,000 compares favorably to customer lifetime value of €120,000 indicating 8x LTV/CAC ratio. Payback period of 12 months enables rapid reinvestment in growth initiatives.

Average revenue per user of €2,400 annually has grown 10% per year through product enhancements and pricing optimization. Usage-based pricing components align revenue growth with customer value realization.

# Management Team

## Key Personnel
The Chief Executive Officer brings 15 years of industry experience including prior VP role at a major enterprise software vendor. Educational background includes MBA from leading European business school and engineering degree from top technical university.

The Chief Technology Officer holds a PhD in Computer Science from a prestigious research institution. Previous experience includes leading engineering organizations at two successful venture-backed startups with successful exits.

The Chief Revenue Officer joined from a competing vendor where she scaled revenue from €10 million to €100 million over five years. Deep enterprise sales expertise and extensive industry relationships.

## Leadership Team
The executive team collectively brings over 60 years of relevant industry experience across product development, sales, and operations. Team stability has been excellent with no voluntary departures in the past 24 months.

Board of Directors includes independent directors with relevant industry expertise and financial acumen. Governance practices meet or exceed standards for companies of this scale and maturity.

## Organizational Culture
Strong culture of innovation evidenced by regular product releases and patent filings. Customer-centric mindset reflected in high satisfaction scores and reference rates. Talent development focus with internal promotion rates exceeding 50%.

# Growth Strategy

## Strategic Outlook
The company has identified multiple vectors for continued growth acceleration. International expansion into US and Asian markets represents the largest near-term opportunity with established reference customers in both regions.

Product roadmap investments focus on artificial intelligence capabilities that enhance automation and predictive analytics. These enhancements command premium pricing and expand addressable use cases.

Strategic partnerships with complementary technology vendors create co-selling opportunities and integration advantages. The partner channel currently contributes 20% of new business with growth potential to 40%.

## Expansion Plans
Revenue growth target of 50% annually over the next three years supported by specific initiatives. Sales capacity expansion with 10 additional account executives planned for 2024.

Product line extensions into adjacent workflow categories expand addressable spend within existing accounts. Pricing optimization initiatives identified to improve average contract values by 15%.

Geographic expansion includes dedicated US sales team and partnerships for Asian market access. International revenue expected to grow from 20% to 40% of total over three years.

## Value Creation Levers
Management has identified specific operational improvements to drive margin expansion. Sales efficiency improvements through better targeting and enablement should reduce customer acquisition costs.

Infrastructure optimization leveraging economies of scale will improve gross margins by 3-5 percentage points. Professional services margin improvement through partner leverage and standardization.

Strategic acquisitions of smaller competitors or complementary capabilities can accelerate growth and expand market position. Active pipeline of opportunities under evaluation.

# Risk Factors

## Market Risks
Competitive pressure from well-funded rivals could impact pricing and win rates. However, the company's established position and differentiated capabilities provide defensive moats.

Economic downturn impacts on IT spending represent a cyclical risk though automation solutions often see increased demand during efficiency-focused periods. Recurring revenue model provides some insulation from short-term volatility.

Technology disruption from AI and other emerging technologies could require continued investment to maintain competitive position. The company has demonstrated ability to evolve product capabilities proactively.

## Operational Risks
Key person dependencies exist in technical leadership roles though succession planning and documentation mitigate concentration risk. The company has been investing in leadership development and organizational capabilities.

Talent retention in competitive labor markets remains an ongoing challenge addressed through compensation, culture, and career development programs. Engineering team retention has exceeded 90% annually.

Customer concentration with top 5 clients representing 40% of revenue creates some dependency though diversification is actively occurring. No single customer exceeds 15% of total revenue currently.

## Financial Risks
Currency exposure from international operations represents approximately 20% of revenue denominated in non-EUR currencies. Natural hedging through local costs provides partial mitigation.

Subscription renewal rates while currently strong could be impacted by competitive offerings or economic conditions. Historical retention rates of 95% provide confidence in stability.

Capital requirements for growth investments may require additional funding though current cash position and cash flow generation provide substantial runway.

# Transaction Overview

## Deal Structure
The proposed transaction involves 100% equity acquisition with management team rolling over 20% of proceeds into new equity. This structure ensures alignment and incentivizes continued performance.

Earnout provisions tied to 3-year revenue and EBITDA milestones provide additional upside potential while mitigating near-term execution risk. Earnout represents 15% of total consideration capped at specific thresholds.

Closing conditions include customary due diligence, financing, and regulatory approvals. Target closing timeline of 90 days from signing subject to completion of confirmatory due diligence.

## Investment Thesis
Platform consolidation play in a fragmented market with clear opportunities for add-on acquisitions. The company provides an excellent foundation for building a comprehensive automation platform.

Operational improvements including sales efficiency, pricing optimization, and infrastructure leverage can expand margins while maintaining growth. Management has identified specific initiatives with quantified impact.

Cross-selling opportunities between the base platform and adjacent solutions can accelerate revenue growth in existing accounts. The installed base of 1,000 customers provides substantial expansion potential.

## Use of Proceeds
Primary capital deployment includes growth investments in sales capacity, product development, and international expansion. Approximately 60% of capital committed to organic growth initiatives.

Secondary component provides partial liquidity to founding shareholders while maintaining meaningful ownership to ensure continued commitment. Founders will remain in executive roles with multi-year employment agreements.

Reserved capital for strategic acquisitions of smaller competitors or complementary technology capabilities. Active pipeline under evaluation with two signed LOIs subject to confirmatory due diligence.

## Transaction Terms
Enterprise value based on revenue multiples consistent with comparable transactions and public company benchmarks. Structure provides attractive entry valuation with significant upside potential.

Financing committed from leading financial institutions with flexibly structured debt facilities. Equity contribution from sponsor provides sufficient capital for growth investments and acquisition reserves.

Management incentive plan allocates 10% of equity to key employees post-close with four-year vesting schedules. Compensation packages benchmarked to market to ensure talent retention.`;

  return content + createProvenanceLabel(content);
}

function createInvalidTeaserShort(): string {
  // Under 300 words minimum
  const content =
    'This is too short for a valid teaser document. It lacks the required sections and does not meet minimum word count requirements.';
  return content + createProvenanceLabel(content);
}

function createInvalidTeaserMissingSections(): string {
  // Has provenance but missing required sections (>300 words, no matching patterns)
  const content = `# Random Section

This content does not match the required section patterns for a teaser document. It is intentionally missing all required sections like company overview and market position.

This paragraph provides additional text to ensure we have enough words for the word count check, but since the section headers do not match the expected patterns, the validation should still fail with missing sections errors.

# Another Section

More content here that also does not match required patterns. The word count needs to exceed three hundred words to pass the minimum word count requirement but this document should still fail validation due to missing required sections.

The sector continues to grow rapidly with many prospects available for qualified buyers. Market conditions remain favorable and this represents a compelling value creation for the right strategic or financial buyer.

Further elaboration on random topics ensures we meet the minimum word threshold while maintaining the property that no required sections are detected by the pattern matching algorithm. Additional sentences about general business topics add more words without triggering pattern matches.

The following text adds additional word count: Business operations require careful planning and execution. Success depends on multiple factors including timing, execution quality, and available resources. Management teams must balance short-term objectives with long-term strategic goals.

More filler text to ensure we exceed three hundred words: Organizational design affects productivity and employee satisfaction. Effective communication channels enable better coordination across departments. Regular performance reviews help identify areas for improvement and celebrate achievements.`;
  return content + createProvenanceLabel(content);
}

function createInvalidTeaserNoProvenance(): string {
  return `# Executive Summary

This has no provenance label.`;
}

// ============================================================================
// Tests
// ============================================================================

describe('Structure Validator', () => {
  // --------------------------------------------------------------------------
  // Teaser Validation
  // --------------------------------------------------------------------------

  describe('teaser validation', () => {
    it('validates a complete teaser as valid', () => {
      const content = createValidTeaser();
      const result = validateDocumentStructure(content, 'tpl.teaser');

      expect(result.valid).toBe(true);
      expect(result.templateKey).toBe('tpl.teaser');
      expect(result.errors).toHaveLength(0);
    });

    it('identifies all required teaser sections', () => {
      const content = createValidTeaser();
      const result = validateDocumentStructure(content, 'tpl.teaser');

      expect(result.sectionsFound).toContain('executiveSummary');
      expect(result.sectionsFound).toContain('companyOverview');
      expect(result.sectionsFound).toContain('marketPosition');
      expect(result.sectionsFound).toContain('financialHighlights');
      expect(result.sectionsFound).toContain('investmentHighlights');
    });

    it('reports missing required sections', () => {
      const content = createInvalidTeaserMissingSections();
      const result = validateDocumentStructure(content, 'tpl.teaser');

      expect(result.valid).toBe(false);
      expect(result.sectionsMissing.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('Required section missing'))).toBe(true);
    });

    it('enforces minimum word count for teaser', () => {
      const content = createInvalidTeaserShort();
      const result = validateDocumentStructure(content, 'tpl.teaser');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('too short'))).toBe(true);
      expect(result.metadata.wordCount).toBeLessThan(300);
    });

    it('validates word count within bounds', () => {
      const content = createValidTeaser();
      const result = validateDocumentStructure(content, 'tpl.teaser');

      expect(result.metadata.wordCount).toBeGreaterThanOrEqual(300);
      expect(result.metadata.wordCount).toBeLessThanOrEqual(1500);
    });

    it('requires provenance label', () => {
      const content = createInvalidTeaserNoProvenance();
      const result = validateDocumentStructure(content, 'tpl.teaser');

      expect(result.valid).toBe(false);
      expect(result.metadata.hasProvenance).toBe(false);
      expect(result.errors).toContain('Document missing provenance label');
    });
  });

  // --------------------------------------------------------------------------
  // IM Validation
  // --------------------------------------------------------------------------

  describe('IM validation', () => {
    it('validates a complete IM as valid', () => {
      const content = createValidIM();
      const result = validateDocumentStructure(content, 'tpl.im');

      expect(result.valid).toBe(true);
      expect(result.templateKey).toBe('tpl.im');
      expect(result.errors).toHaveLength(0);
    });

    it('identifies all required IM sections', () => {
      const content = createValidIM();
      const result = validateDocumentStructure(content, 'tpl.im');

      const requiredSections = [
        'executiveSummary',
        'companyOverview',
        'marketAnalysis',
        'businessModel',
        'financialInformation',
        'managementTeam',
        'growthStrategy',
        'riskFactors',
        'transactionOverview',
      ];

      for (const section of requiredSections) {
        expect(result.sectionsFound).toContain(section);
      }
    });

    it('enforces minimum word count for IM', () => {
      const shortContent = 'Too short for an IM.' + createProvenanceLabel('Too short for an IM.');
      const result = validateDocumentStructure(shortContent, 'tpl.im');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('too short'))).toBe(true);
    });

    it('validates IM word count within bounds', () => {
      const content = createValidIM();
      const result = validateDocumentStructure(content, 'tpl.im');

      expect(result.metadata.wordCount).toBeGreaterThanOrEqual(1500);
      expect(result.metadata.wordCount).toBeLessThanOrEqual(10000);
    });
  });

  // --------------------------------------------------------------------------
  // Structure Rules
  // --------------------------------------------------------------------------

  describe('structure rules', () => {
    it('has defined rules for all marketing templates', () => {
      expect(STRUCTURE_RULES['tpl.teaser']).toBeDefined();
      expect(STRUCTURE_RULES['tpl.im']).toBeDefined();
      expect(STRUCTURE_RULES['tpl.nda']).toBeDefined();
    });

    it('teaser has correct section definitions', () => {
      expect(TEASER_SECTIONS.length).toBeGreaterThan(0);
      for (const section of TEASER_SECTIONS) {
        expect(section.name).toBeDefined();
        expect(section.patterns.length).toBeGreaterThan(0);
        expect(section.required).toBeDefined();
      }
    });

    it('IM has comprehensive section definitions', () => {
      expect(IM_SECTIONS.length).toBeGreaterThan(TEASER_SECTIONS.length);
      for (const section of IM_SECTIONS) {
        expect(section.name).toBeDefined();
        expect(section.patterns.length).toBeGreaterThan(0);
      }
    });

    it('all templates require provenance', () => {
      for (const [key, rules] of Object.entries(STRUCTURE_RULES)) {
        expect(rules.requireProvenance).toBe(true);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Word Count
  // --------------------------------------------------------------------------

  describe('word count', () => {
    it('counts words excluding markdown syntax', () => {
      const content = createValidTeaser();
      const result = validateDocumentStructure(content, 'tpl.teaser');

      expect(result.metadata.wordCount).toBeGreaterThan(0);
    });

    it('excludes code blocks from word count', () => {
      const contentWithCode =
        `# Test
\`\`\`
some code here
more code
\`\`\`
Regular text.` + createProvenanceLabel('');

      const result = validateDocumentStructure(contentWithCode, 'tpl.teaser');
      // Should count "Test" and "Regular text" but not code
      expect(result.metadata.wordCount).toBeLessThan(10);
    });

    it('excludes provenance from word count', () => {
      const baseContent = 'This is a test document.';
      const withProvenance = baseContent + createProvenanceLabel(baseContent);

      const result = validateDocumentStructure(withProvenance, 'tpl.teaser');
      expect(result.metadata.wordCount).toBeLessThan(10);
    });
  });

  // --------------------------------------------------------------------------
  // isValidStructure shortcut
  // --------------------------------------------------------------------------

  describe('isValidStructure', () => {
    it('returns true for valid teaser', () => {
      const content = createValidTeaser();
      expect(isValidStructure(content, 'tpl.teaser')).toBe(true);
    });

    it('returns false for invalid teaser', () => {
      const content = createInvalidTeaserShort();
      expect(isValidStructure(content, 'tpl.teaser')).toBe(false);
    });

    it('returns true for valid IM', () => {
      const content = createValidIM();
      expect(isValidStructure(content, 'tpl.im')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Validation Report Formatting
  // --------------------------------------------------------------------------

  describe('formatValidationReport', () => {
    it('includes template key in report', () => {
      const content = createValidTeaser();
      const result = validateDocumentStructure(content, 'tpl.teaser');
      const report = formatValidationReport(result);

      expect(report).toContain('tpl.teaser');
    });

    it('includes pass/fail status', () => {
      const validResult = validateDocumentStructure(createValidTeaser(), 'tpl.teaser');
      const invalidResult = validateDocumentStructure(createInvalidTeaserShort(), 'tpl.teaser');

      expect(formatValidationReport(validResult)).toContain('PASS');
      expect(formatValidationReport(invalidResult)).toContain('FAIL');
    });

    it('includes section counts', () => {
      const content = createValidTeaser();
      const result = validateDocumentStructure(content, 'tpl.teaser');
      const report = formatValidationReport(result);

      expect(report).toContain('Sections Found:');
      expect(report).toContain(String(result.metadata.sectionCount));
    });

    it('includes word count', () => {
      const result = validateDocumentStructure(createValidTeaser(), 'tpl.teaser');
      const report = formatValidationReport(result);

      expect(report).toContain('Word Count:');
      expect(report).toContain(String(result.metadata.wordCount));
    });

    it('lists errors when present', () => {
      const result = validateDocumentStructure(createInvalidTeaserShort(), 'tpl.teaser');
      const report = formatValidationReport(result);

      expect(report).toContain('Errors:');
      for (const error of result.errors) {
        expect(report).toContain(error);
      }
    });

    it('lists warnings when present', () => {
      // Create content that triggers warnings (optional sections missing)
      const content = createValidTeaser();
      const result = validateDocumentStructure(content, 'tpl.teaser');

      const report = formatValidationReport(result);
      if (result.warnings.length > 0) {
        expect(report).toContain('Warnings:');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Batch Validation
  // --------------------------------------------------------------------------

  describe('validateMultipleDocuments', () => {
    it('validates multiple documents', () => {
      const documents = [
        { content: createValidTeaser(), templateKey: 'tpl.teaser' as TemplateKey },
        { content: createValidIM(), templateKey: 'tpl.im' as TemplateKey },
      ];

      const results = validateMultipleDocuments(documents);

      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(true);
      expect(results[0].templateKey).toBe('tpl.teaser');
      expect(results[1].valid).toBe(true);
      expect(results[1].templateKey).toBe('tpl.im');
    });

    it('validates mixed valid and invalid documents', () => {
      const documents = [
        { content: createValidTeaser(), templateKey: 'tpl.teaser' as TemplateKey },
        { content: createInvalidTeaserShort(), templateKey: 'tpl.teaser' as TemplateKey },
      ];

      const results = validateMultipleDocuments(documents);

      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
    });

    it('handles empty document list', () => {
      const results = validateMultipleDocuments([]);
      expect(results).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles empty content', () => {
      const result = validateDocumentStructure('', 'tpl.teaser');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('handles whitespace-only content', () => {
      const result = validateDocumentStructure('   \n\n   ', 'tpl.teaser');

      expect(result.valid).toBe(false);
      expect(result.metadata.wordCount).toBe(0);
    });

    it('handles content with no headers', () => {
      const content = 'This is just plain text without any sections.' + createProvenanceLabel('');
      const result = validateDocumentStructure(content, 'tpl.teaser');

      expect(result.metadata.sectionCount).toBe(0);
      expect(result.sectionsMissing.length).toBeGreaterThan(0);
    });

    it('handles malformed provenance', () => {
      const content = 'Some content\n---\ninvalid provenance\n---';
      const result = validateDocumentStructure(content, 'tpl.teaser');

      expect(result.metadata.hasProvenance).toBe(false);
    });
  });
});
