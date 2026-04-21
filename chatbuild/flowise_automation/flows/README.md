# Flowise flow definitions (checked into the repo)

Each file in this folder is one Flowise chatflow or AgentFlow v2,
exported from the Flowise UI or authored by hand, **keyed by the stable
`flowKey` defined in `src/common/ma/flowise/catalog.ts`**.

## Naming

```
flows/<flowKey>.json
```

where `<flowKey>` is the key from `KNOWN_FLOW_KEYS` (dots preserved),
e.g. `ma.dd.analysis.json`, `ma.company.qa.json`.

## Lifecycle

1. **Draft.** The catalogue entry ships with `status: 'draft'` and
   `id: 'draft_<snake>'`. No JSON exists here yet; calling the flow in
   production throws a `FLOWISE_FLOW_ERROR`.
2. **Author.** Create / edit the flow in the Flowise UI on
   `filo.manuora.fr`, then export to `ma.<flow>.json` under this
   folder. The export must be the full Flowise chatflow JSON
   (`id`, `name`, `flowData`, `apikey`, `isPublic`, `deployed`, ...).
3. **Reconcile.** Run `chatbuild/flowise_automation/Update-LargoFlowise.ps1`.
   The script:
   - Diffs every file here against Flowise.
   - Applies missing / changed flows through `/api/v1/chatflows`.
   - Emits a diff report to `chatbuild/flowise_automation/output/diff-*.json`.
4. **Flip status.** Update the matching entry in `catalog.ts` from
   `draft` → `authored` or `deployed`, replacing the `draft_*` id with
   the real Flowise UUID and bumping `promptVersionId`.

## Guard-rails

- **Never commit a flow file whose `flowKey` is not in `KNOWN_FLOW_KEYS`.**
  Wave 6.3 adds a pre-commit guard that fails on this.
- **Redact API keys and OpenAI keys before committing.** Flow exports
  may contain inline credentials; the reconcile script rehydrates them
  from Flowise's credential store by name.
- **Stable ids only.** A flow's Flowise UUID is stable; prompt edits
  bump `promptVersionId` in `catalog.ts`, not the id.

## Related documents

- Flow catalogue: `src/common/ma/flowise/catalog.ts`
- Flow keys: `src/common/ma/flowise/flowKey.ts`
- Scaling plan: `docs/plans/2026-04-20-backend-scaling-plan.md` § 1
- Audit findings: `docs/audit/2026-04-20-backend-snapshot-findings.md`
