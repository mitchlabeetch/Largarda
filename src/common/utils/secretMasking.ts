/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Secret masking utilities for production-safe logging.
 * Prevents API keys, tokens, and other sensitive data from appearing in logs.
 */

/**
 * Patterns for detecting secrets in strings.
 * Each pattern includes a regex and a description for debugging.
 */
const SECRET_PATTERNS = [
  {
    name: 'API Key',
    regex: /(?:api[_-]?key|apikey|secret[_-]?key|secretkey)["']?\s*[:=]\s*["']?([a-zA-Z0-9\-_]{8,})["']?/gi,
  },
  {
    name: 'Bearer Token',
    regex: /bearer\s+([a-zA-Z0-9\-_.]{10,})/gi,
  },
  {
    name: 'JWT Token',
    regex: /eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/g,
  },
  {
    name: 'AWS Access Key',
    regex: /(AKIA[0-9A-Z]{16})/g,
  },
  {
    name: 'AWS Secret Key',
    regex: /aws[_-]?secret[_-]?access[_-]?key["']?\s*[:=]\s*["']?([a-zA-Z0-9/+]{20,})["']?/gi,
  },
  {
    name: 'Generic Secret',
    regex: /(?:password|passwd|pwd|token|auth)["']?\s*[:=]\s*["']?([^"'\s]{4,})["']?/gi,
  },
];

/**
 * Mask a detected secret value.
 * Shows first 4 and last 4 characters for debugging, masks the middle.
 */
function maskSecret(value: string): string {
  if (value.length <= 8) {
    return '****';
  }
  const start = value.substring(0, 4);
  const end = value.substring(value.length - 4);
  const maskedLength = Math.max(8, value.length - 8);
  return `${start}${'*'.repeat(maskedLength)}${end}`;
}

/**
 * Redact secrets from a string using known patterns.
 * Returns the string with secrets masked.
 */
export function redactSecrets(input: string): string {
  let result = input;

  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern.regex, (match, captured) => {
      if (captured && typeof captured === 'string' && captured.length > 8) {
        return match.replace(captured, maskSecret(captured));
      }
      return match;
    });
  }

  return result;
}

/**
 * Redact secrets from an object recursively.
 * Handles strings, nested objects, and arrays.
 */
export function redactSecretsFromObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return redactSecrets(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSecretsFromObject) as T;
  }

  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check if key name suggests sensitive data
      const sensitiveKey = /api[_-]?key|apikey|secret|token|password|auth/i.test(key);
      if (sensitiveKey && typeof value === 'string') {
        result[key] = maskSecret(value);
      } else {
        result[key] = redactSecretsFromObject(value);
      }
    }
    return result as T;
  }

  return obj;
}

/**
 * Safe JSON.stringify with secret redaction.
 * Use this for all logging of objects that may contain secrets.
 */
export function safeStringify(obj: unknown, space?: string | number): string {
  try {
    const redacted = redactSecretsFromObject(obj);
    return JSON.stringify(redacted, null, space);
  } catch {
    return '[Unable to stringify object]';
  }
}
