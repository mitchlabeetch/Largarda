/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';

import { AGENT_MODES, FALLBACK_AGENT_MODES, getAgentModes, supportsModeSwitch } from '@renderer/utils/model/agentModes';
import type { AcpSessionConfigOption } from '@/common/types/acpTypes';

describe('AGENT_MODES.claude', () => {
  const claudeModes = AGENT_MODES.claude;

  it('has exactly 5 modes', () => {
    expect(claudeModes).toHaveLength(5);
  });

  it('contains all 5 Claude Code permission modes', () => {
    const values = claudeModes.map((m) => m.value);
    expect(values).toEqual(['default', 'acceptEdits', 'plan', 'bypassPermissions', 'dontAsk']);
  });

  it('each mode has a non-empty label', () => {
    for (const mode of claudeModes) {
      expect(mode.label).toBeTruthy();
    }
  });

  it('acceptEdits, dontAsk have descriptions', () => {
    const withDesc = claudeModes.filter((m) => ['acceptEdits', 'dontAsk'].includes(m.value));
    expect(withDesc).toHaveLength(2);
    for (const mode of withDesc) {
      expect(mode.description).toBeTruthy();
    }
  });
});

describe('getAgentModes', () => {
  it('returns claude modes for "claude" backend', () => {
    const modes = getAgentModes('claude');
    expect(modes).toHaveLength(5);
    expect(modes[0].value).toBe('default');
  });

  it('returns empty array for unknown backend', () => {
    expect(getAgentModes('nonexistent')).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(getAgentModes(undefined)).toEqual([]);
  });
});

describe('supportsModeSwitch', () => {
  it('returns true for claude', () => {
    expect(supportsModeSwitch('claude')).toBe(true);
  });

  it('returns false for undefined', () => {
    expect(supportsModeSwitch(undefined)).toBe(false);
  });
});

// --- Dynamic configOptions tests ---

const mockModeConfigOptions: AcpSessionConfigOption[] = [
  {
    id: 'mode',
    category: 'mode',
    type: 'select',
    currentValue: 'default',
    options: [
      { value: 'default', name: 'Default' },
      { value: 'fast', name: 'Fast' },
      { value: 'yolo', label: 'YOLO Mode' },
    ],
  },
  {
    id: 'thought_level',
    category: 'other',
    type: 'select',
    currentValue: 'normal',
    options: [
      { value: 'normal', name: 'Normal' },
      { value: 'high', name: 'High' },
    ],
  },
];

describe('FALLBACK_AGENT_MODES alias', () => {
  it('AGENT_MODES is an alias for FALLBACK_AGENT_MODES', () => {
    expect(AGENT_MODES).toBe(FALLBACK_AGENT_MODES);
  });
});

describe('getAgentModes with configOptions', () => {
  it('prefers dynamic modes from configOptions over fallback', () => {
    const modes = getAgentModes('claude', mockModeConfigOptions);
    expect(modes).toHaveLength(3);
    expect(modes.map((m) => m.value)).toEqual(['default', 'fast', 'yolo']);
  });

  it('uses label from configOptions option (prefers label over name)', () => {
    const modes = getAgentModes('claude', mockModeConfigOptions);
    expect(modes[2].label).toBe('YOLO Mode');
  });

  it('falls back to name when label is absent', () => {
    const modes = getAgentModes('claude', mockModeConfigOptions);
    expect(modes[0].label).toBe('Default');
  });

  it('falls back to FALLBACK_AGENT_MODES when configOptions is empty', () => {
    const modes = getAgentModes('claude', []);
    expect(modes).toHaveLength(5); // fallback claude modes
    expect(modes[0].value).toBe('default');
  });

  it('falls back to FALLBACK_AGENT_MODES when configOptions has no mode category', () => {
    const noModeOptions: AcpSessionConfigOption[] = [
      { id: 'thought', type: 'select', category: 'other', options: [{ value: 'a' }] },
    ];
    const modes = getAgentModes('claude', noModeOptions);
    expect(modes).toHaveLength(5);
  });

  it('falls back when configOptions is undefined', () => {
    const modes = getAgentModes('claude', undefined);
    expect(modes).toHaveLength(5);
  });

  it('returns dynamic modes even for unknown backend when configOptions has modes', () => {
    const modes = getAgentModes('brandnew', mockModeConfigOptions);
    expect(modes).toHaveLength(3);
  });
});

describe('supportsModeSwitch with configOptions', () => {
  it('returns true when configOptions has mode options', () => {
    expect(supportsModeSwitch('unknownbackend', mockModeConfigOptions)).toBe(true);
  });

  it('falls back to FALLBACK_AGENT_MODES when configOptions is empty', () => {
    expect(supportsModeSwitch('claude', [])).toBe(true);
    expect(supportsModeSwitch('nonexistent', [])).toBe(false);
  });
});
