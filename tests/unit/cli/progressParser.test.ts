/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  stripAnsi,
  parseProgressLine,
  parseProgressChunk,
} from '../../../src/cli/ui/progressParser';

describe('stripAnsi', () => {
  it('removes CSI escape codes', () => {
    expect(stripAnsi('\x1b[32mhello\x1b[0m')).toBe('hello');
  });

  it('removes OSC escape codes', () => {
    expect(stripAnsi('\x1b]0;title\x07world')).toBe('world');
  });

  it('returns unchanged string with no escape codes', () => {
    expect(stripAnsi('plain text')).toBe('plain text');
  });
});

describe('parseProgressLine', () => {
  it('returns null for blank lines', () => {
    expect(parseProgressLine('')).toBeNull();
    expect(parseProgressLine('   ')).toBeNull();
    expect(parseProgressLine('\t')).toBeNull();
  });

  it('returns null for ERROR log lines', () => {
    expect(parseProgressLine('codex_core ERROR: something failed')).toBeNull();
  });

  it('returns null for WARN log lines', () => {
    expect(parseProgressLine('mymodule WARN: low memory')).toBeNull();
  });

  it('returns null for DEBUG log lines', () => {
    expect(parseProgressLine('logger DEBUG: internal state')).toBeNull();
  });

  it('returns null for OpenAI Codex header lines', () => {
    expect(parseProgressLine('OpenAI Codex v1.2.3')).toBeNull();
  });

  it('returns null for workdir: header lines', () => {
    expect(parseProgressLine('workdir: /home/user/project')).toBeNull();
  });

  it('returns null for ISO timestamp lines', () => {
    expect(parseProgressLine('2024-01-15T10:30:00Z some event')).toBeNull();
  });

  it('returns null for ANSI-only content (no printable letters)', () => {
    expect(parseProgressLine('\x1b[32m\x1b[0m')).toBeNull();
  });

  it('returns null for symbol-only lines with no alphanumeric content', () => {
    expect(parseProgressLine('─────────────────────────────────')).toBeNull();
  });

  it("returns kind:'tool' for tool invocation lines", () => {
    const result = parseProgressLine('Bash: ls -la /tmp');
    expect(result).not.toBeNull();
    expect(result?.kind).toBe('tool');
  });

  it("returns kind:'tool' for read tool lines", () => {
    const result = parseProgressLine('Read: src/index.ts');
    expect(result).not.toBeNull();
    expect(result?.kind).toBe('tool');
  });

  it("returns kind:'file' for file operation lines", () => {
    const result = parseProgressLine('Reading src/index.ts for analysis');
    expect(result).not.toBeNull();
    expect(result?.kind).toBe('file');
  });

  it("returns kind:'file' for writing file lines", () => {
    const result = parseProgressLine('Writing output/result.json to disk');
    expect(result).not.toBeNull();
    expect(result?.kind).toBe('file');
  });

  it("returns kind:'thinking' for thinking lines", () => {
    const result = parseProgressLine('Thinking about the best approach');
    expect(result).not.toBeNull();
    expect(result?.kind).toBe('thinking');
  });

  it("returns kind:'thinking' for analyzing lines", () => {
    const result = parseProgressLine('Analyzing the codebase structure');
    expect(result).not.toBeNull();
    expect(result?.kind).toBe('thinking');
  });

  it("returns kind:'generic' for normal text", () => {
    const result = parseProgressLine('Found 3 issues in the file');
    expect(result).not.toBeNull();
    expect(result?.kind).toBe('generic');
  });

  it('truncates text to 120 characters', () => {
    const longText = 'A'.repeat(200);
    const result = parseProgressLine(longText);
    expect(result).not.toBeNull();
    expect(result?.text.length).toBe(120);
  });

  it('strips ANSI codes before processing', () => {
    const result = parseProgressLine('\x1b[32mThinking about the solution\x1b[0m');
    expect(result).not.toBeNull();
    expect(result?.kind).toBe('thinking');
    expect(result?.text).not.toContain('\x1b');
  });
});

describe('parseProgressChunk', () => {
  it('splits multiline input and filters noise', () => {
    const chunk = [
      'Thinking about the solution',
      'codex_core ERROR: something failed',
      'Reading src/utils.ts',
    ].join('\n');
    const results = parseProgressChunk(chunk);
    expect(results).toHaveLength(2);
    expect(results[0]?.kind).toBe('thinking');
    expect(results[1]?.kind).toBe('file');
  });

  it('returns empty array for all-noise input', () => {
    const chunk = [
      'codex_core ERROR: failure',
      'workdir: /project',
      '2024-01-15T10:30:00Z timestamp',
      '',
      '────────────────────',
    ].join('\n');
    expect(parseProgressChunk(chunk)).toHaveLength(0);
  });

  it('returns empty array for empty string', () => {
    expect(parseProgressChunk('')).toHaveLength(0);
  });
});
