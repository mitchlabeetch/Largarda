/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { type Express, type Request, type Response } from 'express';
import { getIntegrationService } from '@process/services/ma/IntegrationService';

const NANGO_WEBHOOK_PATH = '/api/ma/integrations/nango/webhook';

function getRawBody(body: unknown): string {
  if (Buffer.isBuffer(body)) {
    return body.toString('utf8');
  }

  if (typeof body === 'string') {
    return body;
  }

  return JSON.stringify(body ?? {});
}

const rawJsonMiddleware =
  typeof express.raw === 'function'
    ? express.raw({ type: 'application/json', limit: '1mb' })
    : (_req: Request, _res: Response, next: () => void) => next();

export function registerNangoRoutes(app: Express): void {
  if (typeof app.post !== 'function') {
    return;
  }

  app.post(NANGO_WEBHOOK_PATH, rawJsonMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
      const rawBody = getRawBody(req.body);
      await getIntegrationService().handleWebhook(rawBody, req.headers as Record<string, unknown>);
      res.status(200).json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process Nango webhook';
      console.error('[nangoRoutes] webhook error:', error);
      res.status(400).json({ success: false, message });
    }
  });
}
