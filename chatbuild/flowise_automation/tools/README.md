# Flowise Custom Tool definitions (checked into the repo)

Each file in this folder is one Flowise Custom Tool JSON, keyed by the
logical tool name used by Largo. These tools are referenced from flows
in `../flows/` and may also be federated via MetaMCP once Wave 10.1
ships.

## Naming

```
tools/<toolName>.json
```

where `<toolName>` matches the values used in `FlowSpec.tools[]` inside
`src/common/ma/flowise/catalog.ts`, e.g. `sirene.lookup.json`,
`pappers.financials.json`, `kb.search.json`, `news.feed.json`.

## Lifecycle

1. **Spec first.** Author an OpenAPI spec at
   `docs/integrations/<provider>.openapi.yaml` describing the tool's
   request + response shape. This is the single source of truth.
2. **Generate.** Wave 10.1 adds
   `scripts/generate-flowise-tools.ts` which reads the OpenAPI spec
   and emits the Flowise Custom Tool JSON here. Before Wave 10.1, hand-
   author the JSON and keep it aligned with the spec.
3. **Reconcile.** `Update-LargoFlowise.ps1` pushes tools through
   `/api/v1/tools` in the same pass as flows.
4. **Bind.** A flow's `FlowSpec.tools[]` must not drift from the set
   of files present here; the catalogue test (Wave 6.6) will enforce
   this once it ships.

## Implementation backend

Each Custom Tool delegates to one of:

- A Largo-process MCP client exposed on the local HTTP bridge
  (`ipcBridge.ma.mcp.*`) — the default path.
- The MetaMCP federation bus at `mcp.manuora.fr` — only when
  `LARGO_METAMCP=1` is enabled (Wave 10.1).

The tool JSON itself is backend-agnostic; the backend selection
happens in the Flowise credential / env attached to the Custom Tool
node.

## Redaction

- Never commit a tool with an inline API key.
- Reference credentials by name (`insee.sirene`, `pappers.main`, etc.);
  the reconcile script resolves them from Flowise's credential store.

## Related documents

- Flow catalogue: `src/common/ma/flowise/catalog.ts`
- Tool federation plan: `docs/plans/2026-04-20-backend-scaling-plan.md` § 2
- Wave 10.1 spec: `tasks.md` Wave 10
