/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      (
        ({
          'dealContext.title': 'Deal Management',
          'dealContext.empty.selectDealText': 'Choose a deal from the list to view details',
          'dueDiligence.title': 'Due Diligence',
          'dueDiligence.empty.selectDeal': 'Select a deal to begin analysis',
        }) as Record<string, string>
      )[key] ?? key,
  }),
}));

import { MaLandingPage } from '@renderer/pages/ma/MaLanding';

describe('MaLandingPage', () => {
  it('renders keyboard-accessible navigation buttons for the M&A entry points', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/ma']}>
        <Routes>
          <Route path='/ma' element={<MaLandingPage />} />
          <Route path='/ma/deal-context' element={<div>Deal Context Destination</div>} />
          <Route path='/ma/due-diligence' element={<div>Due Diligence Destination</div>} />
        </Routes>
      </MemoryRouter>
    );

    const dealContextButton = screen.getByRole('button', { name: 'Deal Management' });
    const dueDiligenceButton = screen.getByRole('button', { name: 'Due Diligence' });

    expect(dealContextButton).toBeInTheDocument();
    expect(dueDiligenceButton).toBeInTheDocument();

    await user.click(dealContextButton);
    expect(await screen.findByText('Deal Context Destination')).toBeInTheDocument();
  });
});
