/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared constants for M&A deal surfaces
 * Contains transaction types, party roles, and status mappings
 */

import type { TransactionType, DealStatus, DealParty } from '@/common/ma/types';

/**
 * Transaction type options for deal form
 */
export const TRANSACTION_TYPES: Array<{ value: TransactionType; label: string }> = [
  { value: 'acquisition', label: 'ma.dealForm.transactionTypes.acquisition' },
  { value: 'merger', label: 'ma.dealForm.transactionTypes.merger' },
  { value: 'divestiture', label: 'ma.dealForm.transactionTypes.divestiture' },
  { value: 'joint_venture', label: 'ma.dealForm.transactionTypes.jointVenture' },
];

/**
 * Party role options for deal form
 */
export const PARTY_ROLES: Array<{ value: DealParty['role']; label: string }> = [
  { value: 'buyer', label: 'ma.dealForm.partyRoles.buyer' },
  { value: 'seller', label: 'ma.dealForm.partyRoles.seller' },
  { value: 'target', label: 'ma.dealForm.partyRoles.target' },
  { value: 'advisor', label: 'ma.dealForm.partyRoles.advisor' },
];

/**
 * Deal status mapping for display
 */
export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  active: 'ma.dealSelector.status.active',
  archived: 'ma.dealSelector.status.archived',
  closed: 'ma.dealSelector.status.closed',
};
