# Custom Assistant Guide

## Overview

Step-by-step guide to creating custom AI assistant presets in Largo. Custom assistants allow you to pre-configure AI behavior, context, skills, and models for specific use cases.

## What is a Custom Assistant?

Custom assistants are pre-configured AI agents with specific:

- System prompts and behavior
- Enabled models and parameters
- Specialized skills
- Context and knowledge
- Use case specialization

### Example Use Cases

- Financial analyst for M&A tasks
- Code reviewer for development
- Customer support for specific products
- Research assistant for academic work
- Domain expert for specialized fields

## Assistant Configuration Methods

### Method 1: Extension-Based (Recommended)

Create assistants as part of an extension for distribution.

### Method 2: In-App Creation

Create assistants directly in Largo settings.

This guide focuses on the extension-based method for production-ready assistants.

## Extension Structure

```
my-assistant-extension/
├── aion-extension.json       # Extension manifest
├── assistants/               # Assistant definitions
│   ├── financial-analyst.md
│   └── code-reviewer.md
├── skills/                   # Associated skills
│   └── valuation-skill.md
└── assets/                   # Icons
    └── icon.svg
```

## Step-by-Step Guide

### Step 1: Create Extension Directory

```bash
mkdir my-assistant-extension
cd my-assistant-extension
```

### Step 2: Create Manifest (aion-extension.json)

```json
{
  "name": "my-assistant-extension",
  "displayName": "My Custom Assistants",
  "version": "1.0.0",
  "description": "Custom AI assistant presets",
  "author": "Your Name",
  "contributes": {
    "assistants": [
      {
        "id": "my-assistant",
        "name": "My Assistant",
        "description": "Custom assistant for specific tasks",
        "presetAgentType": "gemini",
        "contextFile": "assistants/my-assistant.md",
        "models": ["gemini-2.0-flash", "gemini-2.0-pro"],
        "enabledSkills": [],
        "prompts": ["You are a helpful assistant."],
        "temperature": 0.7,
        "maxTokens": 4096
      }
    ]
  }
}
```

### Manifest Properties Explained

| Property          | Type     | Required | Description                                 |
| ----------------- | -------- | -------- | ------------------------------------------- |
| `id`              | string   | Yes      | Unique assistant identifier                 |
| `name`            | string   | Yes      | Display name                                |
| `description`     | string   | Yes      | Human-readable description                  |
| `presetAgentType` | string   | Yes      | Base agent type (gemini, openai, anthropic) |
| `contextFile`     | string   | Yes      | Path to context markdown file               |
| `models`          | string[] | No       | Available models for this assistant         |
| `enabledSkills`   | string[] | No       | Skills enabled by default                   |
| `prompts`         | string[] | No       | System prompts                              |
| `temperature`     | number   | No       | AI temperature (0-1)                        |
| `maxTokens`       | number   | No       | Maximum response tokens                     |

### Step 3: Create Assistant Context

Create `assistants/my-assistant.md`:

```markdown
# My Assistant

## Role

You are a specialized assistant for [specific domain].

## Expertise

- Expertise area 1
- Expertise area 2
- Expertise area 3

## Guidelines

- Always follow these guidelines
- Be concise and accurate
- Ask clarifying questions when needed

## Constraints

- Do not make assumptions
- Cite sources when possible
- Admit uncertainty

## Examples

### Example 1

**User**: [example query]
**Assistant**: [example response]

### Example 2

**User**: [example query]
**Assistant**: [example response]

## Tone

- Professional
- Helpful
- Accurate
```

### Step 4: Add Skills (Optional)

Create specialized skills in `skills/` directory:

**skills/my-skill.md:**

```markdown
# My Skill

## Description

This skill provides specialized capabilities for...

## Instructions

When this skill is active, you should...

## Best Practices

- Best practice 1
- Best practice 2
```

Register in manifest:

```json
{
  "contributes": {
    "assistants": [
      {
        "id": "my-assistant",
        "enabledSkills": ["my-skill"]
      }
    ],
    "skills": [
      {
        "name": "my-skill",
        "description": "My specialized skill",
        "file": "skills/my-skill.md"
      }
    ]
  }
}
```

## Example Assistants

### Financial Analyst Assistant

**assistants/financial-analyst.md:**

```markdown
# Financial Analyst Assistant

## Role

You are a financial analyst specializing in M&A (Mergers & Acquisitions) for the French market.

## Expertise

- French M&A terminology (EBE, CA, capitaux propres)
- Valuation methods (Multiples, DCF, ANR)
- Sector multiples analysis
- 4-phase M&A framework (Approche, LOI, Due Diligence, Closing)
- French accounting standards

## Guidelines

- Always use French M&A terminology when appropriate
- Provide valuation ranges with rationale
- Consider French market specifics
- Reference sector multiples when available
- Explain complex financial concepts clearly

## Constraints

- Do not provide investment advice
- Use appropriate disclaimers
- Cite data sources when possible
- Admit uncertainty in estimates

## Examples

### Valuation Request

**User**: Value a company with EBE of €10M in the technology sector
**Assistant**: Based on sector multiples for technology companies (EV/EBITDA: 8-15x), the valuation range would be €80M-€150M. Using the average of 11.5x, the estimated enterprise value is €115M. This should be adjusted for growth rate, profitability, and market conditions.

### Terminology

**User**: What is EBE?
**Assistant**: EBE (Excédent Brut d'Exploitation) is the French equivalent of EBITDA (Earnings Before Interest, Taxes, Depreciation, and Amortization). It represents operating profit before accounting for interest, taxes, and non-cash expenses.

## Tone

- Professional
- Analytical
- Precise
- Educational
```

**Manifest:**

```json
{
  "contributes": {
    "assistants": [
      {
        "id": "financial-analyst",
        "name": "Financial Analyst",
        "description": "M&A financial analyst for French market",
        "presetAgentType": "gemini",
        "contextFile": "assistants/financial-analyst.md",
        "models": ["gemini-2.0-pro"],
        "temperature": 0.5,
        "maxTokens": 8192
      }
    ]
  }
}
```

### Code Reviewer Assistant

**assistants/code-reviewer.md:**

````markdown
# Code Reviewer Assistant

## Role

You are an expert code reviewer focused on code quality, security, and best practices.

## Expertise

- Multiple programming languages
- Security vulnerabilities
- Performance optimization
- Code readability
- Design patterns
- Testing best practices

## Guidelines

- Provide constructive feedback
- Suggest specific improvements
- Explain why changes are needed
- Prioritize security issues
- Consider performance implications

## Constraints

- Be respectful of author's work
- Focus on objective issues
- Suggest, don't dictate
- Consider project context
- Acknowledge style preferences

## Review Checklist

- Security vulnerabilities
- Performance issues
- Code duplication
- Error handling
- Test coverage
- Documentation
- Naming conventions
- Type safety

## Examples

### Security Issue

**User**: Review this code

```javascript
const query = `SELECT * FROM users WHERE id = ${userId}`;
```
````

**Assistant**: This code has a SQL injection vulnerability. Use parameterized queries instead:

```javascript
const query = 'SELECT * FROM users WHERE id = ?';
const result = await db.query(query, [userId]);
```

## Tone

- Constructive
- Educational
- Respectful
- Thorough

````

### Customer Support Assistant

**assistants/customer-support.md:**
```markdown
# Customer Support Assistant

## Role
You are a customer support specialist for [product/company].

## Expertise
- Product knowledge
- Troubleshooting procedures
- Customer service best practices
- Escalation procedures
- Communication etiquette

## Guidelines
- Be empathetic and helpful
- Ask clarifying questions
- Provide step-by-step solutions
- Escalate when appropriate
- Follow up on issues

## Constraints
- Do not make promises you can't keep
- Stay within support scope
- Protect customer privacy
- Follow company policies
- Document interactions

## Common Issues
- Issue 1: [description and solution]
- Issue 2: [description and solution]
- Issue 3: [description and solution]

## Tone
- Friendly
- Professional
- Patient
- Solution-oriented
````

## Advanced Configuration

### Multiple Models

Configure multiple models with different use cases:

```json
{
  "contributes": {
    "assistants": [
      {
        "id": "my-assistant",
        "models": [
          {
            "id": "gemini-2.0-flash",
            "name": "Fast Mode",
            "description": "Quick responses for simple queries"
          },
          {
            "id": "gemini-2.0-pro",
            "name": "Deep Mode",
            "description": "Detailed analysis for complex tasks"
          }
        ]
      }
    ]
  }
}
```

### Temperature Settings

Adjust creativity vs. precision:

```json
{
  "temperature": 0.2 // More deterministic, precise
}
```

```json
{
  "temperature": 0.8 // More creative, varied
}
```

### Token Limits

Set appropriate token limits for your use case:

```json
{
  "maxTokens": 2048 // Short responses
}
```

```json
{
  "maxTokens": 8192 // Long, detailed responses
}
```

## Testing

### Manual Testing

```bash
# Install extension
largo extension install ./my-assistant-extension

# Create conversation
# Select custom assistant from dropdown
# Test with various queries
# Verify responses match expectations
```

### Test Queries

Create a test plan with sample queries:

**Financial Analyst:**

- "Value a company with EBE of €5M"
- "Explain the 4-phase M&A framework"
- "What is the difference between EBE and EBITDA?"

**Code Reviewer:**

- "Review this code for security issues"
- "Suggest performance improvements"
- "Check for code duplication"

**Customer Support:**

- "How do I reset my password?"
- "My order is delayed, what should I do?"
- "I found a bug, how do I report it?"

## Best Practices

### Context Design

- Be specific about role and expertise
- Include clear guidelines and constraints
- Provide examples of good responses
- Define appropriate tone
- Include domain-specific terminology

### Prompt Engineering

- Use clear, concise instructions
- Specify output format when needed
- Include reasoning steps for complex tasks
- Use few-shot examples
- Chain of thought for complex reasoning

### Model Selection

- Choose appropriate model for task complexity
- Consider cost vs. performance
- Test multiple models
- Provide model options to users
- Document model differences

### Skill Integration

- Create focused, single-purpose skills
- Test skills independently
- Document skill capabilities
- Enable skills selectively
- Consider skill interactions

## Distribution

### Extension Hub

1. Package extension as zip
2. Upload to extension hub
3. Add screenshots and description
4. Submit for review

### Direct Sharing

```bash
# Create zip
zip -r my-assistant-extension.zip my-assistant-extension/

# Share with users
# Users install with: largo extension install ./my-assistant-extension.zip
```

## In-App Creation (Alternative)

For quick, personal assistants:

1. Open Largo settings
2. Navigate to Assistants
3. Click "Create New Assistant"
4. Fill in:
   - Name and description
   - System prompt
   - Model selection
   - Temperature and token limits
   - Enable skills
5. Save and use

## Troubleshooting

### Assistant Not Appearing

**Error**: Custom assistant not in dropdown

**Solution**:

- Verify extension is installed
- Check manifest syntax
- Verify assistant ID is unique
- Restart Largo if needed

### Context Not Loading

**Error**: Assistant not using context

**Solution**:

- Verify context file path is correct
- Check markdown syntax
- Ensure file is not empty
- Review manifest contextFile property

### Skills Not Working

**Error**: Skills not enabled

**Solution**:

- Verify skill is registered in manifest
- Check skill file exists
- Verify skill name matches
- Check skill is in enabledSkills array

## Related Documentation

- [Extension Manifest Reference](../api-reference/extension-manifest.md) - Full manifest schema
- [Extension Development Guide](../onboarding/extension-development.md) - General extension development
- [docs/domain/agents/agent-types.md](../domain/agents/agent-types.md) - Agent types
- [docs/onboarding/agent-development.md](../onboarding/agent-development.md) - Agent development
