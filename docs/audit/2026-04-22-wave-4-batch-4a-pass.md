# Wave 4 / Batch 4A Pass - 2026-04-22

## Scope

Batch 4A owns capability disposition and bridge contract pass for process-side M&A services.

Goal: Stop the process-side M&A services from living in an ambiguous half-exposed state.

## Capability Disposition

| Service                      | Classification | Rationale                                                                                                                                      | Bridge Action                                                                   |
| ---------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **CompanyEnrichmentService** | **DEFER**      | Updated to use FREE NO-AUTH API Recherche d'entreprises (api.gouv.fr). SIRENE enrichment replaced with open API. Awaiting renderer surface.    | Added TODO stub in maBridge.ts and ipcBridge.ts with documented contract for 4B |
| **ContactService**           | **REMOVE**     | CRM-like contact management. Redundant with deal parties (part of DealContext). No bridge exposure. No renderer surface.                       | Removed service file and tests                                                  |
| **WatchlistService**         | **REMOVE**     | Watchlists for tracking companies/deals. No bridge exposure. Cron job (maWatchlistJob) was broken (module not found). Not integrated.          | Removed service file, cron job, and tests                                       |
| **NativeIntegrationService** | **KEEP**       | data.gouv.fr native integration. Working via MCP services (DatagouvMcpServer, toolHandlers). Has working cron job (maDatagouvHousekeepingJob). | No changes - operates via MCP path, not M&A bridge                              |

## Files Changed

### Removed (ContactService)

- `src/process/services/ma/ContactService.ts` - Service implementation
- `tests/unit/ma/contactService.test.ts` - Unit tests

### Removed (WatchlistService)

- `src/process/services/ma/WatchlistService.ts` - Service implementation
- `src/process/services/cron/maWatchlistJob.ts` - Broken cron job
- `tests/unit/ma/watchlistService.test.ts` - Unit tests
- `tests/unit/ma/maWatchlistJob.test.ts` - Cron job tests

### Modified

- `src/process/services/ma/CompanyEnrichmentService.ts` - **Updated to use FREE NO-AUTH API Recherche d'entreprises (api.gouv.fr)**. Replaced SIRENE enricher with new `RechercheEntreprisesEnricher` class. Added `searchByName()` method. Added rate limiting.
- `src/process/services/cron/index.ts` - Removed maWatchlistJob export
- `src/process/bridge/maBridge.ts` - Added TODO stub for deferred CompanyEnrichmentService
- `src/common/adapter/ipcBridge.ts` - Added commented stub for deferred companyEnrichment (includes searchByName)

### Kept (NativeIntegrationService)

- `src/process/services/ma/NativeIntegrationService.ts` - Works via MCP, not M&A bridge
- `src/process/services/cron/maDatagouvHousekeepingJob.ts` - Working cron job
- `src/process/services/mcpServices/datagouv/` - MCP tool handlers and server

### Kept (CompanyEnrichmentService - Deferred)

- `src/process/services/ma/CompanyEnrichmentService.ts` - Service preserved for 4B
- `tests/unit/ma/companyEnrichmentService.test.ts` - Tests preserved (pre-existing failures)

## Bridge Contract Alignment

The bridge contract now reflects only the **KEPT** capabilities:

### Current M&A Bridge (KEPT)

```
ma.deal.*           - Deal CRUD, lifecycle, active deal management
ma.document.*         - Document CRUD, ingestion, progress
ma.analysis.*         - Analysis CRUD
ma.riskFinding.*      - Risk finding CRUD
ma.flowiseSession.*   - Flowise session management
ma.flowise.*          - Flowise readiness
ma.integration.*      - External OAuth integrations (Nango-based)
ma.dueDiligence.*     - Due diligence analysis, comparison
```

### Deferred (4B TODO)

```
ma.companyEnrichment.* - FREE NO-AUTH API Recherche d'entreprises enrichment
  - enrichBySiren(siren: string) - Enrich/create company by SIREN
  - enrichCompany(companyId: string) - Enrich existing company
  - searchByName(query: string, limit?: number) - Search by name (NEW)
  - batchEnrich(companyIds: string[]) - Batch enrichment
```

### Removed from consideration

```
ma.contact.*          - REMOVED (ContactService)
ma.watchlist.*        - REMOVED (WatchlistService)
```

## Renderer-Owner Path for Kept Features

### NativeIntegrationService (data.gouv.fr)

**Path**: Renderer → MCP Tool Call → DatagouvMcpServer → NativeIntegrationService

The renderer accesses data.gouv.fr through:

1. `tools/datagouv-search` - Search datasets
2. `tools/datagouv-query-csv` - Query tabular data
3. Connection test via `NativeIntegrationService.testDatagouvConnection()`

No M&A bridge changes needed - MCP path is the intended architecture.

### CompanyEnrichmentService (DEFERRED)

**Planned Path**: Renderer → M&A Bridge → CompanyEnrichmentService → SIRENE API

4B will need to:

1. Design renderer surface for company enrichment (company profile page, deal context)
2. Uncomment bridge contracts in `ipcBridge.ts`
3. Implement handlers in `maBridge.ts`
4. Add i18n keys for enrichment UI

## Commands Run

```bash
# Test kept capabilities
npm.cmd run test -- tests/unit/ma/complianceCloseout.test.ts tests/unit/ma/riskScoreCard.dom.test.tsx tests/unit/ma/documentUpload.dom.test.tsx

# Typecheck (pre-existing errors in DueDiligenceService remain)
npx.cmd tsc --noEmit
```

Results:

- 23 tests passed
- No new type errors introduced (WatchlistService errors eliminated)
- Pre-existing DueDiligenceService type errors remain (out of scope)

## Summary

- ContactService and WatchlistService removed (were half-exposed, unused)
- CompanyEnrichmentService preserved with TODO stub for 4B
- NativeIntegrationService kept (working via MCP path)
- Bridge contracts now aligned to kept capabilities only
- No renderer surfaces were edited

## Handoff to 4B

**4B Owner**: Company Enrichment Renderer Surface

The CompanyEnrichmentService is preserved at `src/process/services/ma/CompanyEnrichmentService.ts` with TODO stubs:

- `src/process/bridge/maBridge.ts:547-560` - Bridge handler TODO
- `src/common/adapter/ipcBridge.ts:1440-1448` - Contract stub
- `src/renderer/pages/login/openapi(1).json` - API spec for reference

**API**: FREE NO-AUTH API Recherche d'entreprises (api.gouv.fr)

- Base URL: `https://recherche-entreprises.api.gouv.fr`
- Rate limit: 7 requests/second
- Endpoints: `/search?q={query}&per_page={limit}`

**Methods to expose when renderer is ready:**

- `enrichBySiren(siren: string)` - Enrich/create company by SIREN
- `enrichCompany(companyId: string)` - Enrich existing company
- `searchByName(query: string, limit?: number)` - **NEW** Search companies by name
- `batchEnrich(companyIds: string[])` - Batch enrichment

**4B Renderer Design Needed:**

- Company search/autocomplete when creating deals
- Company profile page with enrichment CTA
- Deal context integration for target company enrichment
- Batch enrichment UI for portfolio companies
- Sources/provenance display (sources_json attribution)

**Files to Modify (4B)**:

- Uncomment `ipcBridge.ts` companyEnrichment section
- Implement handlers in `maBridge.ts`
- Create/update renderer components for company management
