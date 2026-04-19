# Largo Security Documentation

> **Document Classification:** Internal — For Authorized Personnel and Auditors Only
>
> **Version:** 1.0 · **Last Updated:** 2025-07 · **Owner:** Largo Security Team
>
> **Scope:** This document covers security controls, policies, and compliance posture for **Largo**, an AI-powered M&A assistant designed for French M&A professionals. It addresses SOC 2 Type II Trust Service Criteria and GDPR obligations.

---

## Table of Contents

1. [Security Policy Statement](#1-security-policy-statement)
2. [Data Classification](#2-data-classification)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Data Protection](#4-data-protection)
5. [Application Security](#5-application-security)
6. [Infrastructure Security](#6-infrastructure-security)
7. [AI / LLM Security](#7-ai--llm-security)
8. [Incident Response](#8-incident-response)
9. [Audit Logging](#9-audit-logging)
10. [SOC 2 Compliance Matrix](#10-soc-2-compliance-matrix)
11. [Vulnerability Disclosure](#11-vulnerability-disclosure)
12. [Third-Party Risk Management](#12-third-party-risk-management)
13. [Access Control](#13-access-control)
14. [Network Security](#14-network-security)
15. [Business Continuity & Disaster Recovery](#15-business-continuity--disaster-recovery)
16. [GDPR & French Data Protection](#16-gdpr--french-data-protection)
17. [Security Controls Quick Reference](#17-security-controls-quick-reference)
18. [SOC 2 Compliance Checklist](#18-soc-2-compliance-checklist)
19. [Document History](#19-document-history)

---

## 1. Security Policy Statement

Largo is committed to protecting the confidentiality, integrity, and availability of all information entrusted to it — especially the highly sensitive financial and strategic data inherent to mergers and acquisitions. Our security program is designed to:

- **Protect** client deal data, financial models, and proprietary M&A intelligence against unauthorized access, disclosure, or loss.
- **Comply** with SOC 2 Type II Trust Service Criteria, GDPR (Regulation (EU) 2016/679), and French data-protection law (Loi Informatique et Libertés, as amended).
- **Minimize** attack surface through local-first architecture — data stays on the user's machine unless the user explicitly configures remote access.
- **Operate** with zero third-party telemetry — no usage data, deal information, or personal data is transmitted to Largo or any analytics provider.
- **Enforce** the principle of least privilege across application processes, user roles, and third-party integrations.

This policy applies to all Largo components: the Electron desktop application, the WebUI server mode, worker processes, and any supporting build or deployment infrastructure.

---

## 2. Data Classification

All data processed or stored by Largo is classified according to the following levels. Controls are calibrated to the classification of the data they protect.

| Level  | Label            | Definition                                                                                      | Examples                                                                                                                    | Handling Requirements                                                                                                                        |
| ------ | ---------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **L3** | **Confidential** | Data whose unauthorized disclosure could cause material harm to a deal, client, or stakeholder. | Deal memos, LOIs, financial models, valuation analyses, target company data, buyer/seller identities, API keys, JWT secrets | Encrypted at rest; encrypted in transit; access restricted to authenticated users; no logging of content; retention limited to business need |
| **L2** | **Internal**     | Operational data not intended for public release.                                               | Application configuration, user preferences, conversation metadata, prompt templates, audit logs                            | Encrypted at rest where feasible; access restricted to application processes; logged for audit purposes                                      |
| **L1** | **Public**       | Data explicitly intended for unrestricted access.                                               | Open-source code, public documentation, UI string resources                                                                 | No special handling required                                                                                                                 |

### Classification Responsibilities

- **M&A deal data** is always **L3 — Confidential**, regardless of deal stage.
- **API keys and authentication secrets** are **L3 — Confidential**.
- **User-generated prompts and AI responses** are **L3 — Confidential** when they reference deal data.
- **Application logs** must never contain L3 content. Logging middleware filters non-API requests to reduce exposure (see §9).

---

## 3. Authentication & Authorization

### 3.1 Authentication Architecture (WebUI Mode)

When Largo operates in WebUI mode, all browser-based access is gated by a JWT-based authentication system.

```
┌─────────┐     POST /login      ┌──────────────┐     Verify      ┌───────────┐
│ Browser  │ ──────────────────▶ │ AuthService  │ ──────────────▶ │  bcryptjs │
│          │                      │              │                  │ (12 rounds)│
│          │ ◀────────────────── │              │ ◀────────────── │           │
│          │   Set-Cookie: JWT    │              │   match/fail    │           │
└─────────┘                      └──────────────┘                  └───────────┘
```

**Implementation files:**

| Component                          | Path                                                       |
| ---------------------------------- | ---------------------------------------------------------- |
| Authentication service             | `src/process/webserver/auth/service/AuthService.ts`        |
| Token middleware                   | `src/process/webserver/auth/middleware/TokenMiddleware.ts` |
| Auth middleware & input validation | `src/process/webserver/auth/middleware/AuthMiddleware.ts`  |
| Rate-limit store                   | `src/process/webserver/auth/repository/RateLimitStore.ts`  |

### 3.2 Password Security

| Control             | Detail                                                           |
| ------------------- | ---------------------------------------------------------------- |
| Hashing algorithm   | bcrypt via `bcryptjs` (v2.4.3)                                   |
| Salt rounds         | **12** (adaptive cost factor)                                    |
| Strength validation | Minimum length, character-type diversity, custom error messaging |
| Comparison          | Constant-time via `bcrypt.compare()` to prevent timing attacks   |

### 3.3 JWT Session Management

| Parameter         | Value                                                             |
| ----------------- | ----------------------------------------------------------------- |
| Token lifetime    | **24 hours**                                                      |
| Signing algorithm | HS256 (HMAC-SHA256)                                               |
| Secret generation | `crypto.randomBytes()` — stored in database, never in source      |
| Storage           | HTTP-only cookie (`aionui-session`)                               |
| Cookie flags      | `HttpOnly: true`, `SameSite: strict`, `Secure: true` (production) |
| Cookie max-age    | 30 days (persistent session)                                      |
| Token blacklist   | SHA-256 hashed tokens; automatic cleanup every 1 hour             |

### 3.4 Session Termination

- Explicit logout blacklists the current token immediately.
- Expired tokens are rejected at the middleware layer.
- Blacklisted tokens are periodically purged to bound memory usage.

---

## 4. Data Protection

### 4.1 Data at Rest

| Layer                    | Mechanism                                                                                                                                                                        | Implementation                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Database                 | SQLite via `better-sqlite3` (v12.4.1), WAL journal mode                                                                                                                          | `src/process/services/database/drivers/BetterSqlite3Driver.ts` |
| SQL injection prevention | Prepared statements exclusively — no string interpolation in queries                                                                                                             | Same driver file                                               |
| Credential storage       | Base64 encoding (obfuscation layer — **not cryptographic encryption**; full-disk encryption or application-level AES-256-GCM encryption is recommended as an additional control) | `src/process/channels/utils/credentialCrypto.ts`               |
| API keys                 | Managed in-memory with rotation and blacklisting                                                                                                                                 | `src/common/api/ApiKeyManager.ts`                              |
| JWT secrets              | Generated via `crypto.randomBytes()`, persisted in the local database. **Note:** database-level encryption is planned; full-disk encryption is recommended in the interim.       | `src/process/webserver/auth/service/AuthService.ts`            |

### 4.2 Data in Transit

| Channel       | Protection                                                                         |
| ------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------- |
| WebUI HTTP    | TLS (HTTPS) — enforced in production; `Secure` cookie flag conditional on protocol |
| WebSocket     | WSS (TLS-encrypted WebSocket); token validation on connection upgrade              | `src/process/webserver/websocket/WebSocketManager.ts` |
| LLM API calls | HTTPS to provider endpoints (OpenAI, Anthropic, Google Gemini)                     |
| Electron IPC  | In-process memory transfer via `contextBridge` — no network exposure               |

### 4.3 Key Management

| Key Type           | Generation                                             | Storage                             | Rotation                                                                                   |
| ------------------ | ------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| JWT signing secret | `crypto.randomBytes()`                                 | Database                            | Regenerated on server re-initialization                                                    |
| CSRF secret        | `crypto.randomBytes(16)` — 32-char hex for AES-256-CBC | Server memory                       | Per server startup                                                                         |
| LLM API keys       | User-supplied                                          | Local configuration (L3 classified) | Time-based blacklist (90 s) with automatic recovery; manual rotation recommended quarterly |

---

## 5. Application Security

### 5.1 Cross-Site Request Forgery (CSRF)

| Control           | Detail                                                                   |
| ----------------- | ------------------------------------------------------------------------ |
| Library           | `tiny-csrf` (v1.1.6)                                                     |
| Token cookie      | `aionui-csrf-token`                                                      |
| Header            | `x-csrf-token`                                                           |
| Protected methods | POST, PUT, DELETE, PATCH                                                 |
| Exempt endpoints  | `/login`, `/api/auth/qr-login`, `/api/upload`, `/channels/wecom/webhook` |
| Client helper     | `src/process/webserver/middleware/csrfClient.ts`                         |

**Implementation:** `src/process/webserver/middleware/security.ts`

### 5.2 Content Security Policy (CSP)

CSP is applied via HTTP response headers and restricts resource loading origins.

**Production policy:**

```
default-src 'self';
script-src  'self' 'unsafe-inline';
style-src   'self' 'unsafe-inline';
img-src     'self' data: blob: https:;
font-src    'self' data:;
connect-src 'self' ws: wss: blob:;
media-src   'self' blob:;
```

> `'unsafe-eval'` is permitted **only** in development builds.

**Configuration:** `src/process/webserver/config/constants.ts`

### 5.3 Security Response Headers

All responses include:

| Header                   | Value                             | Purpose                       |
| ------------------------ | --------------------------------- | ----------------------------- |
| `X-Frame-Options`        | `DENY`                            | Prevent clickjacking          |
| `X-Content-Type-Options` | `nosniff`                         | Prevent MIME-sniffing attacks |
| `X-XSS-Protection`       | `1; mode=block`                   | Legacy XSS filter activation  |
| `Referrer-Policy`        | `strict-origin-when-cross-origin` | Limit referrer leakage        |

**Implementation:** `src/process/webserver/auth/middleware/AuthMiddleware.ts` (`securityHeadersMiddleware`)

### 5.4 Rate Limiting

Multiple rate limiters protect against brute-force and abuse:

| Limiter                   | Window     | Max Requests | Scope             |
| ------------------------- | ---------- | ------------ | ----------------- |
| **Authentication**        | 15 minutes | 5            | Per IP            |
| **API (general)**         | 1 minute   | 60           | Per IP            |
| **File operations**       | 1 minute   | 30           | Per IP            |
| **Authenticated actions** | 1 minute   | 20           | Per user ID or IP |

**Implementation:**

- `src/process/webserver/middleware/rateLimiter.ts` — limiter definitions
- `src/process/webserver/auth/repository/RateLimitStore.ts` — in-memory store with automatic expiry cleanup

### 5.5 Input Validation

| Control      | Detail                                                                      |
| ------------ | --------------------------------------------------------------------------- |
| Login input  | Username/password presence, type check (string), maximum length enforcement |
| Request body | Express body-parser with **10 MB** limit to prevent payload-based DoS       |
| SQL queries  | Prepared statements only — parameterized via `better-sqlite3`               |

**Implementation:** `src/process/webserver/auth/middleware/AuthMiddleware.ts` (`validateLoginInput`)

### 5.6 Cookie Security

| Attribute  | Value       | Rationale                                   |
| ---------- | ----------- | ------------------------------------------- |
| `HttpOnly` | `true`      | Prevents JavaScript access (XSS mitigation) |
| `SameSite` | `strict`    | Prevents cross-site request inclusion       |
| `Secure`   | Conditional | `true` when served over HTTPS               |
| `Path`     | `/`         | Scoped to entire application                |

---

## 6. Infrastructure Security

### 6.1 Electron Process Isolation

Largo uses Electron's multi-process architecture with strict isolation boundaries:

```
┌──────────────────────────────────────────────┐
│              Main Process                     │
│  (Node.js — full OS access)                  │
│  src/process/  ·  src/index.ts               │
├──────────────────────────────────────────────┤
│         contextBridge (preload)               │
│  src/preload/main.ts                         │
│  src/preload/petPreload.ts                   │
│  src/preload/petConfirmPreload.ts            │
│  src/preload/petHitPreload.ts                │
├──────────────────────────────────────────────┤
│           Renderer Process                    │
│  (Chromium sandbox — no Node.js APIs)        │
│  src/renderer/                               │
├──────────────────────────────────────────────┤
│            Worker Processes                   │
│  (Forked Node.js — no Electron APIs)         │
│  src/process/worker/                         │
└──────────────────────────────────────────────┘
```

### 6.2 Electron Security Configuration

| Setting            | Value                      | Source         |
| ------------------ | -------------------------- | -------------- |
| `contextIsolation` | `true`                     | `src/index.ts` |
| `nodeIntegration`  | `false`                    | `src/index.ts` |
| `webviewTag`       | `true` (HTML preview only) | `src/index.ts` |
| Preload scripts    | Scoped per window type     | `src/preload/` |

### 6.3 IPC Bridge Security

All renderer-to-main communication passes through a controlled IPC bridge:

- **File:** `src/common/adapter/ipcBridge.ts`
- Only explicitly exposed methods are callable from the renderer.
- `contextBridge.exposeInMainWorld()` enforces the boundary.
- WebUI mode uses direct IPC calls with token validation.

### 6.4 Process Boundary Rules

| Process                        | Allowed APIs           | Forbidden APIs                 |
| ------------------------------ | ---------------------- | ------------------------------ |
| Main (`src/process/`)          | Node.js, Electron Main | DOM, Browser APIs              |
| Renderer (`src/renderer/`)     | DOM, Browser APIs      | Node.js, `fs`, `child_process` |
| Worker (`src/process/worker/`) | Node.js                | Electron APIs, DOM             |

Violations are enforced by architecture review and the `architecture` skill (`.claude/skills/architecture/SKILL.md`).

---

## 7. AI / LLM Security

### 7.1 Architecture Principle

Largo follows a **local-first, user-controlled** model for AI interactions:

- Users supply their own API keys — Largo never provisions or proxies keys.
- Prompts and responses are stored locally in the SQLite database (L3 classified).
- No telemetry, fine-tuning data, or analytics are transmitted to Largo or third parties.

### 7.2 API Key Management

**Implementation:** `src/common/api/ApiKeyManager.ts`

| Control             | Detail                                                              |
| ------------------- | ------------------------------------------------------------------- |
| Multi-key support   | Users may configure multiple keys per provider                      |
| Automatic rotation  | Time-based blacklisting of failing keys (90-second cooldown)        |
| Recovery            | Keys automatically return to the active pool after blacklist expiry |
| Supported providers | OpenAI, Anthropic, Google Gemini                                    |
| Storage             | Local configuration file — classified L3                            |

### 7.3 Prompt Injection Mitigation

| Layer             | Control                                                                              |
| ----------------- | ------------------------------------------------------------------------------------ |
| Input boundary    | System prompts and user messages are structured with clear role delimiters           |
| Output handling   | AI responses are rendered as content, never executed as code or commands             |
| Context isolation | Each conversation maintains an isolated context — no cross-conversation data leakage |

### 7.4 Data Leakage Prevention

| Risk                        | Mitigation                                                                                                                                                                                                                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API provider data retention | Users select providers per their own DPA; Largo documents provider data-handling policies                                                                                                                                                                                                                         |
| Prompt logging by providers | Users are informed that prompts are sent to third-party LLM endpoints; no intermediary storage by Largo                                                                                                                                                                                                           |
| Local data exposure         | Database is local-only; WebUI mode requires authentication. **Compensating control:** full-disk encryption (e.g., BitLocker, FileVault, LUKS) is strongly recommended to protect L3 data against physical or file-system-level access. Database-level encryption (SQLCipher or application-level AES) is planned. |

### 7.5 Recommendations for Users

1. **Use enterprise-grade API keys** with provider DPAs that satisfy GDPR requirements.
2. **Rotate API keys quarterly** — or immediately upon suspected compromise.
3. **Review provider data retention policies** (e.g., OpenAI's data usage policy, Anthropic's data handling).
4. **Avoid pasting raw confidential documents** into prompts when using providers without zero-retention agreements.

---

## 8. Incident Response

### 8.1 Incident Classification

| Severity          | Definition                                         | Response Time        | Examples                                          |
| ----------------- | -------------------------------------------------- | -------------------- | ------------------------------------------------- |
| **P1 — Critical** | Active exploitation; L3 data at risk               | Immediate (< 1 hour) | Authentication bypass, database exfiltration, RCE |
| **P2 — High**     | Exploitable vulnerability; no confirmed compromise | < 4 hours            | XSS, CSRF bypass, privilege escalation            |
| **P3 — Medium**   | Vulnerability with limited exploitability          | < 24 hours           | Information disclosure, rate-limit bypass         |
| **P4 — Low**      | Minor issue; defense-in-depth gap                  | Next release cycle   | Missing header, verbose error message             |

### 8.2 Response Procedure

1. **Detection** — Automated (audit logs, rate-limit triggers, WebSocket policy violations) or user-reported.
2. **Triage** — Classify severity; assign owner; preserve evidence (logs, timestamps).
3. **Containment** — Revoke compromised tokens (blacklist), rotate secrets, disable affected endpoints.
4. **Eradication** — Deploy patch; update dependencies if CVE-related.
5. **Recovery** — Verify fix in staging; deploy to production; confirm via audit logs.
6. **Post-mortem** — Document root cause, timeline, and preventive measures within 5 business days.

### 8.3 Communication

- **Internal:** Notify the security team and affected stakeholders immediately for P1/P2.
- **External:** If user data is involved, notify affected users within 72 hours per GDPR Article 33.
- **Regulatory:** File CNIL notification if personal data breach affects EU residents.

---

## 9. Audit Logging

### 9.1 What Is Logged

| Event Category | Data Captured                                               | Excluded                            |
| -------------- | ----------------------------------------------------------- | ----------------------------------- |
| Authentication | Timestamp, IP address, success/failure, user identifier     | Passwords, tokens                   |
| API requests   | Timestamp, method, path, IP, response status, duration (ms) | Request/response bodies, L3 content |
| WebSocket      | Connection/disconnection, auth result, policy violations    | Message content                     |
| Rate limiting  | Trigger events, IP, endpoint                                | —                                   |

**Implementation:** `src/process/webserver/auth/middleware/AuthMiddleware.ts` (`requestLoggingMiddleware`)

### 9.2 Log Hygiene

- Non-API requests (static assets, health checks) are **filtered out** to reduce noise.
- Logs must never contain L3 data (deal content, API keys, passwords, tokens).
- Structured format: `[timestamp] method path — status (duration ms) — IP`.

### 9.3 Retention & Access

| Parameter        | Policy                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Retention period | Minimum 90 days; recommended 1 year for SOC 2 audit windows                              |
| Storage          | Application log files on the host machine                                                |
| Access           | Restricted to system administrators and auditors                                         |
| Integrity        | Append-only during operation; tamper-evidence via log rotation and checksums recommended |

---

## 10. SOC 2 Compliance Matrix

The following table maps SOC 2 Trust Service Criteria to Largo's implemented controls.

### 10.1 Security (Common Criteria — CC)

| Criterion | Requirement                      | Largo Control                                                  | Reference                                  |
| --------- | -------------------------------- | -------------------------------------------------------------- | ------------------------------------------ |
| CC6.1     | Logical access security          | JWT authentication, bcrypt password hashing, token blacklist   | `AuthService.ts`, `TokenMiddleware.ts`     |
| CC6.2     | Credentials management           | 12-round bcrypt, constant-time comparison, strength validation | `AuthService.ts`                           |
| CC6.3     | Access authorization             | Role-based access, authenticated action rate limits            | `AuthMiddleware.ts`, `rateLimiter.ts`      |
| CC6.6     | Boundary protection              | CSP headers, CORS validation, Electron contextIsolation        | `constants.ts`, `setup.ts`, `src/index.ts` |
| CC6.7     | Information transmission         | TLS/HTTPS, WSS, HTTP-only cookies, SameSite strict             | `WebSocketManager.ts`, `AuthService.ts`    |
| CC6.8     | Unauthorized software prevention | Electron sandbox, nodeIntegration disabled, preload whitelist  | `src/index.ts`, `src/preload/`             |
| CC7.1     | Detection mechanisms             | Request logging, rate-limit monitoring, WebSocket heartbeat    | `AuthMiddleware.ts`, `WebSocketManager.ts` |
| CC7.2     | Incident response                | Documented IRP, severity classification, response procedures   | This document §8                           |

### 10.2 Availability (A)

| Criterion | Requirement                     | Largo Control                                                       |
| --------- | ------------------------------- | ------------------------------------------------------------------- |
| A1.1      | System availability commitments | Local-first architecture — no cloud dependency for core function    |
| A1.2      | Recovery objectives             | SQLite WAL mode for crash recovery; local backups recommended       |
| A1.3      | Capacity management             | Rate limiting prevents resource exhaustion; body-parser 10 MB limit |

### 10.3 Processing Integrity (PI)

| Criterion | Requirement                        | Largo Control                                                                     |
| --------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| PI1.1     | Processing completeness & accuracy | Prepared statements prevent data corruption; transaction support in SQLite driver |
| PI1.2     | Input validation                   | Login input validation, body-size limits, CSRF token verification                 |
| PI1.3     | Error handling                     | Structured error responses; no stack traces in production responses               |

### 10.4 Confidentiality (C)

| Criterion | Requirement                                | Largo Control                                                                                                                                                                                 |
| --------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1.1      | Identification of confidential information | Three-tier data classification (L1–L3); see §2                                                                                                                                                |
| C1.2      | Confidential information disposal          | Local database files; user controls deletion. Secure deletion should use SQLite `VACUUM` after row deletion to reclaim pages, combined with OS-level secure erase for decommissioned storage. |
| C1.3      | Protection during transit                  | TLS, WSS, encrypted channels to LLM providers                                                                                                                                                 |

### 10.5 Privacy (P)

| Criterion | Requirement           | Largo Control                                                         |
| --------- | --------------------- | --------------------------------------------------------------------- |
| P1.0      | Privacy notice        | No telemetry; no data collection by Largo                             |
| P3.0      | Collection limitation | Only data necessary for application function; user-initiated only     |
| P4.0      | Use & retention       | Data stays local; retention controlled by user                        |
| P6.0      | Data quality          | User-provided data accepted as-is; no transformation of personal data |
| P8.0      | Complaints & disputes | Vulnerability disclosure policy; see §11                              |

---

## 11. Vulnerability Disclosure

### 11.1 Responsible Disclosure Policy

Largo welcomes responsible security research. If you discover a vulnerability:

1. **Do not** disclose publicly before a fix is available.
2. **Report** via GitHub Security Advisories on the Largo repository (preferred) or email the maintainers directly.
3. **Include:** description, reproduction steps, affected version, potential impact.
4. **Response SLA:** Acknowledgment within 48 hours; triage within 5 business days.

### 11.2 Safe Harbor

We will not pursue legal action against researchers who:

- Act in good faith and within this policy.
- Avoid accessing or modifying other users' data.
- Do not degrade service availability.
- Report findings promptly and allow reasonable time for remediation.

### 11.3 Recognition

With the reporter's consent, we credit security researchers in release notes and this document's history.

---

## 12. Third-Party Risk Management

### 12.1 Dependency Overview

Largo's security-critical dependencies:

| Package              | Version | Purpose                   | Risk Tier |
| -------------------- | ------- | ------------------------- | --------- |
| `express`            | ^5.1.0  | HTTP server (WebUI)       | High      |
| `jsonwebtoken`       | ^9.0.2  | JWT creation/verification | High      |
| `bcryptjs`           | ^2.4.3  | Password hashing          | High      |
| `better-sqlite3`     | ^12.4.1 | Database driver           | High      |
| `ws`                 | ^8.18.3 | WebSocket server          | High      |
| `tiny-csrf`          | ^1.1.6  | CSRF protection           | Medium    |
| `express-rate-limit` | ^7.5.1  | Rate limiting             | Medium    |
| `cors`               | ^2.8.5  | CORS middleware           | Medium    |
| `cookie-parser`      | ^1.4.7  | Cookie handling           | Low       |
| `cookie`             | ^1.0.2  | Cookie utilities          | Low       |

### 12.2 Supply Chain Security Controls

| Control                   | Implementation                                                           |
| ------------------------- | ------------------------------------------------------------------------ |
| Lock file                 | `bun.lock` — pinned dependency tree                                      |
| Patch management          | `patches/` directory for targeted fixes                                  |
| Vulnerability scanning    | Automated via CI pipeline                                                |
| Update cadence            | Security patches within 7 days of advisory; non-critical updates monthly |
| Minimal dependency policy | Prefer standard library and small, auditable packages                    |

### 12.3 LLM Provider Risk

| Provider      | Data Handling                                 | DPA Available    |
| ------------- | --------------------------------------------- | ---------------- |
| OpenAI        | API data not used for training (with opt-out) | Yes (Enterprise) |
| Anthropic     | API data not used for training by default     | Yes              |
| Google Gemini | Configurable data handling                    | Yes (Workspace)  |

> **Recommendation:** M&A professionals should use enterprise API tiers with zero-retention DPAs for all deal-related interactions.

---

## 13. Access Control

### 13.1 Access Control Model

Largo implements role-based access control (RBAC) with the principle of least privilege:

| Role                | Capabilities                                        | Authentication              |
| ------------------- | --------------------------------------------------- | --------------------------- |
| **Desktop User**    | Full application access; local database read/write  | OS-level session (implicit) |
| **WebUI User**      | Authenticated access via browser; scoped to session | JWT + password              |
| **Unauthenticated** | Login page only; no API access                      | None                        |

### 13.2 Principle of Least Privilege

| Boundary         | Enforcement                                               |
| ---------------- | --------------------------------------------------------- |
| Renderer process | Cannot access Node.js APIs (`nodeIntegration: false`)     |
| Worker process   | Cannot access Electron APIs                               |
| WebUI endpoints  | Protected by `TokenMiddleware`; rate-limited              |
| Database         | Accessed only by main process; no direct network exposure |
| API keys         | Managed per-provider; blacklisted on failure              |

### 13.3 Session Lifecycle

```
Login ──▶ JWT Issued ──▶ Cookie Set ──▶ Authenticated Requests
                                              │
                              ┌────────────────┤
                              ▼                ▼
                         Token Expiry     Explicit Logout
                              │                │
                              ▼                ▼
                        Rejected at       Token Blacklisted
                        Middleware        (SHA-256 hash)
```

---

## 14. Network Security

### 14.1 WebUI Network Exposure

By default, Largo's WebUI binds to `localhost` and is not exposed to the network. Remote access modes include:

| Mode            | Exposure                         | Use Case                  |
| --------------- | -------------------------------- | ------------------------- |
| Local only      | `127.0.0.1`                      | Single-user desktop       |
| LAN             | Local network IP                 | Team access within office |
| VPN / Tailscale | VPN IP range                     | Secure remote access      |
| Custom origins  | `AIONUI_ALLOWED_ORIGINS` env var | Explicit whitelist        |

**Implementation:** `src/process/webserver/setup.ts`

### 14.2 CORS Policy

| Parameter         | Configuration                                                 |
| ----------------- | ------------------------------------------------------------- |
| Origin validation | Dynamic whitelist based on server binding and environment     |
| Credentials       | `credentials: true` (cookies require explicit origin match)   |
| Allowed origins   | Localhost, configured LAN IPs, VPN IPs, environment overrides |

**Implementation:** `src/process/webserver/setup.ts`

### 14.3 WebSocket Security

| Control           | Detail                                                        | Reference             |
| ----------------- | ------------------------------------------------------------- | --------------------- |
| Authentication    | Token validated on connection upgrade                         | `WebSocketManager.ts` |
| Heartbeat         | 30-second ping interval; 60-second timeout                    | `WebSocketManager.ts` |
| Policy violations | Close code `1008` (Policy Violation) for auth failures        | `WebSocketManager.ts` |
| Message buffering | Messages queued during auth validation; dropped if auth fails | `WebSocketManager.ts` |

### 14.4 Firewall Recommendations

For deployments exposing WebUI beyond localhost:

1. Restrict inbound traffic to the WebUI port from trusted IP ranges only.
2. Use a reverse proxy (e.g., nginx, Caddy) with TLS termination.
3. Enable OS-level firewall rules (`ufw`, `iptables`, Windows Firewall).
4. Monitor access logs for anomalous connection patterns.
5. Consider VPN (WireGuard, Tailscale) for remote access instead of direct exposure.

---

## 15. Business Continuity & Disaster Recovery

### 15.1 Architecture Resilience

Largo's local-first design provides inherent resilience:

| Property            | Benefit                                                             |
| ------------------- | ------------------------------------------------------------------- |
| No cloud dependency | Application functions without internet (except LLM calls)           |
| SQLite WAL mode     | Crash recovery — uncommitted transactions preserved                 |
| Stateless WebUI     | Server can restart without session loss (tokens survive in cookies) |

### 15.2 Data Backup Recommendations

| Data                | Backup Method                         | Frequency         | Retention            |
| ------------------- | ------------------------------------- | ----------------- | -------------------- |
| SQLite database     | File-system copy or `sqlite3 .backup` | Daily (automated) | 30 days minimum      |
| Configuration files | File-system copy                      | On change         | 3 versions           |
| API keys            | Secure vault or password manager      | On change         | Current + 1 previous |

### 15.3 Recovery Procedures

| Scenario                | Procedure                                           | RTO          |
| ----------------------- | --------------------------------------------------- | ------------ |
| Application crash       | Restart application; SQLite WAL auto-recovers       | < 1 minute   |
| Database corruption     | Restore from most recent backup                     | < 15 minutes |
| Compromised credentials | Rotate JWT secret (forces re-auth); rotate API keys | < 30 minutes |
| Host failure            | Re-install application; restore database backup     | < 1 hour     |

### 15.4 M&A-Specific Considerations

- **Deal-critical data** should be backed up before every major deal milestone.
- **Multi-device users** should maintain synchronized backups across devices.
- **Data destruction** at deal close: securely delete deal-specific databases when retention period expires.

---

## 16. GDPR & French Data Protection

### 16.1 Applicability

Largo processes data for French M&A professionals and may handle personal data of EU residents (e.g., names of deal participants, contact information). GDPR and the French Loi Informatique et Libertés therefore apply.

### 16.2 Data Processing Principles

| GDPR Principle                                 | Largo Implementation                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| **Lawfulness** (Art. 6)                        | Processing based on legitimate interest (M&A advisory) and user consent |
| **Purpose limitation** (Art. 5(1)(b))          | Data used exclusively for M&A analysis and AI-assisted workflows        |
| **Data minimization** (Art. 5(1)(c))           | Only user-provided data is stored; no background data collection        |
| **Storage limitation** (Art. 5(1)(e))          | User controls retention; deletion available at any time                 |
| **Integrity & confidentiality** (Art. 5(1)(f)) | Encryption at rest and in transit; access controls; audit logging       |
| **Accountability** (Art. 5(2))                 | This document; audit logs; security controls                            |

### 16.3 Data Subject Rights

| Right                       | Mechanism                                             |
| --------------------------- | ----------------------------------------------------- |
| **Access** (Art. 15)        | Data stored locally — user has direct access          |
| **Rectification** (Art. 16) | User edits data directly in the application           |
| **Erasure** (Art. 17)       | User deletes conversations, deals, or entire database |
| **Portability** (Art. 20)   | SQLite database is a standard, portable format        |
| **Objection** (Art. 21)     | No automated profiling or marketing — not applicable  |

### 16.4 Cross-Border Data Transfers

| Transfer                      | Safeguard                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| LLM API calls to US providers | User responsibility — enterprise DPAs with Standard Contractual Clauses (SCCs) recommended |
| Application data              | Local storage — no cross-border transfer by Largo                                          |

### 16.5 CNIL Compliance

- **DPO:** Organizations using Largo for M&A should designate a Data Protection Officer per GDPR Art. 37.
- **DPIA:** A Data Protection Impact Assessment is recommended for high-volume deal processing.
- **Breach notification:** 72-hour notification to CNIL per GDPR Art. 33; user notification per Art. 34.

---

## 17. Security Controls Quick Reference

| #   | Control                             | Type       | Status         | Implementation           |
| --- | ----------------------------------- | ---------- | -------------- | ------------------------ |
| 1   | JWT authentication                  | Preventive | ✅ Implemented | `AuthService.ts`         |
| 2   | bcrypt password hashing (12 rounds) | Preventive | ✅ Implemented | `AuthService.ts`         |
| 3   | Token blacklist (SHA-256)           | Preventive | ✅ Implemented | `AuthService.ts`         |
| 4   | CSRF protection (tiny-csrf)         | Preventive | ✅ Implemented | `security.ts`            |
| 5   | Content Security Policy             | Preventive | ✅ Implemented | `constants.ts`           |
| 6   | Security response headers           | Preventive | ✅ Implemented | `AuthMiddleware.ts`      |
| 7   | Rate limiting (4 tiers)             | Preventive | ✅ Implemented | `rateLimiter.ts`         |
| 8   | Input validation                    | Preventive | ✅ Implemented | `AuthMiddleware.ts`      |
| 9   | Prepared SQL statements             | Preventive | ✅ Implemented | `BetterSqlite3Driver.ts` |
| 10  | Electron contextIsolation           | Preventive | ✅ Implemented | `src/index.ts`           |
| 11  | Electron nodeIntegration disabled   | Preventive | ✅ Implemented | `src/index.ts`           |
| 12  | contextBridge IPC isolation         | Preventive | ✅ Implemented | `src/preload/main.ts`    |
| 13  | Process boundary enforcement        | Preventive | ✅ Implemented | Architecture rules       |
| 14  | CORS origin validation              | Preventive | ✅ Implemented | `setup.ts`               |
| 15  | HTTP-only cookies                   | Preventive | ✅ Implemented | `AuthService.ts`         |
| 16  | SameSite strict cookies             | Preventive | ✅ Implemented | `AuthService.ts`         |
| 17  | API key rotation & blacklisting     | Preventive | ✅ Implemented | `ApiKeyManager.ts`       |
| 18  | WebSocket token validation          | Preventive | ✅ Implemented | `WebSocketManager.ts`    |
| 19  | WebSocket heartbeat monitoring      | Detective  | ✅ Implemented | `WebSocketManager.ts`    |
| 20  | Request audit logging               | Detective  | ✅ Implemented | `AuthMiddleware.ts`      |
| 21  | Body-size limit (10 MB)             | Preventive | ✅ Implemented | `setup.ts`               |
| 22  | Zero telemetry policy               | Preventive | ✅ Implemented | Architecture policy      |
| 23  | SQLite WAL crash recovery           | Corrective | ✅ Implemented | `BetterSqlite3Driver.ts` |
| 24  | Dependency lock file                | Preventive | ✅ Implemented | `bun.lock`               |
| 25  | Patch management                    | Corrective | ✅ Implemented | `patches/`               |

---

## 18. SOC 2 Compliance Checklist

### Security (Common Criteria)

| #   | Control                                  | Status                                                                                                               |
| --- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | Logical access controls (authentication) | ✅ Implemented                                                                                                       |
| 2   | Multi-factor authentication              | 📋 Planned                                                                                                           |
| 3   | Encryption at rest                       | 🔄 In Progress (Base64 credential encoding implemented; database-level encryption and application-level AES planned) |
| 4   | Encryption in transit (TLS)              | ✅ Implemented                                                                                                       |
| 5   | Firewall / network segmentation          | 📋 Planned (documentation provided)                                                                                  |
| 6   | Intrusion detection                      | 🔄 In Progress (rate limiting, logging)                                                                              |
| 7   | Vulnerability management                 | ✅ Implemented (CI scanning, lock file)                                                                              |
| 8   | Incident response plan                   | ✅ Implemented (this document §8)                                                                                    |
| 9   | Security awareness training              | 📋 Planned                                                                                                           |
| 10  | Change management process                | ✅ Implemented (PR review, CI checks)                                                                                |

### Availability

| #   | Control                | Status                                      |
| --- | ---------------------- | ------------------------------------------- |
| 11  | System monitoring      | 🔄 In Progress (heartbeat, logging)         |
| 12  | Disaster recovery plan | ✅ Implemented (this document §15)          |
| 13  | Backup procedures      | 📋 Planned (recommendations provided)       |
| 14  | Capacity planning      | ✅ Implemented (rate limiting, body limits) |

### Processing Integrity

| #   | Control               | Status                                             |
| --- | --------------------- | -------------------------------------------------- |
| 15  | Input validation      | ✅ Implemented                                     |
| 16  | Error handling        | ✅ Implemented                                     |
| 17  | Data integrity checks | ✅ Implemented (prepared statements, transactions) |

### Confidentiality

| #   | Control                    | Status                            |
| --- | -------------------------- | --------------------------------- |
| 18  | Data classification policy | ✅ Implemented (this document §2) |
| 19  | Access restrictions        | ✅ Implemented                    |
| 20  | Confidential data disposal | 🔄 In Progress (user-controlled)  |

### Privacy

| #   | Control                          | Status                                       |
| --- | -------------------------------- | -------------------------------------------- |
| 21  | Privacy notice                   | ✅ Implemented (no data collection)          |
| 22  | Consent management               | ✅ Implemented (user-initiated only)         |
| 23  | Data subject rights              | ✅ Implemented (local data, user-controlled) |
| 24  | Cross-border transfer safeguards | 📋 Planned (user responsibility documented)  |

**Legend:** ✅ Implemented · 🔄 In Progress · 📋 Planned

---

## 19. Document History

| Version | Date    | Author              | Changes                                      |
| ------- | ------- | ------------------- | -------------------------------------------- |
| 1.0     | 2025-07 | Largo Security Team | Initial comprehensive security documentation |

---

> **Confidentiality Notice:** This document contains internal security information about the Largo application. Distribution is limited to authorized personnel, auditors, and compliance reviewers. Do not share externally without approval from the Largo Security Team.
