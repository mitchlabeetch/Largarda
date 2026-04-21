# OSS-PR Skill

## Overview

The OSS-PR skill provides guidance for creating pull requests in open-source projects. It covers branch management, quality checks, issue linking, and PR creation automation.

## Triggers

This skill is invoked when:

- Creating a pull request
- After committing changes
- User invokes `/oss-pr` command
- Preparing code for review

## PR Workflow

### 1. Branch Management

#### Create Feature Branch

```bash
# From main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name
```

#### Branch Naming Convention

- Use `feature/` prefix for new features
- Use `fix/` prefix for bug fixes
- Use `docs/` prefix for documentation
- Use `refactor/` prefix for refactoring
- Use kebab-case for branch names

**Examples**:

- `feature/add-dark-mode`
- `fix/memory-leak-in-chat`
- `docs/update-api-reference`
- `refactor/optimize-database-queries`

### 2. Quality Checks

Before creating a PR, run all quality checks:

```bash
# Auto-fix lint issues
bun run lint:fix

# Auto-format code
bun run format

# Type check
bunx tsc --noEmit

# Run tests
bun run test

# If touching i18n or renderer
bun run i18n:types
node scripts/check-i18n.js
```

### 3. Commit Changes

#### Commit Format

Follow conventional commits format:

```
<type>(<scope>): <subject>
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `test`: Test changes
- `style`: Code style changes (formatting)
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples**:

```
feat(chat): add message streaming support
fix(database): resolve connection timeout issue
docs(api): update IPC bridge reference
refactor(renderer): optimize component rendering
```

#### Commit Guidelines

- Use present tense ("add" not "added")
- Use imperative mood ("add" not "adds")
- Limit subject line to 50 characters
- Wrap body at 72 characters
- **NO AI signatures** (Co-Authored-By, Generated with, etc.)

### 4. Update CHANGELOG

Add entry to `CHANGELOG.md`:

```markdown
## [Unreleased]

### Added

- New feature description

### Fixed

- Bug fix description

### Changed

- Breaking change description
```

### 5. Push to Remote

```bash
git push origin feature/your-feature-name
```

### 6. Create Pull Request

#### Using GitHub CLI

```bash
gh pr create \
  --title "feat: add message streaming support" \
  --body "Description of changes" \
  --base main \
  --head feature/your-feature-name
```

#### Using Web Interface

1. Go to GitHub repository
2. Click "New Pull Request"
3. Select base branch: `main`
4. Select compare branch: `feature/your-feature-name`
5. Fill in title and description
6. Link related issues
7. Create PR

### 7. Link to Issues

Reference related issues in PR:

- In commit messages: `Fixes #123`
- In PR description: `Closes #123, #456`
- In PR title: `[#123] Add feature`

## PR Description Template

```markdown
## Description

Brief description of what this PR changes and why.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues

Closes #123

## Changes Made

- Change 1
- Change 2
- Change 3

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Manual testing completed

## Screenshots (if applicable)

[Attach screenshots]

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-reviewed the code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No new warnings generated
- [ ] Added/updated tests
- [ ] All tests passing
```

## Quality Standards

### Before Creating PR

- [ ] All quality checks pass (`lint:fix`, `format`, `tsc`, `test`)
- [ ] Code follows project conventions
- [ ] Changes are focused and minimal
- [ ] Tests added for new functionality
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No merge conflicts with main

### Code Review Checklist

- [ ] Code is readable and maintainable
- [ ] No obvious bugs or issues
- [ ] Error handling is appropriate
- [ ] Performance considerations addressed
- [ ] Security concerns addressed
- [ ] Tests are adequate
- [ ] Documentation is accurate

## Issue Linking

### Closing Issues Automatically

Use keywords in commit messages or PR description:

- `Closes #123` - Closes issue when PR merges
- `Fixes #123` - Same as Closes
- `Resolves #123` - Same as Closes
- `Related to #123` - Links but doesn't close

### Multiple Issues

```
Closes #123, #456, #789
```

## Automated PR Creation

The `/oss-pr` command automates the PR workflow:

### What It Does

1. Checks current branch
2. Runs quality checks
3. Verifies branch is up to date with main
4. Creates appropriate commit if needed
5. Pushes to remote
6. Creates PR with template
7. Links to related issues

### Usage

```bash
/oss-pr
```

### Configuration

The skill can be configured with:

- Default base branch
- PR template location
- Quality check commands
- Issue linking patterns

## Common Scenarios

### Scenario 1: Simple Bug Fix

```bash
# Create branch
git checkout -b fix/login-error

# Make changes
# ...

# Quality checks
bun run lint:fix && bun run format && bunx tsc --noEmit && bun run test

# Commit
git commit -m "fix(auth): resolve login timeout issue"

# Push
git push origin fix/login-error

# Create PR
gh pr create --title "fix(auth): resolve login timeout issue" --body "Fixes #456"
```

### Scenario 2: New Feature

```bash
# Create branch
git checkout -b feature/dark-mode

# Make changes
# ...

# Quality checks
bun run lint:fix && bun run format && bunx tsc --noEmit && bun run test

# If touching i18n
bun run i18n:types
node scripts/check-i18n.js

# Commit
git commit -m "feat(ui): add dark mode theme"

# Update CHANGELOG
# ...

# Push
git push origin feature/dark-mode

# Create PR
gh pr create --title "feat(ui): add dark mode theme" --body "Closes #123"
```

### Scenario 3: Documentation Update

```bash
# Create branch
git checkout -b docs/update-api

# Make changes
# ...

# Quality checks
bun run format

# Commit
git commit -m "docs(api): update IPC bridge reference"

# Push
git push origin docs/update-api

# Create PR
gh pr create --title "docs(api): update IPC bridge reference"
```

## Troubleshooting

### Merge Conflicts

```bash
# Rebase on main
git fetch origin
git rebase origin/main

# Resolve conflicts
# ...

# Continue rebase
git rebase --continue

# Force push
git push origin feature/your-feature-name --force-with-lease
```

### Failed Quality Checks

```bash
# Fix linting issues
bun run lint:fix

# Fix formatting
bun run format

# Fix type errors
# Edit code until tsc passes

# Fix test failures
# Edit or add tests

# Commit fixes
git commit -m "chore: fix quality check failures"
```

### PR Not Merging

If PR is not merging:

- Check CI status
- Address review comments
- Resolve merge conflicts
- Rebase on main if needed

## Best Practices

### DO

- Keep PRs focused and small
- Write clear commit messages
- Link to related issues
- Update documentation
- Add tests for changes
- Respond to review comments promptly
- Keep PR description up to date

### DON'T

- Don't include unrelated changes
- Don't skip quality checks
- Don't force push without reason
- Don't ignore review comments
- Don't merge without approval
- Don't close PRs without resolution
- Don't include AI signatures in commits

## Related Documentation

- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Contribution guidelines
- [AGENTS.md](../../AGENTS.md) - Agent skills index
- [.claude/skills/oss-pr/](../../.claude/skills/oss-pr/) - Skill implementation
