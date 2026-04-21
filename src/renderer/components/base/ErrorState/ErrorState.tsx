/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Error state component with observability features.
 * Displays error information with copy-stack-trace, retry action, and observability dashboard link.
 */

import React, { useState } from 'react';
import { Button, Card, Typography } from '@arco-design/web-react';
import { Refresh, Link, Copy, CloseOne } from '@icon-park/react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';

const { Paragraph } = Typography;

// ==================== Types ====================

export interface ErrorStateProps {
  /** Error message or error object */
  error: Error | string;
  /** Retry action callback */
  onRetry?: () => void;
  /** Observability dashboard URL (feature-flagged) */
  observabilityUrl?: string;
  /** Whether to show observability link */
  showObservability?: boolean;
  /** Custom class name */
  className?: string;
  /** Custom style */
  style?: React.CSSProperties;
}

// ==================== Component ====================

export function ErrorState({
  error,
  onRetry,
  observabilityUrl,
  showObservability = false,
  className,
  style,
}: ErrorStateProps) {
  const { t } = useTranslation('common');
  const [copied, setCopied] = useState(false);

  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? undefined : error.stack;

  const handleCopyStack = async () => {
    if (errorStack) {
      try {
        await navigator.clipboard.writeText(errorStack);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (_err) {
        // Silently fail if clipboard is not available
      }
    }
  };

  return (
    <div className={classNames('error-state', className)} style={style}>
      <Card className='error-state-card'>
        <div className='error-state-header'>
          <CloseOne className='error-state-icon' theme='filled' fill='#F53F3F' size={48} />
          <h3 className='error-state-title'>{t('errorState.title', { defaultValue: 'Something went wrong' })}</h3>
        </div>

        <Paragraph className='error-state-message'>{errorMessage}</Paragraph>

        {errorStack && (
          <div className='error-state-stack'>
            <div className='error-state-stack-header'>
              <span className='error-state-stack-label'>
                {t('errorState.stackTrace', { defaultValue: 'Stack Trace' })}
              </span>
              <Button type='text' size='small' icon={<Copy />} onClick={handleCopyStack}>
                {copied
                  ? t('errorState.copied', { defaultValue: 'Copied!' })
                  : t('errorState.copy', { defaultValue: 'Copy' })}
              </Button>
            </div>
            <pre className='error-state-stack-content'>{errorStack}</pre>
          </div>
        )}

        <div className='error-state-actions'>
          {onRetry && (
            <Button type='primary' icon={<Refresh />} onClick={onRetry}>
              {t('errorState.retry', { defaultValue: 'Retry' })}
            </Button>
          )}
          {showObservability && observabilityUrl && (
            <Button type='outline' icon={<Link />} onClick={() => window.open(observabilityUrl, '_blank')}>
              {t('errorState.observability', { defaultValue: 'View in Observability' })}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

export default ErrorState;
