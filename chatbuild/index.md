# chatbuild/ - Chat Building Resources

## Overview

Resources for chat building, including reference repositories, Flowise automation, documentation, widget specifications, and knowledge base indices.

## Directory Structure

### Documentation Files

- **COMPONENT_WIDGET_INDEX.md** (30KB) - Index of component widgets
- **KEY WIDGET INSTRUCTIONS.md** (66KB) - Detailed widget building instructions
- **KNOWLEDGE_INDEX.md** (39KB) - Knowledge base index for chat components
- **calendar.md** (7KB) - Calendar component documentation
- **chatcomponent.md** (1.6KB) - Chat component overview
- **contexte.md** (41KB) - Context and configuration documentation (French)

### Widget Files

- **Carnet de contact (FR).widget** (19KB) - Contact book widget (French)
- **Create Event.widget** (10KB) - Event creation widget
- **Stacked bar chart.widget** (8.5KB) - Stacked bar chart widget

### Images

- **Screenshot 2026-04-17 at 21-17-59 Widget Builder — ChatKit Studio.png** (77KB) - Widget builder screenshot
- **contact_widget.png** (165KB) - Contact widget screenshot

### `architecture_repos/` (23 items)

Reference architecture repositories to study:

- **Largo-main/** - Largo main repository
- **largobase-main/** - LargoBase repository
- **nango-master/** - Nango integration platform

### `flowise_automation/` (3 items)

FlowiseAI automation resources:

- **output/** - Automation output files
- **Update-LargoFlowise.ps1** - PowerShell script for Flowise updates

### `flowise_documentation/` (4 items)

FlowiseAI documentation:

- **api-reference/** - API reference documentation
- **cli-reference/** - CLI reference documentation
- **configuration/** - Configuration guides
- **using-flowise/** - Usage guides

### `reference_repos_to_study/` (5 items)

Reference repositories for study:

- **openai-structured-outputs-samples-main/** - OpenAI structured outputs samples
- **openai-agents-js-main/** - OpenAI Agents JavaScript SDK
- **openai-cookbook-main/** - OpenAI cookbook examples
- **apps-sdk-ui-main/** - Apps SDK UI examples
- **openai-chatkit-starter-app-main/** - ChatKit starter application
- **openai-chatkit-advanced-samples-main/** - ChatKit advanced samples

### `mcp_and_tools_to_use/` (0 items)

MCP (Model Context Protocol) tools and resources (placeholder).

## Key Resources

### Widget System

Documentation for building chat widgets:

- **KEY WIDGET INSTRUCTIONS.md** - Comprehensive widget building guide
- **COMPONENT_WIDGET_INDEX.md** - Available widget components
- Widget examples in French and English

### Flowise Integration

FlowiseAI workflow automation:

- Automation scripts for updating Flowise configurations
- Complete documentation for Flowise API, CLI, and usage
- Integration patterns for Largo

### Reference Architectures

Repositories studied for architecture decisions:

- **Largo-main** - Main Largo codebase reference
- **largobase-main** - LargoBase integration reference
- **nango-master** - Third-party integration patterns

### OpenAI Resources

OpenAI SDK and examples:

- Structured outputs implementation patterns
- Agents SDK for multi-agent systems
- Cookbook examples for common use cases
- ChatKit for chat UI components

### Knowledge Base

Indexed knowledge for chat components:

- **KNOWLEDGE_INDEX.md** - Structured knowledge base
- **contexte.md** - French context documentation
- Component and widget specifications

## Usage

### Widget Development

Use widget documentation to create custom chat widgets:

1. Reference KEY_WIDGET_INSTRUCTIONS.md
2. Study existing widget examples
3. Follow component patterns from COMPONENT_WIDGET_INDEX.md

### Flowise Integration

Integrate FlowiseAI workflows:

1. Review flowise_documentation/
2. Use flowise_automation/ scripts for updates
3. Configure workflows for Largo

### Architecture Research

Study reference repositories for:

- Integration patterns (Nango)
- Agent systems (OpenAI Agents)
- UI components (ChatKit)

## Related Documentation

- [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) - System architecture
- [docs/feature/remote-agent/](../docs/feature/remote-agent/) - Remote agent feature
- [src/process/agent/](../src/process/agent/) - Agent implementations
