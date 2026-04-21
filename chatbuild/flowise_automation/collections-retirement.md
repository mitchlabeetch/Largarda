# Qdrant collection retirement plan — 2026-04-20

State captured by the audit at
`docs/audit/2026-04-20-backend-snapshot-findings.md` § 2.4. This plan
consolidates the 4 currently-live collections into the new scoped
topology (`docs/plans/2026-04-20-backend-scaling-plan.md` § 3) with
zero data loss for the curated chunks.

## Current state (2026-04-20)

| Collection               | Chunks | Embedding            | Action                                                                                 |
| ------------------------ | -----: | -------------------- | -------------------------------------------------------------------------------------- |
| `LargoCurated20260419d`  |    281 | mistral-embed / 1024 | **Keep** — relabel as `largo_glossary_20260419d` (global scope).                       |
| `LargoCurated20260419c`  |    335 | mistral-embed / 1024 | **Retire** — superseded by `…d`.                                                       |
| `LargoRepaired20260419b` |    336 | mistral-embed / 1024 | **Keep** — relabel as `largo_legacy_20260419b` (legacy scope, read-only for 6 months). |
| `LargoRepaired20260419`  |      0 | mistral-embed / 1024 | **Delete** — empty rebuild artefact.                                                   |

All four collections are already on the canonical embedding contract
(`mistralAIEmbeddings / mistral-embed @ 1024 dim`), so the retired
collections' chunks either (a) duplicate content in a kept collection
(`…c` is superseded by `…d`), or (b) contain no chunks (`…20260419`).

## Execution order

1. **Snapshot.** Before any mutation, export the four collections:

   ```powershell
   Invoke-LargoQdrantSnapshot -Collection LargoCurated20260419d `
                              -OutPath   backup/LargoCurated20260419d.qdrant
   # ... same for the other three
   ```

   This uses Qdrant's native `/collections/{name}/snapshots` endpoint
   and writes the snapshot to disk. Keep snapshots for 30 days.

2. **Create targets.** Create the two target collections via the
   Qdrant create endpoint with:
   - `vector_size: 1024`
   - `distance: Cosine`
   - `on_disk_payload: true`
   - payload indexes per scope (see scaling plan § 3).

3. **Copy points.** Use the `kb.upsert` tool
   (`docs/integrations/kb.openapi.yaml`) to stream points from the
   source to the target collection; payload fields are mapped
   `source → target`:
   - `LargoCurated20260419d` → `largo_glossary_20260419d`:
     add `scope: 'global'`, `scope_id: null`.
   - `LargoRepaired20260419b` → `largo_legacy_20260419b`:
     add `scope: 'legacy'`, `scope_id: null`.

4. **Sanity check.** Query both new collections with a handful of
   known prompts; confirm recall is ≥ 95 % vs the old collection
   (Wave 6.7 audit already automates this).

5. **Retire sources.** Only once the new collections pass the sanity
   check:
   - Delete `LargoCurated20260419c` (superseded duplicate).
   - Delete `LargoRepaired20260419` (empty).
   - Delete `LargoCurated20260419d` and `LargoRepaired20260419b`
     (superseded by the `largo_*` renames).

6. **Update the Flowise document stores.** The four document-store
   entries that reference the old collections must be either:
   - Re-pointed at the new collections via
     `PATCH /api/v1/document-store/store/{id}`, or
   - Deleted and recreated by re-running the chatbuild ingestion
     pipeline with the new collection names.
   - Keep the `pg-record-manager` credential binding intact so dedup
     history survives.

## Rollback

If step 4's sanity check fails:

- Do **not** proceed to step 5.
- The Qdrant snapshots from step 1 can be restored via
  `POST /collections/{name}/snapshots/{snapshot}/recover`.
- The Flowise document stores still point at the original collections,
  so no user-facing regression.

## Post-retirement audit

Re-run the Wave 6.7 coverage audit; expected changes from the
`docs/audit/2026-04-20-backend-snapshot-findings.md` baseline:

- Collection count: 4 → 2 + whatever new scoped collections the Wave
  6.5 ingestion pipeline has created in the meantime.
- Total chunks: 281 + 336 = 617 (vs 952 today) — the 335 discarded
  chunks from `…c` are content-duplicates of the 281 kept in `…d`.
- Embedding contract: unchanged (1024-dim mistral-embed).
