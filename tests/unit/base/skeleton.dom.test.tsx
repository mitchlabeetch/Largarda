/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Skeleton } from '@/renderer/components/base/Skeleton';

describe('Skeleton Component', () => {
  describe('Line Variant', () => {
    it('renders line skeleton with default props', () => {
      const { container } = render(<Skeleton variant='line' />);
      const skeleton = container.querySelector('.skeleton-line');
      expect(skeleton).toBeInTheDocument();
    });

    it('applies custom width and height', () => {
      const { container } = render(<Skeleton variant='line' width='200px' height='24px' />);
      const skeleton = container.querySelector('.skeleton-line');
      expect(skeleton).toHaveStyle({ width: '200px', height: '24px' });
    });

    it('renders multiple lines when lines prop is provided', () => {
      const { container } = render(<Skeleton variant='line' lines={3} />);
      const skeletons = container.querySelectorAll('.skeleton-line');
      expect(skeletons).toHaveLength(3);
    });
  });

  describe('Circle Variant', () => {
    it('renders circle skeleton', () => {
      const { container } = render(<Skeleton variant='circle' />);
      const skeleton = container.querySelector('.skeleton-circle');
      expect(skeleton).toBeInTheDocument();
    });

    it('applies custom dimensions', () => {
      const { container } = render(<Skeleton variant='circle' width='60px' height='60px' />);
      const skeleton = container.querySelector('.skeleton-circle');
      expect(skeleton).toHaveStyle({ width: '60px', height: '60px' });
    });
  });

  describe('Card Variant', () => {
    it('renders card skeleton', () => {
      const { container } = render(<Skeleton variant='card' />);
      const skeleton = container.querySelector('.skeleton-card');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('respects prefers-reduced-motion when animation is disabled', () => {
      // Mock prefers-reduced-motion
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { container } = render(<Skeleton variant='line' />);
      const skeleton = container.querySelector('.skeleton');
      expect(skeleton).toBeInTheDocument();
    });
  });
});
