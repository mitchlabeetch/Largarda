# Documentation Maintenance Guide

## Overview

Guide for maintaining Largo documentation, including updating existing docs, creating new docs, and ensuring consistency across the documentation set.

## Maintenance Principles

### Keep Documentation Current

Documentation should always reflect the current state of the codebase. When code changes, documentation should be updated accordingly.

### LLM-Friendly Format

All documentation should be easily parsable and understandable by Large Language Models:

- Use clear section headers
- Provide structured information (tables, lists)
- Include code examples
- Maintain consistent formatting

### Consistency

Follow established patterns for:

- File structure
- Naming conventions
- Content organization
- Cross-referencing

## Regular Maintenance Tasks

### Weekly

- Check for broken links
- Review recent code changes for documentation impact
- Update CHANGELOG.md if needed

### Monthly

- Audit documentation completeness
- Review outdated content
- Update examples if APIs changed
- Check for missing index.md files

### Quarterly

- Major documentation review
- Restructure if needed
- Add new sections for new features
- Remove deprecated content

## Updating Existing Documentation

### When to Update

Update documentation when:

- Code behavior changes
- New features are added
- APIs are modified
- Deprecations occur
- Bugs are fixed that affect documented behavior

### Update Process

1. **Identify Impact**
   - Determine which docs need updates
   - Check for cross-references
   - Note breaking changes

2. **Make Updates**
   - Update the affected documentation
   - Update related docs
   - Update examples
   - Update cross-references

3. **Validate**
   - Check for broken links
   - Verify code examples work
   - Run validation scripts
   - Check i18n if applicable

4. **Commit**
   - Use descriptive commit message
   - Reference related issues
   - Follow commit conventions

### Example Update Workflow

```bash
# Identify files to update
# Example: API change in conversation bridge

# Update docs
vim docs/api-reference/bridge-api.md

# Update cross-references
vim docs/data-flows/communication.md

# Update examples
vim examples/e2e-full-extension/aion-extension.json

# Validate
node scripts/check-docs.js

# Commit
git add docs/
git commit -m "docs(api): update bridge API reference for v2.0"
```

## Creating New Documentation

### When to Create New Docs

Create new documentation when:

- Adding a major new feature
- Introducing a new system or module
- Complex logic needs explanation
- New workflows are introduced
- Domain-specific knowledge is needed

### Documentation Types

#### index.md Files

Standard documentation for directories:

- Overview
- Structure
- Features
- Usage
- Related documentation

**Template**: See `docs/templates/index-template.md`

#### Guides

Step-by-step instructions for specific tasks:

- Onboarding guides
- Development guides
- Configuration guides

#### Reference

API documentation, schemas, specifications:

- API reference
- Configuration reference
- Type definitions

#### Examples

Practical examples and tutorials:

- Extension examples
- Integration examples
- Use case examples

### Creating a New index.md

1. **Determine Scope**
   - What does this directory contain?
   - Who is the audience?
   - What should they learn?

2. **Follow Template**
   - Use standard structure
   - Include required sections
   - Follow formatting guidelines

3. **Write Content**
   - Be clear and concise
   - Use code examples
   - Include cross-references
   - Add diagrams if helpful

4. **Validate**
   - Check links
   - Verify examples
   - Run linting
   - Check i18n if applicable

5. **Review**
   - Self-review for clarity
   - Peer review if possible
   - Update based on feedback

## Documentation Quality Standards

### Content Quality

- **Accuracy**: Information must be technically correct
- **Clarity**: Easy to understand for target audience
- **Completeness**: Cover all necessary aspects
- **Currency**: Reflect current state of codebase
- **Relevance**: Focus on what users need

### Format Quality

- **Consistent**: Follow established patterns
- **Structured**: Use clear headings and organization
- **Readable**: Good spacing and formatting
- **Accessible**: Use semantic HTML/markdown
- **Searchable**: Use descriptive titles and keywords

### Code Examples

- **Working**: Examples must actually work
- **Current**: Use current APIs and patterns
- **Complete**: Include all necessary code
- **Explained**: Add comments for clarity
- **Tested**: Verify examples before including

## Cross-Referencing

### Internal Links

Link to other documentation using relative paths:

```markdown
See [API Reference](../api-reference/bridge-api.md) for details.
```

### Code Links

Link to code using path aliases:

```markdown
Implementation in [`src/process/bridge/`](../../src/process/bridge/)
```

### External Links

Use descriptive link text:

```markdown
For more information, see the [Electron documentation](https://www.electronjs.org/docs).
```

### Validation

Check for broken links:

```bash
# Link checker (if available)
bun run check:links
```

## Automated Checks

### Missing index.md Check

Script to identify directories without index.md:

```bash
node scripts/check-index-files.js
```

### Link Validation

Script to check for broken links:

```bash
node scripts/check-links.js
```

### Markdown Linting

Validate markdown syntax:

```bash
bun run lint:docs
```

### i18n Validation

For docs with user-facing text:

```bash
bun run i18n:types
node scripts/check-i18n.js
```

## Documentation Templates

### index.md Template

```markdown
# [Directory Name]

## Overview

Brief description of what this directory contains and its purpose.

## Structure

Description of the directory structure and organization.

## Key Components

List and description of important files/modules.

## Usage

How to use the code in this directory.

## Related Documentation

- [Link to related doc](path/to/doc.md)
```

### Guide Template

```markdown
# [Guide Title]

## Overview

What this guide covers and who it's for.

## Prerequisites

What the reader needs before starting.

## Step-by-Step

1. Step 1
2. Step 2
3. Step 3

## Common Issues

Common problems and solutions.

## Related Documentation

- [Link to related doc](path/to/doc.md)
```

## Review Process

### Self-Review Checklist

Before committing documentation:

- [ ] Content is accurate
- [ ] Code examples work
- [ ] Links are valid
- [ ] Formatting is consistent
- [ ] Spelling/grammar is correct
- [ ] Cross-references are correct
- [ ] i18n is validated (if applicable)

### Peer Review

For significant documentation changes:

1. Create a PR
2. Request review from maintainers
3. Address feedback
4. Update based on review
5. Merge when approved

### Documentation PR Template

```markdown
## Documentation Changes

Description of documentation changes.

## Type of Change

- [ ] New documentation
- [ ] Documentation update
- [ ] Documentation fix
- [ ] Template update

## Files Changed

- docs/new-file.md
- docs/updated-file.md

## Validation

- [ ] Links checked
- [ ] Code examples tested
- [ ] i18n validated (if applicable)
- [ ] Self-reviewed

## Related Issues

Closes #123
```

## Deprecation Process

### When to Deprecate

Deprecate documentation when:

- Feature is removed
- Code is no longer supported
- Better alternative exists
- Documentation is superseded

### Deprecation Steps

1. **Add Deprecation Notice**

   ```markdown
   > **Deprecated**: This documentation is deprecated. See [New Doc](new-doc.md) instead.
   ```

2. **Update References**
   - Update all links to point to new location
   - Add redirects if applicable

3. **Remove Old Content**
   - After a grace period (typically 1-2 releases)
   - Remove deprecated files
   - Clean up references

## Versioning

### Documentation Versions

Documentation should match code versions:

- Main branch docs reflect current main branch
- Release branches have corresponding docs
- Version-specific docs when needed

### Version Notes

Add version notes when applicable:

```markdown
## Version Notes

- Added in v2.0
- Updated in v2.1
```

## Accessibility

### Alt Text

Include alt text for images:

```markdown
![Diagram showing architecture](diagram.png 'Architecture diagram')
```

### Heading Structure

Use proper heading hierarchy:

- One h1 per document
- Logical heading order
- Skip no levels

### Code Blocks

Use language specification:

````markdown
```typescript
const x = 1;
```
````

```

## Performance

### Image Optimization
- Use appropriate image formats (SVG for diagrams, PNG for screenshots)
- Compress images
- Use responsive images when applicable

### File Size
Keep documentation files reasonably sized:
- Split very long docs
- Use includes for repeated content
- Avoid unnecessary content

## Troubleshooting Documentation Issues

### Broken Links
**Problem**: Link doesn't work
**Solution**:
- Check path is correct
- Verify file exists
- Update or remove link

### Outdated Examples
**Problem**: Code example doesn't work
**Solution**:
- Update example to match current API
- Test example before committing
- Note version if example is old

### Missing index.md
**Problem**: Directory lacks index.md
**Solution**:
- Create index.md following template
- Add to directory
- Commit with documentation

### Inconsistent Formatting
**Problem**: Docs have different styles
**Solution**:
- Apply standard formatting
- Use linting tools
- Follow style guide

## Related Documentation
- [docs/conventions/file-structure.md](./conventions/file-structure.md) - File structure conventions
- [index_roadmap.md](../index_roadmap.md) - Documentation roadmap
- [AGENTS.md](../AGENTS.md) - Agent skills
```
