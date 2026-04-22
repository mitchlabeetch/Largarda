/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Template Renderer Types
 *
 * A renderer is a pure function that transforms template variables into
 * structured markdown content. Renderers are used by the `ChecklistGenerator`
 * and `DocumentGenerator` to produce deterministic, well-structured output
 * without requiring a live Flowise call.
 *
 * Each renderer is registered in `RENDERER_MAP` keyed by `TemplateKey`.
 */

import type { TemplateKey } from '../types';

/**
 * A renderer function takes a variables map and returns markdown content.
 * Renderers must be pure: no side effects, no network calls.
 */
export type RendererFn = (variables: Record<string, unknown>) => string;

/**
 * Registry mapping template keys to their local renderers.
 * Only templates that support local rendering need an entry;
 * others fall through to the Flowise flow path.
 */
export type RendererMap = Readonly<Partial<Record<TemplateKey, RendererFn>>>;
