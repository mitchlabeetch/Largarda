# .claude/ - Claude AI Agent Skills and Commands

## Overview

Configuration directory for Claude AI agent skills and commands. Contains modular skill definitions that provide agents with specialized knowledge and workflows for specific tasks.

## Directory Structure

### `skills/` (11 items)

Modular skill definitions for Claude agents. Each skill provides specialized knowledge and workflows.

- **architecture/** - File and directory structure conventions for all process types
  - Triggers: Creating files, adding modules, architectural decisions
  - Content: Directory naming, page module layout, shared vs private code placement

- **bump-version/** - Version bump workflow
  - Triggers: Bumping version, `/bump-version`
  - Content: Update package.json, checks, branch, PR, tag release

- **fix-issues/** - Auto-fix GitHub issues labeled as bugs
  - Triggers: User says "/fix-issues", asks to fix GitHub issues
  - Content: Fetch open bug issues, analyze feasibility, fix code, submit PRs

- **fix-sentry/** - Auto-fix high-frequency Sentry issues
  - Triggers: User says "/fix-sentry", asks to fix Sentry issues
  - Content: Fetch issues > N occurrences, analyze stack traces, fix code, create GitHub issues, submit PRs

- **i18n/** - Internationalization workflow and standards
  - Triggers: Adding user-facing text, modifying locales/ or src/common/config/i18n
  - Content: Key naming, validation steps, translation management

- **oss-pr/** - Full commit + PR workflow
  - Triggers: Creating pull requests, after committing, `/oss-pr`
  - Content: Branch management, quality checks, issue linking, PR creation

- **pr-automation/** - PR automation orchestrator
  - Triggers: Invoked by daemon script (pr-automation.sh), `/pr-automation`
  - Content: Poll PRs, review, fix, and merge via label state machine

- **pr-fix/** - Fix all issues from a pr-review report
  - Triggers: After pr-review, user says "fix all issues", `/pr-fix`
  - Content: Create follow-up PR, verify each fix from pr-review report

- **pr-review/** - Local PR code review with full project context
  - Triggers: Reviewing a PR, user says "review PR", `/pr-review`
  - Content: Thorough local code review, no truncation limits

- **pr-verify/** - Verify and merge bot:ready-to-merge PRs
  - Triggers: Verifying PRs, merging ready PRs, `/pr-verify`
  - Content: Impact analysis, test supplementation, one-click merge

- **testing/** - Testing workflow and quality standards
  - Triggers: Writing tests, adding features, before claiming completion
  - Content: Test writing guidelines, quality rules, checklist

### `commands/` (1 items)

Slash commands for Claude agents.

- **package-assistant.md** (9.2KB) - Package assistant command for dependency management
  - Helps with package.json modifications
  - Dependency updates
  - Version management

## Skill System

### Purpose

Skills provide modular, reusable workflows for AI agents working on the codebase. Each skill:

- Defines specific triggers that activate it
- Contains detailed instructions for the task
- References relevant project conventions
- Ensures consistency across agent interactions

### Skill Activation

Skills are automatically activated based on:

- User commands (e.g., `/oss-pr`, `/fix-issues`)
- Task context (e.g., creating files, adding i18n text)
- Daemon invocation (e.g., pr-automation.sh)
- Explicit user requests (e.g., "review PR")

### Skill Content

Each skill typically includes:

- Triggers that activate the skill
- Step-by-step workflow instructions
- Relevant file paths and conventions
- Quality check requirements
- Integration with other skills

## Key Skills

### architecture

Enforces file and directory structure conventions:

- Directory size limit (10 children max)
- Naming conventions (PascalCase, camelCase)
- Module organization
- Process separation rules

### testing

Ensures test quality and coverage:

- Vitest framework usage
- Coverage target (≥80%)
- Test writing guidelines
- Before-commit checklist

### oss-pr

Manages the complete PR workflow:

- Branch creation and management
- Quality checks (lint, format, type-check)
- Issue linking
- PR creation with proper format

### i18n

Manages internationalization:

- Key naming conventions
- Language configuration
- Translation validation
- Type generation

### pr-automation

Automates PR processing:

- Polls open PRs
- Runs automated reviews
- Fixes identified issues
- Merges eligible PRs
- Uses bot labels for state tracking

### fix-issues / fix-sentry

Automated issue fixing:

- Fetches issues from GitHub/Sentry
- Analyzes root causes
- Implements fixes
- Creates PRs
- Verifies solutions

## Related Documentation

- [AGENTS.md](../AGENTS.md) - Complete skills index and project guide
- [docs/conventions/file-structure.md](../docs/conventions/file-structure.md) - File structure conventions
- [docs/conventions/pr-automation.md](../docs/conventions/pr-automation.md) - PR automation workflow
