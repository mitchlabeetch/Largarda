/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Skeleton loading component with variants for line, circle, and card.
 * Supports reduced motion preference for accessibility.
 */

import React from 'react';
import classNames from 'classnames';

// ==================== Types ====================

export type SkeletonVariant = 'line' | 'circle' | 'card';

export interface SkeletonProps {
  /** Variant type */
  variant?: SkeletonVariant;
  /** Width of the skeleton */
  width?: string | number;
  /** Height of the skeleton */
  height?: string | number;
  /** Number of lines to render (for line variant) */
  lines?: number;
  /** Custom class name */
  className?: string;
  /** Custom style */
  style?: React.CSSProperties;
}

// ==================== Component ====================

export function Skeleton({ variant = 'line', width, height, lines = 1, className, style }: SkeletonProps) {
  const skeletonClass = classNames('skeleton', `skeleton-${variant}`, className);

  const baseStyle: React.CSSProperties = {
    ...style,
  };

  if (width !== undefined) {
    baseStyle.width = typeof width === 'number' ? `${width}px` : width;
  }

  if (height !== undefined) {
    baseStyle.height = typeof height === 'number' ? `${height}px` : height;
  }

  // For line variant with multiple lines
  if (variant === 'line' && lines > 1) {
    return (
      <div className={classNames('skeleton-line-group', className)} style={style}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={skeletonClass}
            style={{
              ...baseStyle,
              // Last line should be shorter
              width: index === lines - 1 ? '60%' : width,
            }}
          />
        ))}
      </div>
    );
  }

  return <div className={skeletonClass} style={baseStyle} />;
}

export default Skeleton;
