import { ipcBridge } from '@/common';
import type { TeamAgent } from '@/common/types/teamTypes';
import { getModeLevel, mapLeaderModeToMemberMode } from '@/common/types/agentPermissionLevel';
import React, { createContext, useCallback, useContext, useMemo } from 'react';

type TeamPermissionContextValue = {
  /** Whether we are in team mode */
  isTeamMode: true;
  /** Whether the current active agent is the team lead */
  isLeadAgent: boolean;
  /** Conversation ID of the lead agent (used to identify lead slot) */
  leadConversationId: string;
  /** All agent conversation IDs in this team (for centralized confirmation listening) */
  allConversationIds: string[];
  /** Propagate a permission mode change from the leader to all member agents */
  propagateMode: (mode: string) => void;
};

const TeamPermissionContext = createContext<TeamPermissionContextValue | null>(null);

export const TeamPermissionProvider: React.FC<{
  children: React.ReactNode;
  teamId: string;
  isLeadAgent: boolean;
  leadConversationId: string;
  allConversationIds: string[];
  /** All agents in the team, used to map leader mode to per-member backend mode */
  agents: TeamAgent[];
  /** Backend of the team leader (e.g. 'claude', 'gemini') */
  leaderBackend: string;
}> = ({ children, teamId, isLeadAgent, leadConversationId, allConversationIds, agents, leaderBackend }) => {
  const propagateMode = useCallback(
    (mode: string) => {
      // 1. Persist sessionMode on the team record so newly spawned agents inherit it.
      //    This is the source of truth for addAgent() — it reads team.sessionMode first.
      void ipcBridge.team.setSessionMode.invoke({ teamId, sessionMode: mode }).catch(() => {
        // Best-effort: team DB write failure is non-fatal
      });

      // 2. For each member agent: write the mapped mode into conversation extra (DB layer)
      //    so that the member picks it up correctly when woken, regardless of whether the
      //    runtime setMode call below succeeds.
      //    Also write teamLeaderLevel so Manager-layer fallback can auto-approve when member
      //    backend ceiling is below leader's required level (e.g. cursor/opencode max at L1).
      const leaderLevel = getModeLevel(leaderBackend, mode);
      for (const agent of agents) {
        if (!agent.conversationId) continue;
        const memberMode = mapLeaderModeToMemberMode(leaderBackend, mode, agent.agentType);
        // Merge sessionMode + teamLeaderLevel into conversation extra — does not depend on an active session.
        void ipcBridge.conversation.update
          .invoke({
            id: agent.conversationId,
            updates: { extra: { sessionMode: memberMode, teamLeaderLevel: leaderLevel } } as any,
            mergeExtra: true,
          })
          .catch(() => {
            // Best-effort: DB write failure is non-fatal; runtime setMode below is a second chance
          });

        // 3. If the agent has an active session, also update it at runtime so the running CLI
        //    process reflects the new mode immediately (no restart required).
        void ipcBridge.acpConversation.setMode
          .invoke({ conversationId: agent.conversationId, mode: memberMode })
          .catch(() => {
            // Silently ignore: agent may be idle / not yet initialised — DB write above is the fallback
          });
      }
    },
    [teamId, agents, leaderBackend]
  );

  const value = useMemo<TeamPermissionContextValue>(
    () => ({
      isTeamMode: true,
      isLeadAgent,
      leadConversationId,
      allConversationIds,
      propagateMode,
    }),
    [isLeadAgent, leadConversationId, allConversationIds, propagateMode]
  );

  return <TeamPermissionContext.Provider value={value}>{children}</TeamPermissionContext.Provider>;
};

/**
 * Returns team permission context if inside a team, or null for standalone conversations.
 * This ensures all team-only logic is gated behind a null check — no impact on single agent mode.
 */
export const useTeamPermission = (): TeamPermissionContextValue | null => {
  return useContext(TeamPermissionContext);
};
