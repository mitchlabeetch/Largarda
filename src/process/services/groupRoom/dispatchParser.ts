/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

// -- Types --

/** A single dispatch instruction parsed from host agent output. */
export type DispatchInstruction = {
  /** The task prompt to send to the agent */
  prompt: string;
  /** Short description (used as display name) */
  description: string;
} & (
  | { agentId: string; type?: undefined } // reuse existing member
  | { agentId?: undefined; type?: string } // dynamic creation
);

/** Result reported back by a sub-agent. */
export type SubAgentResult = {
  agentName: string;
  status: 'success' | 'error';
  content: string;
};

// -- Parsers --

/**
 * Parse `<dispatch>` blocks from host agent output.
 *
 * Format mirrors Claude Code's Agent tool parameters:
 * ```xml
 * <dispatch>
 *   <agent description="3-5 word summary" prompt="detailed task"/>
 *   <agent id="existing-agent-id" prompt="follow-up task"/>
 * </dispatch>
 * ```
 */
export function parseDispatchInstructions(rawOutput: string): DispatchInstruction[] {
  // 1. Strip code blocks to avoid false positives
  const stripped = rawOutput.replace(/```[\s\S]*?```/g, '');

  // 2. Extract <dispatch>...</dispatch> block (only the first one).
  const blockMatch = stripped.match(/<dispatch>([\s\S]*?)<\/dispatch>/);
  if (!blockMatch) {
    return [];
  }

  const block = blockMatch[1];

  // 3. Extract self-closing <agent .../> and paired <agent ...>...</agent> elements
  const results: DispatchInstruction[] = [];

  // Self-closing: <agent description="..." prompt="..."/>
  const selfClosingPattern = /<agent\s+([^>]*?)\/>/g;
  let match: RegExpExecArray | null;
  while ((match = selfClosingPattern.exec(block)) !== null) {
    const parsed = parseAgentAttrs(match[1]);
    if (parsed) results.push(parsed);
  }

  // Paired: <agent ...>prompt text</agent>
  const pairedPattern = /<agent\s+([^>]*)>([\s\S]*?)<\/agent>/g;
  while ((match = pairedPattern.exec(block)) !== null) {
    const attrs = match[1];
    const body = match[2].trim();
    const parsed = parseAgentAttrs(attrs, body);
    if (parsed) results.push(parsed);
  }

  // 4. Limit to at most 5 dispatched agents
  return results.slice(0, 5);
}

function parseAgentAttrs(attrs: string, bodyPrompt?: string): DispatchInstruction | null {
  const prompt = getAttr(attrs, 'prompt') ?? bodyPrompt ?? '';
  const description = getAttr(attrs, 'description') ?? '';
  if (!prompt) return null;

  // Existing agent by id
  const id = getAttr(attrs, 'id');
  if (id) {
    return { agentId: id, description: description || id, prompt };
  }

  // New agent — description is required for display name
  if (!description) return null;
  const type = getAttr(attrs, 'type') ?? 'claude';
  return { type, description, prompt };
}

function getAttr(attrs: string, name: string): string | null {
  const match = attrs.match(new RegExp(`${name}="([^"]*)"`));
  return match ? match[1].trim() : null;
}

// -- Formatters --

/**
 * Format sub-agent results as plain text for re-injection into host context.
 * Matches Claude Code's pattern: agent tool results appear as plain text
 * messages in the conversation.
 */
export function formatResultReport(results: SubAgentResult[]): string {
  return results
    .map((r) => {
      const status = r.status === 'success' ? 'completed' : 'error';
      return `[Agent "${r.agentName}" ${status}]\n${r.content}`;
    })
    .join('\n\n');
}

/**
 * Human-readable dispatch summary for persistence / UI display.
 */
export function formatDispatchSummary(dispatches: DispatchInstruction[]): string {
  return dispatches
    .map((d, i) => {
      const target = d.agentId ? `→ ${d.agentId}` : `+ ${d.description}`;
      return `${i + 1}. ${target}\n${d.prompt}`;
    })
    .join('\n\n');
}
