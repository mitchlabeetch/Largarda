# .github/ - GitHub Configuration

## Overview

GitHub-specific configuration including workflows for CI/CD, security scanning, and dependency management.

## Directory Structure

### Root Files

- **dependabot.yml** (1KB) - Dependabot configuration for automated dependency updates

### `workflows/` (3 items)

GitHub Actions workflow definitions.

- **ci.yml** (2.7KB) - Continuous Integration workflow
  - Runs on every push and pull request
  - Executes linting, formatting checks, type checking
  - Runs test suite with coverage
  - Validates i18n if renderer files changed
  - Uses prek for comprehensive CI checks

- **docker.yml** (1.6KB) - Docker build workflow
  - Builds Docker images for deployment
  - Multi-architecture support
  - Pushes to container registry

- **security.yml** (1.7KB) - Security scanning workflow
  - Runs security audits
  - Scans for vulnerabilities
  - Checks dependency security
  - Code security analysis

## Workflows

### CI Workflow (ci.yml)

Comprehensive continuous integration pipeline:

- **Triggers**: Push to any branch, pull requests
- **Steps**:
  1. Checkout code
  2. Setup Node.js environment
  3. Install dependencies with Bun
  4. Run linting checks (oxlint)
  5. Run formatting checks (oxfmt --check)
  6. Type checking (tsc --noEmit)
  7. Run test suite (vitest)
  8. Check test coverage
  9. Validate i18n (if renderer files changed)
  10. Run prek for comprehensive checks

### Docker Workflow (docker.yml)

Docker containerization:

- **Triggers**: Manual dispatch, scheduled runs
- **Steps**:
  1. Checkout code
  2. Set up Docker Buildx
  3. Login to container registry
  4. Build multi-architecture images
  5. Push images to registry
  6. Generate image metadata

### Security Workflow (security.yml)

Security and vulnerability scanning:

- **Triggers**: Schedule (daily), manual dispatch
- **Steps**:
  1. Checkout code
  2. Run security audit (npm audit)
  3. Scan dependencies for vulnerabilities
  4. Run code security analysis
  5. Generate security report
  6. Create issues for vulnerabilities found

## Dependabot Configuration

### dependabot.yml

Automated dependency updates:

- **Package ecosystems**: npm, docker
- **Update schedule**: Weekly
- **Versioning strategy**: increase
- **Commit message format**: Follows project conventions
- **Automerge**: Disabled (requires review)
- **Labels**: dependencies, automated

## Security Features

### Automated Scanning

- Dependency vulnerability scanning
- Code security analysis
- Secret detection
- License compliance checking

### Vulnerability Management

- Automatic issue creation for vulnerabilities
- Dependabot security alerts
- Security advisory notifications
- Automated dependency updates

## Related Documentation

- [AGENTS.md](../AGENTS.md) - Development workflow
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [docs/adr/0003-ci-foundation.md](../docs/adr/0003-ci-foundation.md) - CI foundation ADR
- [docs/adr/0006-security-ci-foundation.md](../docs/adr/0006-security-ci-foundation.md) - Security CI ADR
