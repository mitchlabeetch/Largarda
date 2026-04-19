/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Flowise Agent Module
 * Exports for Flowise backend integration.
 */

export { FloWiseConnection, FloWiseError, createFloWiseConnection } from './FloWiseConnection';
export type { FlowiseConfig, FlowInput, FlowResult, FlowEvent, FlowMeta, FlowDetail } from './FloWiseConnection';

export {
  FloWiseAgentManager,
  createFloWiseAgentManager,
  type FloWiseAgentManagerData,
  type FloWiseConfirmationOption,
  type FloWiseAgentType,
} from './FloWiseAgentManager';
