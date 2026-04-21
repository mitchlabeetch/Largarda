/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generate one Flowise-importable chatflow JSON per entry in
 * `FLOW_CATALOG`, writing them to
 * `chatbuild/flowise_automation/flows/<flowKey>.json`.
 *
 * Each generated JSON is the **envelope** shape that Flowise accepts on
 * `POST /api/v1/chatflows`:
 *
 *   {
 *     id, name, flowData, deployed, isPublic, apikeyid, chatbotConfig,
 *     category, speechToText, type
 *   }
 *
 * The `flowData` contains a minimal but functional node graph (Mistral
 * Chat Model + Buffer Memory + Prompt Template + Conversation Chain)
 * plus a system prompt that captures the feature's intent. The graph is
 * deliberately small — prompt engineering and tool-graph enrichment
 * happen iteratively in the Flowise UI and are persisted back here by
 * re-exporting.
 *
 * Usage:
 *   bunx tsx scripts/generate-flowise-flows.ts
 *
 * The script is idempotent: running it twice produces byte-identical
 * output (modulo any manually-authored flow that has been exported over
 * the skeleton — the generator only rewrites if `--force` is passed).
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FLOW_CATALOG, type FlowSpec } from '../src/common/ma/flowise/catalog';
import { EMBEDDING_CONTRACT, FLOWISE_PRODUCTION_URL, QDRANT_PRODUCTION_URL } from '../src/common/ma/constants';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const FLOWS_DIR = join(REPO_ROOT, 'chatbuild', 'flowise_automation', 'flows');

const FORCE = process.argv.includes('--force');

// ---------------------------------------------------------------------------
// System-prompt templates — one per feature.
// ---------------------------------------------------------------------------

const SYSTEM_PROMPTS: Record<string, string> = {
  'ma.dd.analysis': `You are Largo, an AI analyst for French M&A due diligence.
Analyse the provided deal documents and produce a risk-categorised report covering:
- financial, legal, operational, regulatory, and reputational risks
- a severity (low / medium / high / critical) and a 1-100 score per finding
- concrete evidence quoted verbatim from the provided documents
- a prioritised recommendation per finding

Respond in the locale of the user's question. Always cite your sources.`,

  'ma.dd.risk.drill': `You are Largo, assisting a dealmaker who wants to drill into a specific risk finding.
Keep answers concise, grounded in the provided evidence, and always reference the source document by its filename and page when available.`,

  'ma.valuation.draft': `You are Largo, an M&A valuation analyst.
Produce a valuation report combining:
- a DCF analysis (explicit forecast + terminal value)
- a trading-multiples analysis vs public comparables in the same NAF sector
- an ANR (Actif Net Réévalué) cross-check when balance-sheet data is available
- a football-field chart summarising the range

Base all numbers on the supplied financial data; flag every assumption explicitly.`,

  'ma.docs.nda.draft': `You are Largo, drafting a French-market NDA between the parties named in the deal context.
Respect standard M&A NDA clauses (definitions, duration, exceptions, governing law, jurisdiction).
Keep the language in the locale of the deal context when provided.`,

  'ma.docs.loi.draft': `You are Largo, drafting a Letter of Intent (LOI) for a French-market M&A transaction.
Include transaction structure, indicative price / range, conditions precedent, exclusivity, confidentiality, governing law.
Keep the tone formal and balanced.`,

  'ma.docs.im.draft': `You are Largo, building an Information Memorandum (IM) for the target company.
Structure the IM in the canonical sections (Executive Summary, Business Overview, Market Context, Financials, Management, Transaction Overview).
Ground every claim in the supplied company profile and financial data.`,

  'ma.docs.teaser.draft': `You are Largo, drafting an anonymised teaser for a French M&A opportunity.
Do NOT reveal the target's name, SIREN, or any identifying detail.
Convey sector, scale, key financial highlights, and the ideal buyer profile in 1-2 pages.`,

  'ma.emails.draft': `You are Largo, drafting a professional outbound email for a dealmaker.
Match the intent (first approach, follow-up, NDA request, meeting request) the user specifies.
Keep it concise, in the locale of the recipient, and include a clear call to action.`,

  'ma.briefs.daily': `You are Largo, producing the user's daily M&A brief.
Synthesise overnight news, watchlist hits, and deal-pipeline updates into a single briefing.
Group items by relevance, cite every news source, and surface the top 3 items requiring user action today.`,

  'ma.company.qa': `You are Largo, answering questions about a specific French company.
Ground every answer in SIRENE + Pappers + your knowledge base.
When you cannot answer from these sources, say so explicitly and suggest which tool the user should run next.`,

  'ma.palette.search': `You are Largo, powering the command palette.
Given a short query, return the top 5 most relevant deals, companies, sectors, documents, and glossary terms from the user's knowledge base.
Respond in compact JSON: { results: [{ kind, id, title, snippet, score }] }.`,

  'ma.glossary.explain': `You are Largo, explaining an M&A term.
Provide: a one-line definition, a French-market nuance (if any), a worked example, and a cross-reference to related terms in the glossary.
Keep explanations grounded in the curated glossary corpus.`,

  'ma.sector.summary': `You are Largo, producing a sector snapshot for a NAF code.
Cover: the sector's scale, recent M&A activity, typical multiples, public data sources from data.gouv.fr, and the top 3 trends to watch.
Cite every statistic with its data.gouv.fr dataset id.`,

  'ma.kyc.screen': `You are Largo, performing a KYC / sanctions screen on a company or natural person.
Check OFAC, EU, and French sanctions lists; declare every hit with its list, risk level, and publication date.
If no hits are found, say so explicitly. Never fabricate a hit.`,

  'ma.comparables.search': `You are Largo, searching for public comparables in a given NAF sector and size range.
Return the top 10 matches from Pappers + data.gouv.fr with: name, SIREN, revenue, EBITDA, implied EV/EBITDA multiple, and a similarity score vs the target.
Sort by similarity.`,
};

// ---------------------------------------------------------------------------
// Node factories.
// ---------------------------------------------------------------------------

type FlowNode = Record<string, unknown>;
type FlowEdge = Record<string, unknown>;

function buildChatModelNode(spec: FlowSpec): FlowNode {
  return {
    id: `chatMistralAI_${shortId(spec.id)}`,
    position: { x: 300, y: 100 },
    type: 'customNode',
    data: {
      id: `chatMistralAI_${shortId(spec.id)}`,
      label: 'ChatMistralAI',
      version: 2,
      name: 'chatMistralAI',
      type: 'ChatMistralAI',
      baseClasses: ['ChatMistralAI', 'BaseChatModel', 'BaseLanguageModel'],
      category: 'Chat Models',
      inputs: {
        credential: 'mistral.chatflow',
        modelName: 'mistral-large-latest',
        temperature: 0.2,
        streaming: spec.supportsStreaming,
        maxOutputTokens: 4096,
      },
    },
    width: 300,
    height: 520,
  };
}

function buildPromptTemplateNode(spec: FlowSpec): FlowNode {
  const systemPrompt = SYSTEM_PROMPTS[spec.key] ?? `You are Largo, assisting with "${spec.description}".`;
  return {
    id: `chatPromptTemplate_${shortId(spec.id)}`,
    position: { x: 700, y: 100 },
    type: 'customNode',
    data: {
      id: `chatPromptTemplate_${shortId(spec.id)}`,
      label: 'Chat Prompt Template',
      version: 1,
      name: 'chatPromptTemplate',
      type: 'ChatPromptTemplate',
      baseClasses: ['ChatPromptTemplate', 'BaseChatPromptTemplate', 'BasePromptTemplate'],
      category: 'Prompts',
      inputs: {
        systemMessagePrompt: systemPrompt,
        humanMessagePrompt: '{question}',
      },
    },
    width: 300,
    height: 520,
  };
}

function buildMemoryNode(spec: FlowSpec): FlowNode {
  return {
    id: `bufferMemory_${shortId(spec.id)}`,
    position: { x: 300, y: 500 },
    type: 'customNode',
    data: {
      id: `bufferMemory_${shortId(spec.id)}`,
      label: 'Buffer Memory',
      version: 2,
      name: 'bufferMemory',
      type: 'BufferMemory',
      baseClasses: ['BufferMemory', 'BaseChatMemory', 'BaseMemory'],
      category: 'Memory',
      inputs: {
        memoryKey: 'chat_history',
      },
    },
    width: 300,
    height: 250,
  };
}

function buildRetrieverNode(spec: FlowSpec): FlowNode | null {
  if (spec.kbScopes.length === 0) return null;
  const scopeTag = spec.kbScopes.join('|');
  return {
    id: `qdrantRetriever_${shortId(spec.id)}`,
    position: { x: 700, y: 500 },
    type: 'customNode',
    data: {
      id: `qdrantRetriever_${shortId(spec.id)}`,
      label: 'Qdrant Retriever',
      version: 1,
      name: 'qdrantRetriever',
      type: 'QdrantRetriever',
      baseClasses: ['QdrantRetriever', 'VectorStoreRetriever', 'BaseRetriever'],
      category: 'Retrievers',
      inputs: {
        credential: 'qdrant.client',
        qdrantUrl: QDRANT_PRODUCTION_URL,
        qdrantCollection: '{{collectionName}}',
        qdrantDistance: EMBEDDING_CONTRACT.distance,
        qdrantDimensions: EMBEDDING_CONTRACT.dimensions,
        embeddingProvider: EMBEDDING_CONTRACT.provider,
        embeddingModel: EMBEDDING_CONTRACT.modelName,
        embeddingCredential: 'mistral.embedding',
        topK: 8,
        scopeTag,
      },
    },
    width: 300,
    height: 520,
  };
}

function buildChainNode(spec: FlowSpec): FlowNode {
  const kind = spec.kind === 'agentflow-v2' ? 'ConversationalAgent' : 'ConversationChain';
  return {
    id: `chain_${shortId(spec.id)}`,
    position: { x: 1100, y: 300 },
    type: 'customNode',
    data: {
      id: `chain_${shortId(spec.id)}`,
      label: spec.kind === 'agentflow-v2' ? 'Conversational Agent' : 'Conversation Chain',
      version: 3,
      name: kind,
      type: kind,
      baseClasses: [kind, 'BaseChain'],
      category: spec.kind === 'agentflow-v2' ? 'Agents' : 'Chains',
      inputs: {
        tools: spec.tools,
        kbScopes: spec.kbScopes,
        promptVersionId: spec.promptVersionId,
      },
      outputAnchors: [{ id: `chain_${shortId(spec.id)}-output`, name: 'output', label: 'Output', type: 'BaseChain' }],
    },
    width: 300,
    height: 400,
  };
}

function buildEdges(spec: FlowSpec, hasRetriever: boolean): FlowEdge[] {
  const chainId = `chain_${shortId(spec.id)}`;
  const edges: FlowEdge[] = [
    {
      source: `chatMistralAI_${shortId(spec.id)}`,
      sourceHandle: `chatMistralAI_${shortId(spec.id)}-output-chatMistralAI-ChatMistralAI|BaseChatModel|BaseLanguageModel`,
      target: chainId,
      targetHandle: `${chainId}-input-model-ChatMistralAI`,
      type: 'buttonedge',
      id: `e-model-${shortId(spec.id)}`,
    },
    {
      source: `chatPromptTemplate_${shortId(spec.id)}`,
      sourceHandle: `chatPromptTemplate_${shortId(spec.id)}-output-chatPromptTemplate-ChatPromptTemplate|BaseChatPromptTemplate|BasePromptTemplate`,
      target: chainId,
      targetHandle: `${chainId}-input-prompt-ChatPromptTemplate`,
      type: 'buttonedge',
      id: `e-prompt-${shortId(spec.id)}`,
    },
    {
      source: `bufferMemory_${shortId(spec.id)}`,
      sourceHandle: `bufferMemory_${shortId(spec.id)}-output-bufferMemory-BufferMemory|BaseChatMemory|BaseMemory`,
      target: chainId,
      targetHandle: `${chainId}-input-memory-BaseMemory`,
      type: 'buttonedge',
      id: `e-memory-${shortId(spec.id)}`,
    },
  ];
  if (hasRetriever) {
    edges.push({
      source: `qdrantRetriever_${shortId(spec.id)}`,
      sourceHandle: `qdrantRetriever_${shortId(spec.id)}-output-qdrantRetriever-QdrantRetriever|VectorStoreRetriever|BaseRetriever`,
      target: chainId,
      targetHandle: `${chainId}-input-retriever-BaseRetriever`,
      type: 'buttonedge',
      id: `e-retriever-${shortId(spec.id)}`,
    });
  }
  return edges;
}

// ---------------------------------------------------------------------------
// Envelope builder.
// ---------------------------------------------------------------------------

function humanNameFor(key: string): string {
  const [, ...rest] = key.split('.');
  const title = rest.join(' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return `Largo — ${title}`;
}

function buildChatbotConfig(spec: FlowSpec): Record<string, unknown> {
  return {
    welcomeMessage: `Largo ready. Flow: ${spec.key}, prompt version ${spec.promptVersionId}.`,
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
    kbScopes: spec.kbScopes,
    tools: spec.tools,
    supportsStreaming: spec.supportsStreaming,
  };
}

function buildEnvelope(spec: FlowSpec): Record<string, unknown> {
  const chatModel = buildChatModelNode(spec);
  const promptTpl = buildPromptTemplateNode(spec);
  const memory = buildMemoryNode(spec);
  const retriever = buildRetrieverNode(spec);
  const chain = buildChainNode(spec);
  const nodes: FlowNode[] = [chatModel, promptTpl, memory, chain];
  if (retriever) nodes.push(retriever);
  const edges = buildEdges(spec, retriever !== null);

  const flowData = JSON.stringify({ nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } });
  const now = new Date().toISOString();

  return {
    id: spec.id,
    name: humanNameFor(spec.key),
    flowData,
    deployed: false,
    isPublic: false,
    apikeyid: null,
    chatbotConfig: JSON.stringify(buildChatbotConfig(spec)),
    apiConfig: null,
    analytic: null,
    speechToText: null,
    followUpPrompts: null,
    category: `largo;${spec.key.split('.')[1] ?? 'general'}`,
    type: spec.kind === 'agentflow-v2' ? 'AGENTFLOW' : 'CHATFLOW',
    createdDate: now,
    updatedDate: now,
    // Metadata banner — helps the operator see which build generated this.
    _largoMeta: {
      flowKey: spec.key,
      promptVersionId: spec.promptVersionId,
      generatedBy: 'scripts/generate-flowise-flows.ts',
      generatedAt: now,
      targetBackend: FLOWISE_PRODUCTION_URL,
      catalogueStatus: spec.status,
    },
  };
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------

function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 12);
}

function main(): void {
  mkdirSync(FLOWS_DIR, { recursive: true });
  const report: { written: string[]; skipped: string[] } = { written: [], skipped: [] };

  for (const spec of Object.values(FLOW_CATALOG) as FlowSpec[]) {
    const outPath = join(FLOWS_DIR, `${spec.key}.json`);
    const envelope = buildEnvelope(spec);
    const serialised = `${JSON.stringify(envelope, null, 2)}\n`;

    if (existsSync(outPath) && !FORCE) {
      // Preserve manual edits unless --force.
      const existing = readFileSync(outPath, 'utf8');
      // Only skip if the existing file already has the right id — otherwise
      // the operator must have renamed a flow and we should overwrite.
      try {
        const existingEnvelope = JSON.parse(existing) as { id?: string };
        if (existingEnvelope.id === spec.id) {
          report.skipped.push(spec.key);
          continue;
        }
      } catch {
        // Malformed existing file → overwrite.
      }
    }

    writeFileSync(outPath, serialised, 'utf8');
    report.written.push(spec.key);
  }

  const { written, skipped } = report;
  const summary = [
    `Generated ${written.length} flow envelope(s) under chatbuild/flowise_automation/flows/`,
    written.length > 0 ? `  wrote:   ${written.join(', ')}` : null,
    skipped.length > 0 ? `  skipped: ${skipped.join(', ')} (pass --force to overwrite)` : null,
  ]
    .filter(Boolean)
    .join('\n');
  console.log(summary);
}

main();
