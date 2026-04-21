/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Empty state component with i18n support.
 * Displays a consistent empty state with icon, title, description, and optional actions.
 */

import React from 'react';
import { Button } from '@arco-design/web-react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';

// ==================== Types ====================

export interface EmptyStateAction {
  /** Button label (i18n key or string) */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Button type */
  type?: 'primary' | 'default' | 'dashed' | 'text' | 'outline';
  /** Button icon */
  icon?: React.ReactNode;
}

export interface EmptyStateProps {
  /** Icon to display */
  icon?: React.ReactNode;
  /** Title i18n key or string */
  title: string;
  /** Description i18n key or string */
  description?: string;
  /** Primary action button */
  primaryAction?: EmptyStateAction;
  /** Secondary action button */
  secondaryAction?: EmptyStateAction;
  /** i18n namespace */
  i18nNs?: string;
  /** Custom class name */
  className?: string;
  /** Custom style */
  style?: React.CSSProperties;
}

// ==================== Component ====================

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  i18nNs = 'common',
  className,
  style,
}: EmptyStateProps) {
  const { t } = useTranslation(i18nNs);

  const titleText = t(title, { defaultValue: title });
  const descriptionText = description ? t(description, { defaultValue: description }) : undefined;

  return (
    <div className={classNames('empty-state', className)} style={style}>
      {icon && <div className='empty-state-icon'>{icon}</div>}
      <h3 className='empty-state-title'>{titleText}</h3>
      {descriptionText && <p className='empty-state-description'>{descriptionText}</p>}
      <div className='empty-state-actions'>
        {primaryAction && (
          <Button type={primaryAction.type || 'primary'} onClick={primaryAction.onClick} icon={primaryAction.icon}>
            {t(primaryAction.label, { defaultValue: primaryAction.label })}
          </Button>
        )}
        {secondaryAction && (
          <Button
            type={secondaryAction.type || 'default'}
            onClick={secondaryAction.onClick}
            icon={secondaryAction.icon}
          >
            {t(secondaryAction.label, { defaultValue: secondaryAction.label })}
          </Button>
        )}
      </div>
    </div>
  );
}

export default EmptyState;
