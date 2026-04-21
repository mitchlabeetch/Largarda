/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Outlet } from 'react-router-dom';

vi.mock('@renderer/hooks/context/AuthContext', () => ({
  useAuth: () => ({ status: 'authenticated' }),
}));

vi.mock('@renderer/components/layout/AppLoader', () => ({
  default: () => <div>Loading...</div>,
}));

vi.mock('@renderer/pages/ma/MaLanding', () => ({
  default: () => <div>M&A Landing Mock</div>,
}));

vi.mock('@renderer/pages/ma/DealContext', () => ({
  default: () => <div>Deal Context Mock</div>,
}));

vi.mock('@renderer/pages/ma/DueDiligence', () => ({
  default: () => <div>Due Diligence Mock</div>,
}));

import PanelRoute from '@renderer/components/layout/Router';

function TestLayout() {
  return (
    <div data-testid='test-layout'>
      <Outlet />
    </div>
  );
}

function renderAt(hash: string) {
  window.location.hash = hash;
  return render(<PanelRoute layout={<TestLayout />} />);
}

describe('M&A route smoke tests', () => {
  afterEach(() => {
    cleanup();
    window.location.hash = '';
  });

  it('renders the M&A landing route', async () => {
    renderAt('#/ma');
    expect(await screen.findByText('M&A Landing Mock')).toBeInTheDocument();
  });

  it('renders the deal-context route', async () => {
    renderAt('#/ma/deal-context');
    expect(await screen.findByText('Deal Context Mock')).toBeInTheDocument();
  });

  it('renders the due-diligence route', async () => {
    renderAt('#/ma/due-diligence');
    expect(await screen.findByText('Due Diligence Mock')).toBeInTheDocument();
  });
});
