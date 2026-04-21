# Largo tool integrations — OpenAPI specifications

This folder is the **single source of truth** for every Largo tool
consumed by the Flowise catalogue (`src/common/ma/flowise/catalog.ts`)
and — when Wave 10.1 ships — the MetaMCP federation bus.

## Status at 2026-04-20

| Spec                       | Detail level | Used by                                                                                              |
| -------------------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| `sirene.openapi.yaml`      | full         | `ma.dd.analysis`, `ma.company.qa`                                                                    |
| `pappers.openapi.yaml`     | full         | `ma.dd.analysis`, `ma.valuation.draft`, `ma.company.qa`, `ma.docs.im.draft`, `ma.comparables.search` |
| `kb.openapi.yaml`          | full         | every RAG flow                                                                                       |
| `datagouv.openapi.yaml`    | full         | `ma.sector.summary`, `ma.comparables.search`, `ma.valuation.draft`                                   |
| `browserless.openapi.yaml` | stub         | `ma.briefs.daily`, `ma.company.qa` fallback                                                          |
| `rsshub.openapi.yaml`      | stub         | `ma.briefs.daily`                                                                                    |
| `sanctions.openapi.yaml`   | stub         | `ma.kyc.screen`                                                                                      |
| `comparables.openapi.yaml` | stub         | `ma.comparables.search`                                                                              |
| `email.openapi.yaml`       | stub         | `ma.emails.draft` side-channel                                                                       |
| `pipedrive.openapi.yaml`   | stub         | cross-wave CRM sync                                                                                  |
| `calendar.openapi.yaml`    | stub         | Wave 5 scheduling                                                                                    |
| `watchlist.openapi.yaml`   | stub         | Wave 1.5 watchlist pipeline                                                                          |

## Authoring rules

- OpenAPI **3.1**.
- Each operation has an explicit `operationId` matching the logical
  tool name (`sirene.lookup`, `kb.search`, …). The Flowise Custom Tool
  JSON key MUST match.
- Request + response schemas live inline (no `$ref` across files) so
  individual specs are self-contained and diffable.
- Errors use a shared envelope:
  ```yaml
  Error:
    type: object
    required: [code, message]
    properties:
      code: { type: string } # machine-readable, UPPER_SNAKE
      message: { type: string } # human-readable, locale-aware
      details: { type: object, additionalProperties: true }
  ```
- Authentication is declared at the spec level via `security` +
  `securitySchemes`. Never inline secrets.

## Downstream consumers

1. **Flowise Custom Tool JSON** — Wave 10.1's
   `scripts/generate-flowise-tools.ts` will emit one Custom Tool JSON
   per spec under `chatbuild/flowise_automation/tools/`.
2. **MetaMCP server config** — Wave 10.1's
   `scripts/generate-metamcp-servers.ts` will post one MetaMCP server
   per spec.
3. **Largo-process MCP clients** — Waves 1.2 / 1.5.2 / 2.1 / 5 / 8 will
   implement the client side of each spec under
   `src/process/services/mcpServices/<tool>/`.

All three consumers must stay byte-identical to the spec; the CI gate
in Wave 6.7's audit asserts this.
