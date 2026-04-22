# Assistant Customization Guide

> **Version**: 1.9.16 | **Creating and Customizing AI Assistants**

## Table of Contents

1. [Understanding Assistants](#1-understanding-assistants)
2. [Built-in Assistants](#2-built-in-assistants)
3. [Creating Custom Assistants](#3-creating-custom-assistants)
4. [System Prompts](#4-system-prompts)
5. [Assistant Configuration](#5-assistant-configuration)
6. [Tools and Capabilities](#6-tools-and-capabilities)
7. [Exporting and Sharing](#7-exporting-and-sharing)

---

## 1. Understanding Assistants

### What is an Assistant?

An **assistant** in Largo is a configured AI persona with:

- **System prompt**: Defines behavior, expertise, and constraints
- **Model selection**: Which LLM to use (Claude, GPT-4, Gemini)
- **Parameters**: Temperature, max tokens, etc.
- **Tools**: Available capabilities (MCP tools, skills)
- **Context**: M&A domain knowledge and frameworks

### Assistant vs Agent

| Feature         | Assistant                   | Agent                         |
| --------------- | --------------------------- | ----------------------------- |
| **Scope**       | Single conversation         | Multi-step tasks              |
| **Autonomy**    | Reactive (responds to user) | Proactive (self-directed)     |
| **Persistence** | Session-only                | Can run in background         |
| **Use case**    | Q&A, analysis               | Research, document generation |

---

## 2. Built-in Assistants

### M&A Partner

**Purpose**: Strategic deal advice and process guidance

**System Prompt Excerpt**:

```
You are an experienced M&A advisor specializing in French
small & mid-cap transactions. Follow the 4-phase framework:
Approche → LOI → Due Diligence → Closing. Apply the 10 Golden
Rules of M&A. Provide practical, actionable advice.
```

**Best for**:

- Deal strategy discussions
- Negotiation tactics
- Process management
- Risk assessment

**Default model**: Claude 3.5 Sonnet

### Research Analyst

**Purpose**: Company and market intelligence

**System Prompt Excerpt**:

```
You are a research analyst specializing in French companies.
You have access to SIRENE, Pappers, and Infogreffe databases.
Provide factual, sourced information. Always cite your sources.
```

**Best for**:

- Company lookups
- Sector analysis
- Peer comparisons
- Regulatory checks

**Default model**: Claude 3.5 Sonnet

### Valuation Specialist

**Purpose**: Financial modeling and valuation

**System Prompt Excerpt**:

```
You are a valuation expert specializing in French M&A.
Use multiples method, DCF, ANR, and comparable transactions.
Provide sensitivity analysis and football field summaries.
```

**Best for**:

- Company valuations
- Financial modeling
- Price negotiation support
- Sensitivity analysis

**Default model**: Claude 3.5 Sonnet

---

## 3. Creating Custom Assistants

### Via UI

1. Go to **Settings > Assistants > New Assistant**
2. Configure basic settings:
   - Name (e.g., "Tech Sector Specialist")
   - Description
   - Icon/Avatar
3. Select AI model
4. Write system prompt
5. Configure parameters
6. Enable/disable tools
7. Click **Save**

### Via JSON Configuration

Create a file in `~/.largo/assistants/custom-assistant.json`:

```json
{
  "id": "tech-sector-specialist",
  "name": "Tech Sector Specialist",
  "description": "Expert in French technology company valuations",
  "systemPrompt": "You are a specialist in French technology sector M&A...",
  "model": "claude-3-5-sonnet-20241022",
  "temperature": 0.3,
  "maxTokens": 4096,
  "tools": {
    "mcp": ["filesystem", "web-search", "postgres"],
    "skills": ["valuation", "sector-analysis"]
  },
  "context": {
    "domain": "technology",
    "region": "france",
    "specialties": ["saas", "fintech", "ecommerce"]
  }
}
```

### Via Extension

Extensions can contribute assistants via manifest:

```json
{
  "contributes": {
    "assistants": [
      {
        "id": "legal-advisor",
        "name": "Legal Advisor",
        "description": "French M&A legal specialist",
        "systemPrompt": "You are a French M&A legal expert...",
        "model": "claude-3-5-sonnet-20241022",
        "icon": "./assets/legal-icon.png"
      }
    ]
  }
}
```

---

## 4. System Prompts

### Best Practices

**1. Be Specific**:

```
Good:  "You are a valuation expert specializing in French
        software companies with 5-50M EUR revenue."
Bad:   "You are a finance expert."
```

**2. Define Constraints**:

```
Always:
- Cite sources for financial data
- Provide ranges, not point estimates
- Note key assumptions explicitly

Never:
- Provide investment advice
- Guarantee valuations
- Share confidential client data
```

**3. Include Domain Knowledge**:

```
Key French M&A Terms:
- EBE = EBITDA (Excédent Brut d'Exploitation)
- CA = Revenue (Chiffre d'Affaires)
- BFR = Working Capital (Besoin en Fonds de Roulement)

4-Phase Framework:
1. Approche: Initial contact, NDA, teaser
2. LOI: Non-binding offer, exclusivity
3. Due Diligence: Financial, legal, operational
4. Closing: SPA, payment, integration
```

**4. Set Output Format**:

```
Structure your responses as:
1. Executive Summary (2-3 sentences)
2. Detailed Analysis
3. Key Assumptions
4. Data Sources
5. Next Steps / Recommendations
```

### M&A-Specific Prompt Elements

**French Market Context**:

```
You specialize in French M&A (small & mid-cap):
- Target companies: 2-250M EUR revenue
- Typical structures: Asset deals vs. share deals
- Regulatory: AMF, DGCCRF considerations
- Tax: IS (corporate tax), IFI (wealth tax)
```

**10 Golden Rules**:

```
Always consider the 10 Golden Rules of M&A:
1. Strategic rationale first
2. Cultural fit matters
3. Due diligence is insurance
4. Valuation is range, not point
5. Structure for future flexibility
6. Plan integration early
7. Communicate transparently
8. Manage stakeholder expectations
9. Keep momentum
10. Have a walk-away price
```

### Prompt Templates

**Sector Specialist Template**:

```
You are a specialist in the {sector} sector M&A in France.

Sector Characteristics:
- Typical multiples: {multiples}
- Key value drivers: {drivers}
- Regulatory considerations: {regulations}
- Common deal structures: {structures}

Provide analysis aligned with French market practices.
```

**Process Advisor Template**:

```
You are an M&A process advisor. The user is currently in
phase: {phase} of the 4-phase framework.

Current Phase: {phase_description}
Typical Duration: {duration}
Key Deliverables: {deliverables}
Common Pitfalls: {pitfalls}

Guide the user through this phase with actionable advice.
```

---

## 5. Assistant Configuration

### Model Selection

| Model                 | Best For                      | Cost   | Speed     |
| --------------------- | ----------------------------- | ------ | --------- |
| **Claude 3.5 Sonnet** | Complex analysis, reasoning   | Medium | Fast      |
| **Claude 3 Opus**     | Deep analysis, long documents | High   | Moderate  |
| **GPT-4o**            | General purpose, formatting   | Medium | Fast      |
| **GPT-4**             | Detailed analysis             | High   | Moderate  |
| **Gemini Pro**        | Fast queries, research        | Low    | Very Fast |

### Parameters

**Temperature** (0.0 - 1.0):

- `0.0-0.3`: Deterministic, consistent (valuation, legal)
- `0.4-0.6`: Balanced (general M&A advice)
- `0.7-1.0`: Creative, exploratory (brainstorming)

**Max Tokens**:

- Short responses: 1024
- Standard analysis: 2048-4096
- Long documents: 8192+

**Top P**: Usually 1.0 (use temperature instead)

### Context Window

Manage context efficiently:

```json
{
  "contextManagement": {
    "strategy": "sliding_window",
    "maxMessages": 20,
    "summarizeAfter": 10
  }
}
```

---

## 6. Tools and Capabilities

### Enabling Tools

Configure in assistant settings:

```json
{
  "tools": {
    "mcp": {
      "filesystem": true,
      "web_search": true,
      "database": true
    },
    "skills": {
      "valuation": true,
      "sector_analysis": true,
      "document_generation": true
    },
    "native": {
      "calculator": true,
      "code_interpreter": true
    }
  }
}
```

### MCP Tool Integration

**Example**: Financial data retrieval

```
User: "Get the latest revenue for Société X"

Assistant uses:
- mcp.pappers.lookup_company(SIREN)
- mcp.pappers.get_financials(year)

Response: "Based on Pappers data, Société X reported
€12.5M revenue in 2023 (source: Pappers, SIREN 123 456 789)."
```

### Custom Skills

Register custom skills for specialized tasks:

```json
{
  "skills": [
    {
      "id": "custom-valuation",
      "name": "Custom Valuation Model",
      "handler": "./skills/customValuation.js"
    }
  ]
}
```

---

## 7. Exporting and Sharing

### Export Assistant

**Via UI**:

1. Go to Settings > Assistants
2. Select assistant
3. Click **Export**
4. Choose format: JSON or Extension

**Via CLI**:

```bash
largo assistant export tech-specialist --format json > tech-assistant.json
```

### Share as Extension

Package as installable extension:

```bash
# Create extension structure
mkdir tech-assistant-extension
cd tech-assistant-extension

# Create manifest
cat > aion-extension.json << 'EOF'
{
  "name": "tech-sector-assistant",
  "version": "1.0.0",
  "description": "Technology sector M&A specialist",
  "contributes": {
    "assistants": [
      {
        "id": "tech-specialist",
        "name": "Tech Sector Specialist",
        "systemPrompt": "..."
      }
    ]
  }
}
EOF

# Package
zip -r tech-assistant-extension.zip .
```

### Import Assistant

**Via UI**:

1. Settings > Assistants > Import
2. Select `.json` or `.zip` file
3. Review configuration
4. Click Import

**Via CLI**:

```bash
largo assistant import ./tech-assistant.json
```

---

## Examples

### Example 1: PE Fund Assistant

```json
{
  "id": "pe-fund-analyst",
  "name": "PE Fund Analyst",
  "systemPrompt": "You are a private equity analyst evaluating
French acquisition targets for mid-market PE funds (EV €10-100M).

Focus on:
- Platform vs. add-on acquisition strategies
- Leveraged finance structures
- EBITDA adjustments (add-backs)
- Management team assessment
- Exit pathways (trade sale, secondary, IPO)

Use French PE terminology:
- LBO (Leveraged Buyout)
- EBITDA = EBE + DAP (Dotations aux Amortissements et Provisions)
- Senior Debt, Unitranche, Mezzanine

Always provide:
1. Investment thesis summary
2. Key risks and mitigants
3. Value creation levers
4. Preliminary return metrics (IRR, MOIC)",
  "model": "claude-3-5-sonnet-20241022",
  "temperature": 0.2,
  "tools": ["valuation", "sector-analysis", "financial-modeling"]
}
```

### Example 2: Legal Due Diligence Assistant

```json
{
  "id": "legal-dd-assistant",
  "name": "Legal DD Assistant",
  "systemPrompt": "You are a French M&A legal specialist conducting
legal due diligence.

Areas of focus:
- Corporate structure and shareholding
- Material contracts review
- Litigation and disputes
- Regulatory compliance
- IP and technology rights
- Employment matters
- Real estate

French law specifics:
- Code de commerce compliance
- Labour code (Code du travail) requirements
- GDPR compliance
- Foreign investment approval (if applicable)

Structure findings as:
1. Summary of key issues (red/yellow/green)
2. Detailed findings by category
3. Recommended follow-up questions
4. Impact on valuation/adjustments",
  "model": "claude-3-opus-20240229",
  "temperature": 0.1
}
```

---

## Troubleshooting

### Assistant Not Responding as Expected

1. **Check system prompt clarity** - Is it specific enough?
2. **Verify model selection** - Some models follow instructions better
3. **Review temperature** - Too high = inconsistent, too low = rigid
4. **Test with simpler queries** - Verify basic functionality

### Tools Not Available

1. Check MCP server is enabled in Settings > MCP Servers
2. Verify tool permissions in assistant configuration
3. Check MCP server logs for errors

### Context Loss

1. Increase `maxMessages` in context management
2. Use `summarizeAfter` to compress older context
3. Break long conversations into multiple sessions

---

<div align="center">

**Custom Assistants** — Tailor Largo to your specific M&A needs.

</div>
