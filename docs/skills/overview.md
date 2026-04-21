# Skills System Overview

## Overview

The Largo skills system provides specialized knowledge and workflows for Claude AI agents. Skills are modular, reusable capabilities that enhance agent performance for specific tasks.

## What Are Skills?

Skills are context-aware instructions and workflows that guide Claude agents in performing specific tasks within the Largo codebase. They provide:

- **Specialized knowledge** - Domain-specific information
- **Workflow guidance** - Step-by-step procedures
- **Best practices** - Project-specific conventions
- **Tool usage** - How to use available tools effectively

## Skill Categories

### Architecture Skill

- **Purpose**: File and directory structure conventions
- **Triggers**: Creating files, adding modules, architectural decisions
- **Location**: `.claude/skills/architecture/`
- **Key Features**:
  - Directory naming rules
  - File placement guidelines
  - Shared vs private code separation
  - Process type separation (main, renderer, worker)

### Testing Skill

- **Purpose**: Testing workflow and quality standards
- **Triggers**: Writing tests, adding features, before completion
- **Location**: `.claude/skills/testing/`
- **Key Features**:
  - Test framework usage (Vitest, Playwright)
  - Coverage requirements (≥80%)
  - Test organization
  - Quality checklist

### OSS-PR Skill

- **Purpose**: Pull request creation and workflow
- **Triggers**: Creating PRs, after committing, `/oss-pr`
- **Location**: `.claude/skills/oss-pr/`
- **Key Features**:
  - Branch management
  - Quality checks
  - Issue linking
  - PR creation automation

### i18n Skill

- **Purpose**: Internationalization workflow and standards
- **Triggers**: Adding user-facing text, modifying locales/
- **Location**: `.claude/skills/i18n/`
- **Key Features**:
  - Key naming conventions
  - Validation steps
  - Translation management
  - Type generation

### Bump-Version Skill

- **Purpose**: Version bump workflow
- **Triggers**: Bumping version, `/bump-version`
- **Location**: `.claude/skills/bump-version/`
- **Key Features**:
  - Package.json updates
  - Quality checks
  - Branch creation
  - PR and tag generation

### Fix-Issues Skill

- **Purpose**: Auto-fix GitHub issues labeled as bugs
- **Triggers**: `/fix-issues`, user asks to fix GitHub issues
- **Location**: `.claude/skills/fix-issues/`
- **Key Features**:
  - Issue fetching
  - Feasibility analysis
  - Code fixing
  - PR submission

### Fix-Sentry Skill

- **Purpose**: Auto-fix high-frequency Sentry issues
- **Triggers**: `/fix-sentry`, user asks to fix Sentry issues
- **Location**: `.claude/skills/fix-sentry/`
- **Key Features**:
  - Issue fetching (> N occurrences)
  - Stack trace analysis
  - Code fixing
  - GitHub issue creation

### PR-Review Skill

- **Purpose**: Local PR code review with full context
- **Triggers**: Reviewing a PR, `/pr-review`
- **Location**: `.claude/skills/pr-review/`
- **Key Features**:
  - Thorough code review
  - No truncation limits
  - Full project context
  - Issue identification

### PR-Fix Skill

- **Purpose**: Fix all issues from a pr-review report
- **Triggers**: After pr-review, "fix all issues", `/pr-fix`
- **Location**: `.claude/skills/pr-fix/`
- **Key Features**:
  - Issue fixing
  - Follow-up PR creation
  - Fix verification

### PR-Verify Skill

- **Purpose**: Verify and merge bot:ready-to-merge PRs
- **Triggers**: Verifying PRs, `/pr-verify`
- **Location**: `.claude/skills/pr-verify/`
- **Key Features**:
  - Impact analysis
  - Test supplementation
  - One-click merge

### PR-Automation Skill

- **Purpose**: PR automation orchestrator
- **Triggers**: Daemon script, `/pr-automation`
- **Location**: `.claude/skills/pr-automation/`
- **Key Features**:
  - Poll PRs
  - Review, fix, merge via labels
  - State machine

### Completer Skill

- **Purpose**: Continue Largo V2 implementation
- **Triggers**: Hook after completion
- **Location**: `.claude/skills/completer/`
- **Key Features**:
  - Wave continuation
  - Implementation progress

## Skill Structure

Each skill follows a consistent structure:

```
.claude/skills/[skill-name]/
├── SKILL.md              # Main skill definition
├── INSTRUCTIONS.md       # Detailed instructions (optional)
├── REFERENCE.md          # Reference materials (optional)
└── examples/             # Example workflows (optional)
```

### SKILL.md Format

```markdown
# [Skill Name]

## Overview

Brief description of the skill's purpose.

## Triggers

When this skill should be invoked.

## Instructions

Step-by-step instructions for the task.

## Quality Standards

Criteria for successful completion.

## Related Documentation

Links to relevant docs.
```

## Skill Invocation

### Automatic Invocation

Skills are automatically invoked based on:

- User commands (e.g., `/pr-review`)
- Code changes (e.g., touching i18n files)
- Task context (e.g., creating files)

### Manual Invocation

Users can explicitly invoke skills:

```bash
/oss-pr          # Invoke OSS-PR skill
/pr-review       # Invoke PR-Review skill
/fix-issues      # Invoke Fix-Issues skill
```

## Skill Workflow

### 1. Skill Selection

- Analyze user request or code context
- Identify relevant skill(s)
- Load skill instructions

### 2. Context Gathering

- Read relevant files
- Check project state
- Gather necessary information

### 3. Execution

- Follow skill instructions
- Apply project conventions
- Use appropriate tools

### 4. Validation

- Check against quality standards
- Run relevant tests
- Verify compliance

### 5. Completion

- Mark task as complete
- Update relevant state
- Provide summary

## Skill Interactions

### Sequential Skills

Some workflows require multiple skills in sequence:

```
Architecture → Testing → OSS-PR
```

### Parallel Skills

Some tasks can use multiple skills simultaneously:

```
Testing + i18n (for feature with user-facing text)
```

### Skill Dependencies

Some skills depend on others:

- OSS-PR depends on Architecture (for file placement)
- Testing depends on Architecture (for test structure)

## Best Practices

### Skill Design

- **Focused scope**: Each skill should have a clear, single purpose
- **Clear triggers**: When to invoke should be unambiguous
- **Comprehensive instructions**: Cover all steps and edge cases
- **Quality standards**: Define success criteria

### Skill Usage

- **Follow instructions strictly**: Skills are tested and validated
- **Report issues**: If instructions are unclear, report them
- **Suggest improvements**: Skills can be updated based on feedback
- **Context awareness**: Skills may need project context

### Skill Maintenance

- **Keep updated**: Skills should reflect current codebase
- **Test regularly**: Verify skills work as expected
- **Document changes**: Update SKILL.md when behavior changes
- **Version control**: Track skill changes in git

## Skill Configuration

### Global Configuration

Skills can access global configuration:

- Project structure rules
- Code style conventions
- Testing requirements
- Quality standards

### Local Configuration

Some skills support local overrides:

- Custom test frameworks
- Alternative PR workflows
- Specialized conventions

## Skill Development

### Creating a New Skill

1. **Define purpose**: What problem does this skill solve?
2. **Identify triggers**: When should this skill be invoked?
3. **Write instructions**: Step-by-step guidance
4. **Define quality standards**: What makes this successful?
5. **Test thoroughly**: Verify skill works in various scenarios
6. **Document**: Add SKILL.md and any supporting docs

### Skill Template

```markdown
# [Skill Name]

## Overview

[Description of skill purpose]

## Triggers

- Trigger 1
- Trigger 2

## Instructions

1. Step 1
2. Step 2
3. Step 3

## Quality Standards

- Standard 1
- Standard 2

## Related Documentation

- [Link to relevant doc]
```

## Skill Examples

### Architecture Skill Example

**Trigger**: Creating a new component

**Workflow**:

1. Determine component type (base, chat, settings, etc.)
2. Check directory size limit (≤10 direct children)
3. Place in appropriate directory
4. Follow naming convention (PascalCase)
5. Use appropriate UI library components
6. Style with UnoCSS or CSS Modules
7. Add i18n for user-facing text

### Testing Skill Example

**Trigger**: Adding a new feature

**Workflow**:

1. Write unit tests for new code
2. Write integration tests if needed
3. Ensure ≥80% coverage
4. Run `bun run test`
5. Fix any failing tests
6. Verify no regressions

### OSS-PR Skill Example

**Trigger**: After committing changes

**Workflow**:

1. Create feature branch
2. Run quality checks
3. Update CHANGELOG.md
4. Commit changes
5. Push to remote
6. Create PR with proper format
7. Link to related issues

## Related Documentation

- [AGENTS.md](../../AGENTS.md) - Agent skills index
- [.claude/skills/](../../.claude/skills/) - Skill implementations
- [docs/conventions/](../conventions/) - Project conventions
