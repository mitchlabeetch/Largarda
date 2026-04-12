import { describe, expect, it } from 'vitest';

import {
  getLevelMode,
  getMaxAvailableLevel,
  getModeLevel,
  mapLeaderModeToMemberMode,
  PermissionLevel,
} from '@/common/types/agentPermissionLevel';

// ---------------------------------------------------------------------------
// getModeLevel
// ---------------------------------------------------------------------------

describe('getModeLevel', () => {
  describe('claude modes', () => {
    it('plan → L0', () => {
      expect(getModeLevel('claude', 'plan')).toBe(PermissionLevel.L0_LOCKED);
    });

    it('default → L1', () => {
      expect(getModeLevel('claude', 'default')).toBe(PermissionLevel.L1_DEFAULT);
    });

    it('acceptEdits → L2', () => {
      expect(getModeLevel('claude', 'acceptEdits')).toBe(PermissionLevel.L2_AUTO_EDIT);
    });

    it('bypassPermissions → L3', () => {
      expect(getModeLevel('claude', 'bypassPermissions')).toBe(PermissionLevel.L3_FULL_AUTO);
    });

    it('dontAsk → L3 (user intent is "don\'t bother me")', () => {
      expect(getModeLevel('claude', 'dontAsk')).toBe(PermissionLevel.L3_FULL_AUTO);
    });

    it('auto (legacy alias) → L3', () => {
      expect(getModeLevel('claude', 'auto')).toBe(PermissionLevel.L3_FULL_AUTO);
    });
  });

  describe('gemini modes', () => {
    it('default → L1', () => {
      expect(getModeLevel('gemini', 'default')).toBe(PermissionLevel.L1_DEFAULT);
    });

    it('autoEdit → L2', () => {
      expect(getModeLevel('gemini', 'autoEdit')).toBe(PermissionLevel.L2_AUTO_EDIT);
    });

    it('yolo → L3', () => {
      expect(getModeLevel('gemini', 'yolo')).toBe(PermissionLevel.L3_FULL_AUTO);
    });
  });

  describe('codex modes', () => {
    it('default → L1', () => {
      expect(getModeLevel('codex', 'default')).toBe(PermissionLevel.L1_DEFAULT);
    });

    it('autoEdit → L2', () => {
      expect(getModeLevel('codex', 'autoEdit')).toBe(PermissionLevel.L2_AUTO_EDIT);
    });

    it('yolo → L3', () => {
      expect(getModeLevel('codex', 'yolo')).toBe(PermissionLevel.L3_FULL_AUTO);
    });

    it('yoloNoSandbox → L3', () => {
      expect(getModeLevel('codex', 'yoloNoSandbox')).toBe(PermissionLevel.L3_FULL_AUTO);
    });
  });

  describe('qwen modes', () => {
    it('default → L1', () => {
      expect(getModeLevel('qwen', 'default')).toBe(PermissionLevel.L1_DEFAULT);
    });

    it('yolo → L3', () => {
      expect(getModeLevel('qwen', 'yolo')).toBe(PermissionLevel.L3_FULL_AUTO);
    });
  });

  describe('iflow modes', () => {
    it('plan → L0', () => {
      expect(getModeLevel('iflow', 'plan')).toBe(PermissionLevel.L0_LOCKED);
    });

    it('default → L1', () => {
      expect(getModeLevel('iflow', 'default')).toBe(PermissionLevel.L1_DEFAULT);
    });

    it('smart → L2', () => {
      expect(getModeLevel('iflow', 'smart')).toBe(PermissionLevel.L2_AUTO_EDIT);
    });

    it('yolo → L3', () => {
      expect(getModeLevel('iflow', 'yolo')).toBe(PermissionLevel.L3_FULL_AUTO);
    });
  });

  describe('aionrs modes', () => {
    it('default → L1', () => {
      expect(getModeLevel('aionrs', 'default')).toBe(PermissionLevel.L1_DEFAULT);
    });

    it('auto_edit → L2', () => {
      expect(getModeLevel('aionrs', 'auto_edit')).toBe(PermissionLevel.L2_AUTO_EDIT);
    });

    it('yolo → L3', () => {
      expect(getModeLevel('aionrs', 'yolo')).toBe(PermissionLevel.L3_FULL_AUTO);
    });
  });

  describe('cursor modes', () => {
    it('ask → L0', () => {
      expect(getModeLevel('cursor', 'ask')).toBe(PermissionLevel.L0_LOCKED);
    });

    it('plan → L0', () => {
      expect(getModeLevel('cursor', 'plan')).toBe(PermissionLevel.L0_LOCKED);
    });

    it('agent → L3', () => {
      expect(getModeLevel('cursor', 'agent')).toBe(PermissionLevel.L3_FULL_AUTO);
    });
  });

  describe('opencode modes', () => {
    it('plan → L0', () => {
      expect(getModeLevel('opencode', 'plan')).toBe(PermissionLevel.L0_LOCKED);
    });

    it('build → L2', () => {
      expect(getModeLevel('opencode', 'build')).toBe(PermissionLevel.L2_AUTO_EDIT);
    });
  });

  describe('codebuddy modes', () => {
    it('default → L1', () => {
      expect(getModeLevel('codebuddy', 'default')).toBe(PermissionLevel.L1_DEFAULT);
    });

    it('acceptEdits → L2', () => {
      expect(getModeLevel('codebuddy', 'acceptEdits')).toBe(PermissionLevel.L2_AUTO_EDIT);
    });

    it('bypassPermissions → L3', () => {
      expect(getModeLevel('codebuddy', 'bypassPermissions')).toBe(PermissionLevel.L3_FULL_AUTO);
    });
  });

  describe('fallback behavior', () => {
    it('unknown backend falls back to L1', () => {
      expect(getModeLevel('unknownBackend', 'default')).toBe(PermissionLevel.L1_DEFAULT);
    });

    it('unknown mode on known backend falls back to L1', () => {
      expect(getModeLevel('claude', 'nonExistentMode')).toBe(PermissionLevel.L1_DEFAULT);
    });

    it('unknown backend + unknown mode falls back to L1', () => {
      expect(getModeLevel('noSuchBackend', 'noSuchMode')).toBe(PermissionLevel.L1_DEFAULT);
    });
  });
});

// ---------------------------------------------------------------------------
// getLevelMode
// ---------------------------------------------------------------------------

describe('getLevelMode', () => {
  describe('exact match', () => {
    it('gemini L1 → default', () => {
      expect(getLevelMode('gemini', PermissionLevel.L1_DEFAULT)).toBe('default');
    });

    it('gemini L2 → autoEdit', () => {
      expect(getLevelMode('gemini', PermissionLevel.L2_AUTO_EDIT)).toBe('autoEdit');
    });

    it('gemini L3 → yolo', () => {
      expect(getLevelMode('gemini', PermissionLevel.L3_FULL_AUTO)).toBe('yolo');
    });

    it('claude L0 → plan', () => {
      expect(getLevelMode('claude', PermissionLevel.L0_LOCKED)).toBe('plan');
    });

    it('claude L1 → default', () => {
      expect(getLevelMode('claude', PermissionLevel.L1_DEFAULT)).toBe('default');
    });

    it('iflow L0 → plan', () => {
      expect(getLevelMode('iflow', PermissionLevel.L0_LOCKED)).toBe('plan');
    });

    it('cursor L0 → ask (first canonical mode)', () => {
      expect(getLevelMode('cursor', PermissionLevel.L0_LOCKED)).toBe('ask');
    });

    it('cursor L3 → agent', () => {
      expect(getLevelMode('cursor', PermissionLevel.L3_FULL_AUTO)).toBe('agent');
    });
  });

  describe('closest match (not equidistant)', () => {
    it('cursor L1 → ask (L0 distance=1, L3 distance=2, closer below)', () => {
      expect(getLevelMode('cursor', PermissionLevel.L1_DEFAULT)).toBe('ask');
    });

    it('cursor L2 with strict leader → ask (L0 dist=2, L3 dist=1, closer above → agent... wait)', () => {
      // cursor has L0 (ask) and L3 (agent). L2 target: dist to L0=2, dist to L3=1 → strictly closer above → agent
      expect(getLevelMode('cursor', PermissionLevel.L2_AUTO_EDIT, PermissionLevel.L1_DEFAULT)).toBe('agent');
    });

    it('aionrs L0 → default (only L1+ available, closest above)', () => {
      expect(getLevelMode('aionrs', PermissionLevel.L0_LOCKED)).toBe('default');
    });
  });

  describe('equidistant tiebreak with leader direction', () => {
    it('qwen L2 with permissive leader (L2) → yolo (equidistant L1 vs L3, leader>=2 picks up)', () => {
      expect(getLevelMode('qwen', PermissionLevel.L2_AUTO_EDIT, PermissionLevel.L2_AUTO_EDIT)).toBe('yolo');
    });

    it('qwen L2 with strict leader (L1) → default (equidistant L1 vs L3, leader<=1 picks down)', () => {
      expect(getLevelMode('qwen', PermissionLevel.L2_AUTO_EDIT, PermissionLevel.L1_DEFAULT)).toBe('default');
    });

    it('opencode L1 with strict leader (L1) → plan (equidistant L0 vs L2, leader<=1 picks down)', () => {
      expect(getLevelMode('opencode', PermissionLevel.L1_DEFAULT, PermissionLevel.L1_DEFAULT)).toBe('plan');
    });

    it('opencode L1 with permissive leader (L2) → build (equidistant L0 vs L2, leader>=2 picks up)', () => {
      expect(getLevelMode('opencode', PermissionLevel.L1_DEFAULT, PermissionLevel.L2_AUTO_EDIT)).toBe('build');
    });

    it('cursor L2 with permissive leader (L2) → agent (equidist L0 vs L3... no, L3 dist=1)', () => {
      // Actually cursor L2: L0 dist=2, L3 dist=1 → not equidistant, strictly closer above
      expect(getLevelMode('cursor', PermissionLevel.L2_AUTO_EDIT, PermissionLevel.L2_AUTO_EDIT)).toBe('agent');
    });

    it('equidistant with no leader defaults to strict (below)', () => {
      // qwen L2 with no leader → default (picks strict side)
      expect(getLevelMode('qwen', PermissionLevel.L2_AUTO_EDIT)).toBe('default');
    });

    it('equidistant with leader L0 → strict', () => {
      expect(getLevelMode('qwen', PermissionLevel.L2_AUTO_EDIT, PermissionLevel.L0_LOCKED)).toBe('default');
    });

    it('equidistant with leader L3 → permissive', () => {
      expect(getLevelMode('qwen', PermissionLevel.L2_AUTO_EDIT, PermissionLevel.L3_FULL_AUTO)).toBe('yolo');
    });
  });

  describe('only one direction available', () => {
    it('gemini L0 → only above available → default (L1)', () => {
      expect(getLevelMode('gemini', PermissionLevel.L0_LOCKED)).toBe('default');
    });

    it('opencode L3 → only below available → build (L2)', () => {
      expect(getLevelMode('opencode', PermissionLevel.L3_FULL_AUTO)).toBe('build');
    });
  });

  describe('unknown/empty backend', () => {
    it('unknown backend returns default', () => {
      expect(getLevelMode('unknownBackend', PermissionLevel.L2_AUTO_EDIT)).toBe('default');
    });

    it('empty string backend returns default', () => {
      expect(getLevelMode('', PermissionLevel.L1_DEFAULT)).toBe('default');
    });
  });
});

// ---------------------------------------------------------------------------
// getMaxAvailableLevel
// ---------------------------------------------------------------------------

describe('getMaxAvailableLevel', () => {
  it('claude → L3', () => {
    expect(getMaxAvailableLevel('claude')).toBe(PermissionLevel.L3_FULL_AUTO);
  });

  it('gemini → L3', () => {
    expect(getMaxAvailableLevel('gemini')).toBe(PermissionLevel.L3_FULL_AUTO);
  });

  it('codex → L3', () => {
    expect(getMaxAvailableLevel('codex')).toBe(PermissionLevel.L3_FULL_AUTO);
  });

  it('qwen → L3', () => {
    expect(getMaxAvailableLevel('qwen')).toBe(PermissionLevel.L3_FULL_AUTO);
  });

  it('iflow → L3', () => {
    expect(getMaxAvailableLevel('iflow')).toBe(PermissionLevel.L3_FULL_AUTO);
  });

  it('aionrs → L3', () => {
    expect(getMaxAvailableLevel('aionrs')).toBe(PermissionLevel.L3_FULL_AUTO);
  });

  it('cursor → L3', () => {
    expect(getMaxAvailableLevel('cursor')).toBe(PermissionLevel.L3_FULL_AUTO);
  });

  it('opencode → L2 (no L3 mode)', () => {
    expect(getMaxAvailableLevel('opencode')).toBe(PermissionLevel.L2_AUTO_EDIT);
  });

  it('codebuddy → L3', () => {
    expect(getMaxAvailableLevel('codebuddy')).toBe(PermissionLevel.L3_FULL_AUTO);
  });

  it('unknown backend → L1', () => {
    expect(getMaxAvailableLevel('noSuchBackend')).toBe(PermissionLevel.L1_DEFAULT);
  });
});

// ---------------------------------------------------------------------------
// mapLeaderModeToMemberMode (end-to-end)
// ---------------------------------------------------------------------------

describe('mapLeaderModeToMemberMode', () => {
  describe('claude leader → various members', () => {
    it('bypassPermissions → gemini yolo (L3 exact)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'bypassPermissions', 'gemini')).toBe('yolo');
    });

    it('acceptEdits → codex autoEdit (L2 exact)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'acceptEdits', 'codex')).toBe('autoEdit');
    });

    it('acceptEdits → qwen yolo (L2 equidistant, leader L2 permissive → up)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'acceptEdits', 'qwen')).toBe('yolo');
    });

    it('default → cursor plan (L1 closest to L0)', () => {
      // cursor: L0(ask) dist=1, L3(agent) dist=2 → closer below → ask
      expect(mapLeaderModeToMemberMode('claude', 'default', 'cursor')).toBe('ask');
    });

    it('bypassPermissions → cursor agent (L3 exact)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'bypassPermissions', 'cursor')).toBe('agent');
    });

    it('bypassPermissions → opencode build (L3 ceiling is L2)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'bypassPermissions', 'opencode')).toBe('build');
    });

    it('dontAsk → gemini yolo (dontAsk=L3 → exact L3)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'dontAsk', 'gemini')).toBe('yolo');
    });

    it('plan → cursor ask (L0 exact)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'plan', 'cursor')).toBe('ask');
    });

    it('default → gemini default (L1 exact)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'default', 'gemini')).toBe('default');
    });

    it('default → codex default (L1 exact)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'default', 'codex')).toBe('default');
    });

    it('default → qwen default (L1 exact)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'default', 'qwen')).toBe('default');
    });

    it('acceptEdits → iflow smart (L2 exact)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'acceptEdits', 'iflow')).toBe('smart');
    });

    it('acceptEdits → aionrs auto_edit (L2 exact)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'acceptEdits', 'aionrs')).toBe('auto_edit');
    });

    it('plan → gemini default (L0, gemini only has L1+, nearest above)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'plan', 'gemini')).toBe('default');
    });

    it('plan → codex default (L0, codex only has L1+, nearest above)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'plan', 'codex')).toBe('default');
    });

    it('plan → qwen default (L0, qwen only has L1+, nearest above)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'plan', 'qwen')).toBe('default');
    });

    it('plan → aionrs default (L0, aionrs only has L1+, nearest above)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'plan', 'aionrs')).toBe('default');
    });

    it('plan → opencode plan (L0 exact)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'plan', 'opencode')).toBe('plan');
    });

    it('plan → iflow plan (L0 exact)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'plan', 'iflow')).toBe('plan');
    });

    it('acceptEdits → opencode build (L2 exact)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'acceptEdits', 'opencode')).toBe('build');
    });

    it('acceptEdits → cursor agent (L2 → cursor L0 dist=2 vs L3 dist=1 → agent)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'acceptEdits', 'cursor')).toBe('agent');
    });
  });

  describe('gemini leader → various members', () => {
    it('yolo → claude bypassPermissions (L3 exact, bypassPermissions is canonical L3)', () => {
      expect(mapLeaderModeToMemberMode('gemini', 'yolo', 'claude')).toBe('bypassPermissions');
    });

    it('default → claude default (L1 exact)', () => {
      expect(mapLeaderModeToMemberMode('gemini', 'default', 'claude')).toBe('default');
    });

    it('autoEdit → claude acceptEdits (L2 exact)', () => {
      expect(mapLeaderModeToMemberMode('gemini', 'autoEdit', 'claude')).toBe('acceptEdits');
    });

    it('yolo → codex yolo (L3 exact)', () => {
      expect(mapLeaderModeToMemberMode('gemini', 'yolo', 'codex')).toBe('yolo');
    });

    it('autoEdit → qwen yolo (L2 equidistant, leader L2 permissive → up)', () => {
      expect(mapLeaderModeToMemberMode('gemini', 'autoEdit', 'qwen')).toBe('yolo');
    });

    it('default → cursor ask (L1 → cursor L0 dist=1 vs L3 dist=2 → closer below)', () => {
      expect(mapLeaderModeToMemberMode('gemini', 'default', 'cursor')).toBe('ask');
    });

    it('default → opencode plan (L1 equidistant L0 vs L2, leader L1 strict → down)', () => {
      expect(mapLeaderModeToMemberMode('gemini', 'default', 'opencode')).toBe('plan');
    });
  });

  describe('cross-backend round trips', () => {
    it('claude bypassPermissions → gemini yolo → back to claude bypassPermissions (canonical L3)', () => {
      const geminiMode = mapLeaderModeToMemberMode('claude', 'bypassPermissions', 'gemini');
      expect(geminiMode).toBe('yolo');
      const backToClaude = mapLeaderModeToMemberMode('gemini', geminiMode, 'claude');
      expect(backToClaude).toBe('bypassPermissions');
    });

    it('claude default → codex → back to claude default', () => {
      const codexMode = mapLeaderModeToMemberMode('claude', 'default', 'codex');
      expect(codexMode).toBe('default');
      const backToClaude = mapLeaderModeToMemberMode('codex', codexMode, 'claude');
      expect(backToClaude).toBe('default');
    });
  });

  describe('edge cases', () => {
    it('unknown leader backend → L1 fallback → member gets L1 equivalent', () => {
      expect(mapLeaderModeToMemberMode('unknownBackend', 'unknownMode', 'gemini')).toBe('default');
    });

    it('known leader → unknown member backend → default', () => {
      expect(mapLeaderModeToMemberMode('claude', 'bypassPermissions', 'unknownBackend')).toBe('default');
    });

    it('same backend mapping (claude → claude)', () => {
      expect(mapLeaderModeToMemberMode('claude', 'acceptEdits', 'claude')).toBe('acceptEdits');
    });

    it('dontAsk maps same as bypassPermissions for all members', () => {
      const backends = ['gemini', 'codex', 'qwen', 'iflow', 'aionrs', 'cursor', 'opencode', 'codebuddy'];
      for (const member of backends) {
        const fromDontAsk = mapLeaderModeToMemberMode('claude', 'dontAsk', member);
        const fromBypass = mapLeaderModeToMemberMode('claude', 'bypassPermissions', member);
        expect(fromDontAsk).toBe(fromBypass);
      }
    });
  });
});
