/**
 * Flowise Live Smoke Test — CLI
 *
 * Executes available deployed flows against the live Flowise backend.
 * Skips flows that don't exist or aren't deployed yet.
 *
 * Respects `FLOWISE_BASE_URL` / `FLOWISE_API_KEY` env vars; falls back to
 * production constants and prompts for key if missing.
 *
 * Exit codes:
 *   0 — both flows succeeded (basic content received)
 *   1 — network / auth / flow runtime error
 *   2 — missing configuration (no key and production unreachable)
 *
 * Usage:
 *   # With env vars (recommended for CI):
 *   FLOWISE_BASE_URL=https://filo.manuora.fr FLOWISE_API_KEY=xxx bunx tsx scripts/smoke-flowise.ts
 *
 *   # Interactive (prompts for key if env unset):
 *   bunx tsx scripts/smoke-flowise.ts
 */

import {
  createFloWiseConnection,
  probeFlowiseReadiness,
  resolveFlowiseConfig,
} from '../src/process/agent/flowise/FloWiseConnection';
import { resolveFlowSpec } from '../src/common/ma/flowise/catalog';

// ── CLI helpers ────────────────────────────────────────────────────────────

function log(msg: string): void {
  // eslint-disable-next-line no-console
  console.log(msg);
}

function die(msg: string, code = 1): never {
  // eslint-disable-next-line no-console
  console.error(`[smoke-flowise] fatal: ${msg}`);
  process.exit(code);
}

function hasContent(text: unknown): boolean {
  return typeof text === 'string' && text.trim().length > 10;
}

type FlowDeploymentInfo = { id: string; name: string; deployed: boolean | null };

async function fetchDeployedFlows(): Promise<FlowDeploymentInfo[]> {
  const { baseUrl, apiKey } = resolveFlowiseConfig();
  const resp = await fetch(`${baseUrl}/api/v1/chatflows`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const flows = (await resp.json()) as Array<{ id: string; name: string; deployed: boolean | null }>;
  return flows.map((f) => ({ id: f.id, name: f.name, deployed: f.deployed }));
}

function isDeployed(flows: FlowDeploymentInfo[], id: string): boolean {
  const f = flows.find((x) => x.id === id);
  return f != null && f.deployed === true;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  log('[smoke-flowise] Starting live smoke test…');

  // 1. Readiness check (fast fail on bad key / unreachable)
  log('[smoke-flowise] Probe readiness…');
  const ready = await probeFlowiseReadiness();
  log(`  baseUrl: ${ready.baseUrl}`);
  log(`  hasApiKey: ${ready.hasApiKey} (source: ${ready.apiKeySource})`);
  log(`  pingOk: ${ready.pingOk}`);
  log(`  authOk: ${ready.authOk}`);

  if (!ready.pingOk) {
    die(`Flowise unreachable${ready.error ? `: ${ready.error}` : ''}`);
  }
  if (!ready.authOk) {
    die(`Flowise auth failed${ready.error ? `: ${ready.error}` : ''}`);
  }
  log(`  flows visible: ${ready.flowCount ?? '?'}`);

  // 2. Build connection (uses the env fallback already validated)
  const conn = createFloWiseConnection();

  // 3. Check which flows exist and are deployed
  log('\n[smoke-flowise] Checking flow deployment status…');
  const deployedFlows = await fetchDeployedFlows();
  log(`  found ${deployedFlows.length} total flows`);

  // Test non-streaming: use ma.dd.analysis (exists and is AGENTFLOW)
  const ddSpec = resolveFlowSpec('ma.dd.analysis');
  if (!isDeployed(deployedFlows, ddSpec.id)) {
    log(`  ⚠ ${ddSpec.key} not deployed (id=${ddSpec.id}) — skipping`);
  } else {
    log(`\n[smoke-flowise] Run ${ddSpec.key} (non-streaming)…`);
    try {
      const result = await conn.executeFlow(ddSpec.id, {
        question: 'Analyze this M&A deal: Target is a French SaaS startup, revenue €5M, asking €25M',
        overrideConfig: {},
      });
      if (!hasContent(result.text)) {
        die(`${ddSpec.key}: returned empty/short content`);
      }
      log(`  ✓ received ${result.text.length} chars`);
    } catch (err) {
      die(`${ddSpec.key}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Test streaming: use ma.dd.risk.drill (exists and is CHATFLOW)
  const drillSpec = resolveFlowSpec('ma.dd.risk.drill');
  if (!isDeployed(deployedFlows, drillSpec.id)) {
    log(`  ⚠ ${drillSpec.key} not deployed (id=${drillSpec.id}) — skipping`);
  } else {
    log(`\n[smoke-flowise] Run ${drillSpec.key} (streaming)…`);
    try {
      let tokenCount = 0;
      let finalText = '';
      const result = await conn.streamFlow(
        drillSpec.id,
        { question: 'Drill down on financial risk', overrideConfig: {} },
        (event) => {
          if (event.type === 'token' && typeof event.data === 'string') {
            tokenCount += 1;
            finalText += event.data;
          }
        }
      );
      const content = finalText || result.text;
      if (!hasContent(content)) {
        die(`${drillSpec.key}: streamed empty/short content`);
      }
      log(`  ✓ received ${tokenCount} tokens, total ${content.length} chars`);
    } catch (err) {
      die(`${drillSpec.key}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 5. Summary
  const skipped = [!isDeployed(deployedFlows, ddSpec.id), !isDeployed(deployedFlows, drillSpec.id)].filter(
    Boolean
  ).length;
  if (skipped === 2) {
    log('\n[smoke-flowise] ⚠ No deployed flows found to test. Deploy flows in Flowise first.');
    process.exit(1);
  } else {
    log('\n[smoke-flowise] All available smoke tests passed.');
    process.exit(0);
  }
}

main().catch((err) => {
  die(err instanceof Error ? err.message : String(err), 1);
});
