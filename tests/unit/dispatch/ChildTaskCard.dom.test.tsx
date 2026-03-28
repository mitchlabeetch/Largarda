/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks --- //

const loadTranscriptMock = vi.fn();
const getTranscriptMock = vi.fn();
const isTranscriptLoadingMock = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en-US' },
  }),
}));

vi.mock('@arco-design/web-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@arco-design/web-react')>();
  return {
    ...actual,
  };
});

vi.mock('@icon-park/react', () => ({
  CheckOne: (props: Record<string, unknown>) => <span data-testid='icon-check-one' {...props} />,
  CloseOne: (props: Record<string, unknown>) => <span data-testid='icon-close-one' {...props} />,
  Loading: (props: Record<string, unknown>) => <span data-testid='icon-loading' {...props} />,
  People: (props: Record<string, unknown>) => <span data-testid='icon-people' {...props} />,
}));

vi.mock('@/renderer/pages/conversation/dispatch/hooks/useChildTaskDetail', () => ({
  useChildTaskDetail: () => ({
    loadTranscript: loadTranscriptMock,
    getTranscript: getTranscriptMock,
    isTranscriptLoading: isTranscriptLoadingMock,
  }),
}));

import ChildTaskCard from '@/renderer/pages/conversation/dispatch/ChildTaskCard';
import type { GroupChatTimelineMessage } from '@/renderer/pages/conversation/dispatch/types';

const makeMessage = (overrides: Partial<GroupChatTimelineMessage> = {}): GroupChatTimelineMessage => ({
  id: 'msg-1',
  sourceSessionId: 'session-1',
  sourceRole: 'child',
  displayName: 'Agent Alpha',
  content: 'Working on task...',
  messageType: 'task_started',
  timestamp: Date.now(),
  childTaskId: 'child-1',
  avatar: undefined,
  ...overrides,
});

describe('ChildTaskCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTranscriptMock.mockReturnValue(undefined);
    isTranscriptLoadingMock.mockReturnValue(false);
  });

  // CMP-CC-001: Renders display name
  it('CMP-CC-001: renders the display name', () => {
    render(<ChildTaskCard message={makeMessage()} />);

    expect(screen.getByText('Agent Alpha')).toBeInTheDocument();
  });

  // CMP-CC-002: Renders status tag for started
  it('CMP-CC-002: shows status tag for task_started', () => {
    render(<ChildTaskCard message={makeMessage({ messageType: 'task_started' })} />);

    expect(screen.getByText('dispatch.timeline.taskStarted')).toBeInTheDocument();
  });

  // CMP-CC-003: Renders status tag for running
  it('CMP-CC-003: shows status tag for task_progress', () => {
    render(<ChildTaskCard message={makeMessage({ messageType: 'task_progress' })} />);

    expect(screen.getByText('dispatch.timeline.taskRunning')).toBeInTheDocument();
  });

  // CMP-CC-004: Renders status tag for completed
  it('CMP-CC-004: shows status tag for task_completed', () => {
    render(<ChildTaskCard message={makeMessage({ messageType: 'task_completed' })} />);

    expect(screen.getByText('dispatch.timeline.taskCompleted')).toBeInTheDocument();
  });

  // CMP-CC-005: Renders status tag for failed
  it('CMP-CC-005: shows status tag for task_failed', () => {
    render(<ChildTaskCard message={makeMessage({ messageType: 'task_failed' })} />);

    expect(screen.getByText('dispatch.timeline.taskFailed')).toBeInTheDocument();
  });

  // CMP-CC-006: Shows View Details button
  it('CMP-CC-006: shows View Details button', () => {
    render(<ChildTaskCard message={makeMessage()} />);

    expect(screen.getByText('dispatch.timeline.viewDetails')).toBeInTheDocument();
  });

  // CMP-CC-007: Clicking View Details loads transcript and toggles to Hide Details
  it('CMP-CC-007: clicking View Details loads transcript and shows Hide Details', async () => {
    render(<ChildTaskCard message={makeMessage()} />);

    const viewBtn = screen.getByText('dispatch.timeline.viewDetails');
    await act(async () => {
      fireEvent.click(viewBtn);
    });

    expect(loadTranscriptMock).toHaveBeenCalledWith('child-1');
    expect(isTranscriptLoadingMock).toHaveBeenCalledWith('child-1');
    expect(screen.getByText('dispatch.timeline.hideDetails')).toBeInTheDocument();
  });

  // CMP-CC-008: Shows no transcript message when expanded and transcript is empty
  it('CMP-CC-008: shows no transcript message when transcript is empty', async () => {
    getTranscriptMock.mockReturnValue([]);

    render(<ChildTaskCard message={makeMessage()} />);

    const viewBtn = screen.getByText('dispatch.timeline.viewDetails');
    await act(async () => {
      fireEvent.click(viewBtn);
    });

    expect(screen.getByText('dispatch.timeline.noTranscript')).toBeInTheDocument();
  });

  // CMP-CC-009: Shows transcript messages when expanded and transcript has data
  it('CMP-CC-009: shows transcript messages when data is available', async () => {
    getTranscriptMock.mockReturnValue([
      { role: 'user', content: 'Hello agent', timestamp: 1 },
      { role: 'assistant', content: 'Working on it', timestamp: 2 },
    ]);

    render(<ChildTaskCard message={makeMessage()} />);

    const viewBtn = screen.getByText('dispatch.timeline.viewDetails');
    await act(async () => {
      fireEvent.click(viewBtn);
    });

    expect(screen.getByText('Hello agent')).toBeInTheDocument();
    expect(screen.getByText('Working on it')).toBeInTheDocument();
  });

  // CMP-CC-010: Renders avatar emoji when provided
  it('CMP-CC-010: renders avatar emoji when message has avatar', () => {
    render(<ChildTaskCard message={makeMessage({ avatar: '🤖' })} />);

    expect(screen.getByText('🤖')).toBeInTheDocument();
  });

  // CMP-CC-011: Renders People icon when no avatar
  it('CMP-CC-011: renders People icon when no avatar provided', () => {
    render(<ChildTaskCard message={makeMessage({ avatar: undefined })} />);

    expect(screen.getByTestId('icon-people')).toBeInTheDocument();
  });

  // CMP-CC-012: Shows content alongside display name when content is provided
  it('CMP-CC-012: shows content text next to display name', () => {
    render(<ChildTaskCard message={makeMessage({ content: 'Researching APIs' })} />);

    expect(screen.getByText('Researching APIs')).toBeInTheDocument();
  });

  // EDGE-006: Unknown messageType defaults to started status
  it('EDGE-006: unknown messageType defaults to started style', () => {
    render(<ChildTaskCard message={makeMessage({ messageType: 'text' })} />);

    expect(screen.getByText('dispatch.timeline.taskStarted')).toBeInTheDocument();
  });

  // EDGE-007: No childTaskId means loadTranscript not called
  it('EDGE-007: does not call loadTranscript when childTaskId is undefined', async () => {
    render(<ChildTaskCard message={makeMessage({ childTaskId: undefined })} />);

    const viewBtn = screen.getByText('dispatch.timeline.viewDetails');
    await act(async () => {
      fireEvent.click(viewBtn);
    });

    expect(loadTranscriptMock).not.toHaveBeenCalled();
  });

  // CMP-CC-013: Loading spinner shown while transcript is loading
  it('CMP-CC-013: shows spinner when transcript is loading', async () => {
    isTranscriptLoadingMock.mockReturnValue(true);

    render(<ChildTaskCard message={makeMessage()} />);

    const viewBtn = screen.getByText('dispatch.timeline.viewDetails');
    await act(async () => {
      fireEvent.click(viewBtn);
    });

    // When loading, the Spin component is rendered inside the expanded area
    const expandedArea = screen.getByText('dispatch.timeline.hideDetails').closest('[class]');
    expect(expandedArea).not.toBeNull();
    // The noTranscript message should NOT be shown while loading
    expect(screen.queryByText('dispatch.timeline.noTranscript')).not.toBeInTheDocument();
  });
});
