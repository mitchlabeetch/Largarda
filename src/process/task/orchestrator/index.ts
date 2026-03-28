/**
 * Multi-Agent Orchestrator — public barrel export.
 *
 * Re-exports all public classes and types for consumers outside this module.
 * ResultCollector and Orchestrator are implemented by a separate agent;
 * their exports are pre-declared here so import paths stay stable.
 */
export { StateManager } from './StateManager';
export { SubTaskSession } from './SubTaskSession';
export { ResultCollector } from './ResultCollector';
export { Orchestrator } from './Orchestrator';
export type {
  SubTask,
  SubTaskState,
  SubTaskStatus,
  SubTaskResult,
  OrchestratorState,
  OrchestratorEvent,
} from './types';
export type { AgentManagerFactory } from './SubTaskSession';
