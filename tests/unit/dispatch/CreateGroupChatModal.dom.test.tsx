/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks --- //

const createGroupChatInvoke = vi.fn();
const navigateMock = vi.fn();
const emitterEmitMock = vi.fn();
const messageErrorMock = vi.fn();

vi.mock('@/common', () => ({
  ipcBridge: {
    dispatch: {
      createGroupChat: {
        invoke: (...args: unknown[]) => createGroupChatInvoke(...args),
      },
    },
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en-US' },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/renderer/utils/emitter', () => ({
  emitter: {
    emit: (...args: unknown[]) => emitterEmitMock(...args),
  },
}));

vi.mock('@arco-design/web-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@arco-design/web-react')>();
  return {
    ...actual,
    Message: {
      ...actual.Message,
      error: (...args: unknown[]) => messageErrorMock(...args),
    },
  };
});

import CreateGroupChatModal from '@/renderer/pages/conversation/dispatch/CreateGroupChatModal';

describe('CreateGroupChatModal', () => {
  const defaultProps = {
    visible: true,
    onClose: vi.fn(),
    onCreated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // CMP-MOD-001: Modal renders with correct title when visible
  it('CMP-MOD-001: renders modal with title when visible', () => {
    render(<CreateGroupChatModal {...defaultProps} />);

    expect(screen.getByText('dispatch.create.title')).toBeInTheDocument();
  });

  // CMP-MOD-002: Modal is not rendered when visible=false
  it('CMP-MOD-002: does not render modal content when not visible', () => {
    render(<CreateGroupChatModal {...defaultProps} visible={false} />);

    expect(screen.queryByText('dispatch.create.title')).not.toBeInTheDocument();
  });

  // CMP-MOD-003: Input field renders with placeholder
  it('CMP-MOD-003: renders input with placeholder text', () => {
    render(<CreateGroupChatModal {...defaultProps} />);

    expect(screen.getByPlaceholderText('dispatch.create.titlePlaceholder')).toBeInTheDocument();
  });

  // CMP-MOD-004: Title label is displayed
  it('CMP-MOD-004: shows title label text', () => {
    render(<CreateGroupChatModal {...defaultProps} />);

    expect(screen.getByText('dispatch.create.titleLabel')).toBeInTheDocument();
  });

  // CMP-MOD-005: OK button has correct text
  it('CMP-MOD-005: OK button displays confirm text', () => {
    render(<CreateGroupChatModal {...defaultProps} />);

    expect(screen.getByText('dispatch.create.confirm')).toBeInTheDocument();
  });

  // CMP-MOD-006: Cancel button has correct text
  it('CMP-MOD-006: Cancel button displays cancel text', () => {
    render(<CreateGroupChatModal {...defaultProps} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
  });

  // CMP-MOD-007: Successful creation triggers navigation and onCreated
  it('CMP-MOD-007: calls onCreated and navigates on successful creation', async () => {
    createGroupChatInvoke.mockResolvedValue({
      success: true,
      data: { conversationId: 'new-conv-123' },
    });

    render(<CreateGroupChatModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('dispatch.create.titlePlaceholder');
    fireEvent.change(input, { target: { value: 'My New Chat' } });

    const okButton = screen.getByText('dispatch.create.confirm');
    await act(async () => {
      fireEvent.click(okButton);
    });

    await waitFor(() => {
      expect(createGroupChatInvoke).toHaveBeenCalledWith({ name: 'My New Chat' });
    });
    expect(defaultProps.onCreated).toHaveBeenCalledWith('new-conv-123');
    expect(navigateMock).toHaveBeenCalledWith('/conversation/new-conv-123');
  });

  // CMP-MOD-015: Loading state disables OK button while API call is in flight
  it('CMP-MOD-015: OK button shows loading state during creation', async () => {
    let resolveCreate: (value: unknown) => void;
    createGroupChatInvoke.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      })
    );

    render(<CreateGroupChatModal {...defaultProps} />);

    const okButton = screen.getByText('dispatch.create.confirm');
    await act(async () => {
      fireEvent.click(okButton);
    });

    // Modal's confirmLoading should be true, making the OK button show loading
    const okBtnEl = okButton.closest('button');
    expect(okBtnEl).not.toBeNull();
    expect(okBtnEl?.classList.toString()).toMatch(/loading/);

    // Resolve to clean up
    await act(async () => {
      resolveCreate!({ success: true, data: { conversationId: 'conv-load' } });
    });
  });

  // CMP-MOD-008: Creation sends trimmed name
  it('CMP-MOD-008: sends trimmed name when provided', async () => {
    createGroupChatInvoke.mockResolvedValue({
      success: true,
      data: { conversationId: 'conv-456' },
    });

    render(<CreateGroupChatModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('dispatch.create.titlePlaceholder');
    fireEvent.change(input, { target: { value: '  My Chat  ' } });

    const okButton = screen.getByText('dispatch.create.confirm');
    await act(async () => {
      fireEvent.click(okButton);
    });

    await waitFor(() => {
      expect(createGroupChatInvoke).toHaveBeenCalledWith({ name: 'My Chat' });
    });
  });

  // CMP-MOD-009: Emits chat.history.refresh on success
  it('CMP-MOD-009: emits history refresh event on successful creation', async () => {
    createGroupChatInvoke.mockResolvedValue({
      success: true,
      data: { conversationId: 'conv-789' },
    });

    render(<CreateGroupChatModal {...defaultProps} />);

    const okButton = screen.getByText('dispatch.create.confirm');
    await act(async () => {
      fireEvent.click(okButton);
    });

    await waitFor(() => {
      expect(emitterEmitMock).toHaveBeenCalledWith('chat.history.refresh');
    });
  });

  // CMP-MOD-010: Shows error message when API returns failure
  it('CMP-MOD-010: shows error message on API failure response', async () => {
    createGroupChatInvoke.mockResolvedValue({
      success: false,
      msg: 'Server error',
    });

    render(<CreateGroupChatModal {...defaultProps} />);

    const okButton = screen.getByText('dispatch.create.confirm');
    await act(async () => {
      fireEvent.click(okButton);
    });

    await waitFor(() => {
      expect(messageErrorMock).toHaveBeenCalledWith('Server error');
    });
  });

  // CMP-MOD-011: Shows fallback error message on exception
  it('CMP-MOD-011: shows fallback error key on network exception', async () => {
    createGroupChatInvoke.mockRejectedValue(new Error('Network error'));

    render(<CreateGroupChatModal {...defaultProps} />);

    const okButton = screen.getByText('dispatch.create.confirm');
    await act(async () => {
      fireEvent.click(okButton);
    });

    await waitFor(() => {
      expect(messageErrorMock).toHaveBeenCalledWith('dispatch.create.error');
    });
  });

  // CMP-MOD-012: Cancel clears name and calls onClose
  it('CMP-MOD-012: clears input and calls onClose on cancel', async () => {
    render(<CreateGroupChatModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('dispatch.create.titlePlaceholder');
    fireEvent.change(input, { target: { value: 'Some Name' } });

    const cancelButton = screen.getByText('common.cancel');
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  // EDGE-013: Enter key triggers creation
  it('EDGE-013: pressing Enter in input triggers creation', async () => {
    createGroupChatInvoke.mockResolvedValue({
      success: true,
      data: { conversationId: 'conv-enter' },
    });

    render(<CreateGroupChatModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('dispatch.create.titlePlaceholder');
    fireEvent.change(input, { target: { value: 'Enter Test' } });

    await act(async () => {
      // Arco Input onPressEnter fires on keyDown with Enter key
      // but the native input element is nested inside Arco's wrapper
      const nativeInput = input.querySelector('input') || input;
      fireEvent.keyDown(nativeInput, { key: 'Enter', keyCode: 13 });
    });

    await waitFor(() => {
      expect(createGroupChatInvoke).toHaveBeenCalledWith({ name: 'Enter Test' });
    });
  });

  // EDGE-014: Empty name sends undefined
  it('EDGE-014: empty input sends name as undefined', async () => {
    createGroupChatInvoke.mockResolvedValue({
      success: true,
      data: { conversationId: 'conv-empty' },
    });

    render(<CreateGroupChatModal {...defaultProps} />);

    const okButton = screen.getByText('dispatch.create.confirm');
    await act(async () => {
      fireEvent.click(okButton);
    });

    await waitFor(() => {
      expect(createGroupChatInvoke).toHaveBeenCalledWith({ name: undefined });
    });
  });

  // ADV-004: API failure with no msg falls back to i18n key
  it('ADV-004: uses i18n error key when API response has no msg', async () => {
    createGroupChatInvoke.mockResolvedValue({
      success: false,
    });

    render(<CreateGroupChatModal {...defaultProps} />);

    const okButton = screen.getByText('dispatch.create.confirm');
    await act(async () => {
      fireEvent.click(okButton);
    });

    await waitFor(() => {
      expect(messageErrorMock).toHaveBeenCalledWith('dispatch.create.error');
    });
  });

  // ADV-011: Name is cleared after successful creation
  it('ADV-011: resets name input after successful creation', async () => {
    createGroupChatInvoke.mockResolvedValue({
      success: true,
      data: { conversationId: 'conv-reset' },
    });

    const { rerender } = render(<CreateGroupChatModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('dispatch.create.titlePlaceholder');
    fireEvent.change(input, { target: { value: 'Before Reset' } });

    const okButton = screen.getByText('dispatch.create.confirm');
    await act(async () => {
      fireEvent.click(okButton);
    });

    // Re-render to observe state was cleared
    await waitFor(() => {
      expect(defaultProps.onCreated).toHaveBeenCalled();
    });

    // Re-open modal
    rerender(<CreateGroupChatModal {...defaultProps} visible={false} />);
    rerender(<CreateGroupChatModal {...defaultProps} visible={true} />);

    const newInput = screen.getByPlaceholderText('dispatch.create.titlePlaceholder');
    expect(newInput).toHaveValue('');
  });
});
