/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

export type { RendererMap } from './types';
export type { RendererFn } from './types';

export { renderNda } from './ndaRenderer';
export { renderLoi } from './loiRenderer';
export { renderDdChecklist } from './ddChecklistRenderer';

import type { RendererMap, RendererFn } from './types';
import { renderNda } from './ndaRenderer';
import { renderLoi } from './loiRenderer';
import { renderDdChecklist } from './ddChecklistRenderer';

/**
 * Registry of local renderers keyed by `TemplateKey`.
 * Only templates with a deterministic local renderer are listed;
 * others fall through to the Flowise flow path in `DocumentGenerator`.
 */
export const RENDERER_MAP: RendererMap = {
  'tpl.nda': renderNda,
  'tpl.loi': renderLoi,
  'tpl.dd': renderDdChecklist,
};

/**
 * Resolve a renderer for a template key.
 * Returns `undefined` if no local renderer exists (caller should
 * fall through to Flowise).
 */
export function resolveRenderer(key: string): RendererFn | undefined {
  return RENDERER_MAP[key as keyof RendererMap];
}
