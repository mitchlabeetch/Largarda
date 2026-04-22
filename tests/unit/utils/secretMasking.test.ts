/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { redactSecrets, redactSecretsFromObject, safeStringify } from '@/common/utils/secretMasking';

describe('secretMasking', () => {
  describe('redactSecrets', () => {
    it('should mask API keys in strings', () => {
      const input = 'api_key=sk-1234567890abcdef1234567890abcdef';
      const result = redactSecrets(input);
      expect(result).toContain('sk-');
      expect(result).toContain('****');
      expect(result).not.toContain('sk-1234567890abcdef1234567890abcdef');
    });

    it('should mask bearer tokens', () => {
      const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
      const result = redactSecrets(input);
      expect(result).toContain('eyJ');
      expect(result).toContain('****');
      expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test');
    });

    it('should mask AWS access keys', () => {
      const input = 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE';
      const result = redactSecrets(input);
      expect(result).toContain('AKIA');
      expect(result).toContain('****');
      expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE');
    });

    it('should mask passwords', () => {
      const input = 'password=mySecretPassword123';
      const result = redactSecrets(input);
      expect(result).toContain('mySe');
      expect(result).toContain('****');
      expect(result).toContain('d123');
      expect(result).not.toContain('mySecretPassword123');
    });

    it('should handle strings without secrets', () => {
      const input = 'This is a normal string without secrets';
      const result = redactSecrets(input);
      expect(result).toBe(input);
    });

    it('should handle empty strings', () => {
      const result = redactSecrets('');
      expect(result).toBe('');
    });
  });

  describe('redactSecretsFromObject', () => {
    it('should mask secrets in nested objects', () => {
      const input = {
        apiKey: 'sk-1234567890abcdef',
        config: {
          secret: 'mySecretPassword',
        },
      };
      const result = redactSecretsFromObject(input);
      expect(result.apiKey).toContain('****');
      expect(result.config.secret).toContain('****');
    });

    it('should mask secrets in arrays', () => {
      const input = [{ apiKey: 'sk-1234567890abcdef' }, { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' }];
      const result = redactSecretsFromObject(input);
      expect(result[0].apiKey).toContain('****');
      expect(result[1].token).toContain('****');
    });

    it('should mask sensitive key names', () => {
      const input = {
        normalKey: 'value',
        secret_key: 'sensitive',
        api_key: 'key123',
        password: 'pass123',
      };
      const result = redactSecretsFromObject(input);
      expect(result.normalKey).toBe('value');
      expect(result.secret_key).toContain('****');
      expect(result.api_key).toContain('****');
      expect(result.password).toContain('****');
    });

    it('should handle primitive values', () => {
      expect(redactSecretsFromObject('string')).toBe('string');
      expect(redactSecretsFromObject(123)).toBe(123);
      expect(redactSecretsFromObject(true)).toBe(true);
      expect(redactSecretsFromObject(null)).toBe(null);
    });
  });

  describe('safeStringify', () => {
    it('should stringify objects with secrets redacted', () => {
      const input = { apiKey: 'sk-1234567890abcdef', name: 'test' };
      const result = safeStringify(input);
      expect(result).toContain('****');
      expect(result).not.toContain('sk-1234567890abcdef');
      expect(result).toContain('test');
    });

    it('should handle circular references gracefully', () => {
      const input: Record<string, unknown> = { name: 'test' };
      input.self = input;
      const result = safeStringify(input);
      expect(result).toBe('[Unable to stringify object]');
    });

    it('should handle objects that throw on stringify', () => {
      const input = {
        toJSON: () => {
          throw new Error('Cannot serialize');
        },
      };
      const result = safeStringify(input);
      expect(result).toBe('[Unable to stringify object]');
    });
  });
});
