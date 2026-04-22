# Largo User Guide

> **Version**: 1.9.16 | **Target Audience**: M&A Professionals, Financial Analysts, Deal Advisors

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Your First M&A Conversation](#2-your-first-ma-conversation)
3. [Assistant Presets](#3-assistant-presets)
4. [Document Automation](#4-document-automation)
5. [Valuation Tools](#5-valuation-tools)
6. [Company Research](#6-company-research)
7. [Multi-Agent Team Mode](#7-multi-agent-team-mode)
8. [Extension Management](#8-extension-management)
9. [Settings & Configuration](#9-settings--configuration)
10. [Keyboard Shortcuts](#10-keyboard-shortcuts)

---

## 1. Getting Started

### Installation

**Desktop (Electron):**

1. Download the installer for your platform from the releases page
2. Run the installer and follow the prompts
3. Launch Largo from your applications menu

**WebUI (Browser):**

1. Start Largo with the `--webui` flag: `largo --webui`
2. Open your browser to `http://localhost:3000`
3. Log in with your credentials (default: `admin`)

### Initial Setup

1. **Configure AI Provider**: Go to Settings > AI Providers and add your API keys
   - Anthropic (Claude)
   - OpenAI (GPT-4)
   - Google (Gemini)

2. **Select Default Assistant**: Choose from M&A Partner, Research, or Valuation presets

3. **Set Language**: French is optimized for French M&A terminology

---

## 2. Your First M&A Conversation

### Starting a Conversation

1. Click **New Conversation** or press `Ctrl+N` (`Cmd+N` on macOS)
2. Select your assistant preset (e.g., "M&A Partner")
3. Type your message in the input field

### Example Prompts

**Target Analysis:**

```
Analyze Société Example SAS (SIREN: 123 456 789).
Focus on: financial health, sector position, and acquisition attractiveness.
```

**Valuation Request:**

```
Value a software company with €5M revenue, 20% EBITDA margin,
growing 30% YoY. Use comparables and DCF methods.
```

**LOI Drafting:**

```
Draft a Letter of Intent for acquiring a manufacturing company.
Include: price range, due diligence scope, exclusivity period.
```

### Understanding Responses

Largo responses include:

- **Analysis**: Structured reasoning with M&A framework alignment
- **Data**: French company information from SIRENE, Pappers, Infogreffe
- **Documents**: Generated Excel models, PowerPoint decks, Word memos
- **Sources**: Citations for all external data

---

## 3. Assistant Presets

### M&A Partner

**Best for**: Deal strategy, negotiation advice, process management

**Capabilities**:

- 4-phase M&A framework guidance (Approche → LOI → Due Diligence → Closing)
- 10 Golden Rules compliance checking
- Target attractiveness scoring
- Deal structure recommendations

**Example usage**:

```
I'm entering due diligence on a retail acquisition.
What are the key red flags I should watch for?
```

### Research

**Best for**: Company intelligence, market data, sector analysis

**Capabilities**:

- SIRENE database integration (French companies)
- Sector multiple retrieval
- Peer benchmarking
- Regulatory compliance checks

**Example usage**:

```
Find all companies in NAF code 62.01Z (software development)
with revenue between €1-5M in the Occitanie region.
```

### Valuation

**Best for**: Company valuation, financial modeling, price negotiation

**Capabilities**:

- Multiple methods: Comparables, DCF, ANR, Rules of Thumb
- Football field visualization
- French sector multiples database
- Sensitivity analysis

**Example usage**:

```
Calculate an EV/EBITDA multiple for a French SaaS company
with €10M ARR, 80% gross margin, and 20% EBITDA margin.
```

---

## 4. Document Automation

### Supported Formats

| Format         | Use Case                             | Command Example                         |
| -------------- | ------------------------------------ | --------------------------------------- |
| **Excel**      | Financial models, comparables tables | `Create a DCF model for this company`   |
| **PowerPoint** | Pitch decks, teasers, presentations  | `Generate an investor presentation`     |
| **Word**       | LOIs, memos, reports                 | `Draft a due diligence report template` |
| **PDF**        | Final deliverables                   | `Export this analysis as PDF`           |

### Document Generation

1. **Request a document** in natural language:

   ```
   Create an Excel model with 5-year projections for this acquisition target
   ```

2. **Review the generated document** in the conversation

3. **Download** the file from the attachment

4. **Iterate**: Request modifications:
   ```
   Add sensitivity analysis with ±10% revenue variation
   ```

### Templates

Access pre-built templates via:

- Slash commands: `/template` in the chat
- Settings > Templates menu

Available templates:

- LOI (Letter of Intent)
- NDA (Non-Disclosure Agreement)
- Teaser / Information Memorandum
- Due Diligence Checklist
- Valuation Summary

---

## 5. Valuation Tools

### Available Methods

**1. Multiples Method (Comparables)**

- Uses sector-specific multiples from French market data
- Common multiples: EV/EBITDA, P/E, EV/Sales

**2. DCF (Discounted Cash Flow)**

- Projects future cash flows
- Calculates terminal value
- Discounts at WACC

**3. ANR (Adjusted Net Resources)**

- Asset-based valuation
- Adjusts book values to market values

**4. Football Field**

- Visual comparison of all methods
- Shows value range and consensus

### Running a Valuation

```
Value Company X using:
1. Comparable company analysis (EV/EBITDA multiples)
2. DCF with 5-year projections
3. ANR method

Show me a football field comparison of results.
```

### French Market Data

Largo automatically includes:

- **Sector multiples** for 20+ French industry sectors
- **Transaction comparables** from recent M&A deals
- **Listed company multiples** from SBF 120 constituents

---

## 6. Company Research

### SIRENE Integration

Search any French company by:

- SIREN number
- SIRET number
- Company name
- NAF/APE activity code

**Example**:

```
Lookup SIREN 123 456 789. Show: legal form, capital,
registration date, and main activity.
```

### Data Sources

| Source         | Data Type            | Coverage                |
| -------------- | -------------------- | ----------------------- |
| **SIRENE**     | Legal entity data    | All French companies    |
| **Pappers**    | Financial statements | 11M+ companies          |
| **Infogreffe** | Registry documents   | All registered entities |

### Research Workflows

**Target Identification:**

```
Find acquisition targets in the industrial machinery sector
(NAF 28) in Auvergne-Rhône-Alpes with €2-10M revenue.
```

**Peer Analysis:**

```
Show me 5 comparable companies to Example SAS
with similar revenue and sector.
```

**Red Flag Detection:**

```
Check Société X for: recent litigation,
ownership changes, financial distress signals.
```

---

## 7. Multi-Agent Team Mode

### What is Team Mode?

Multiple AI agents collaborate on complex tasks:

- **Lead Agent**: Orchestrates the workflow
- **Research Agent**: Gathers data
- **Analysis Agent**: Performs calculations
- **Document Agent**: Creates deliverables

### Enabling Team Mode

1. Go to Settings > Features
2. Enable "Multi-Agent Team Mode"
3. Select team composition for your task

### Use Cases

**Comprehensive Due Diligence:**

```
Conduct full due diligence on Target Company.
Team: Research agent (data) + Analysis agent (financial)
+ Document agent (report generation)
```

**Complex Valuation:**

```
Value a company using 3 methods simultaneously.
Team: 3 analysis agents working in parallel,
supported by research agent for comparables.
```

---

## 8. Extension Management

### Installing Extensions

1. Go to **Extensions** in the sidebar
2. Browse available extensions or upload `.zip` file
3. Click **Install** and follow prompts

### Extension Types

| Type          | Purpose                 | Example                  |
| ------------- | ----------------------- | ------------------------ |
| **Channel**   | Add messaging platforms | Feishu, WeChat, Slack    |
| **Assistant** | Custom AI personas      | Sector-specific analysts |
| **Skill**     | New capabilities        | Custom valuation models  |
| **Theme**     | UI customization        | Dark mode variants       |

### Managing Extensions

- **Enable/Disable**: Toggle extension status
- **Configure**: Set extension-specific settings
- **Update**: Check for updates (auto-update available)
- **Uninstall**: Remove extension completely

### Security

Extensions request permissions before installation:

- **Storage**: Local data access
- **Network**: External API calls
- **Filesystem**: File read/write
- **IPC**: Inter-process communication

Review permissions carefully before installing third-party extensions.

---

## 9. Settings & Configuration

### AI Providers

Configure API keys for each provider:

```
Settings > AI Providers > [Provider Name]
```

**Recommended setup**:

- Primary: Claude (Anthropic) - Best for complex analysis
- Backup: GPT-4 (OpenAI) - Fallback option
- Research: Gemini (Google) - Fast data retrieval

### Appearance

- **Theme**: Light / Dark / System
- **Font size**: Small / Medium / Large
- **Language**: Interface language (9 supported)
- **Density**: Compact / Comfortable

### Privacy & Security

- **Local storage only**: No cloud sync (default)
- **Encryption**: Database encryption at rest
- **Auto-lock**: Lock after inactivity period
- **Export**: Backup conversations locally

### Keyboard Shortcuts

Customize shortcuts in Settings > Keyboard Shortcuts

---

## 10. Keyboard Shortcuts

### Global Shortcuts

| Shortcut                       | Action           |
| ------------------------------ | ---------------- |
| `Ctrl+N` / `Cmd+N`             | New conversation |
| `Ctrl+K` / `Cmd+K`             | Quick switcher   |
| `Ctrl+Shift+P` / `Cmd+Shift+P` | Command palette  |
| `Ctrl+,` / `Cmd+,`             | Open settings    |
| `Ctrl+Shift+N` / `Cmd+Shift+N` | New window       |

### Conversation Shortcuts

| Shortcut                       | Action                |
| ------------------------------ | --------------------- |
| `Enter`                        | Send message          |
| `Shift+Enter`                  | New line in message   |
| `Ctrl+Up` / `Cmd+Up`           | Edit previous message |
| `Ctrl+Shift+C` / `Cmd+Shift+C` | Copy last response    |
| `Esc`                          | Cancel generation     |

### Navigation Shortcuts

| Shortcut               | Action                     |
| ---------------------- | -------------------------- |
| `Ctrl+1-9` / `Cmd+1-9` | Switch to conversation N   |
| `Ctrl+[` / `Cmd+[`     | Previous conversation      |
| `Ctrl+]` / `Cmd+]`     | Next conversation          |
| `Ctrl+W` / `Cmd+W`     | Close current conversation |

---

## Getting Help

### In-App Help

- **Slash commands**: Type `/` in chat for available commands
- **Context menu**: Right-click for contextual actions
- **Tooltips**: Hover over icons for descriptions

### Documentation

- **Architecture**: `docs/ARCHITECTURE.md`
- **API Reference**: `docs/api-reference/`
- **Troubleshooting**: `docs/troubleshooting/index.md`

### Support

For issues or feature requests:

1. Check the troubleshooting guide
2. Search existing issues
3. Create a new issue with:
   - Largo version
   - OS and platform
   - Steps to reproduce
   - Expected vs actual behavior

---

<div align="center">

**Largo** — Partner, not tool. Adaptive, not static.

</div>
