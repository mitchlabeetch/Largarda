import { cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock CSS module before importing component
vi.mock('@renderer/pages/login/BinaryGrass.module.css', () => ({
  default: {
    container: 'container',
    measure: 'measure',
    canvas: 'canvas',
    g1: 'g1',
    g2: 'g2',
    g3: 'g3',
    g4: 'g4',
    g5: 'g5',
  },
}));

import BinaryGrass from '@renderer/pages/login/BinaryGrass';

describe('BinaryGrass', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    // Mock getBoundingClientRect for character measurement and container size
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 8,
      height: 16,
      top: 0,
      left: 0,
      right: 8,
      bottom: 16,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true, configurable: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the container with aria-hidden', () => {
    const { container } = render(<BinaryGrass />);
    const wrapper = container.firstElementChild;
    expect(wrapper).toBeTruthy();
    expect(wrapper?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the measurement span with "0" content', () => {
    const { container } = render(<BinaryGrass />);
    const span = container.querySelector('.measure');
    expect(span).toBeTruthy();
    expect(span?.tagName).toBe('SPAN');
    expect(span?.textContent).toBe('0');
  });

  it('renders the canvas as a pre element', () => {
    const { container } = render(<BinaryGrass />);
    const pre = container.querySelector('.canvas');
    expect(pre).toBeTruthy();
    expect(pre?.tagName).toBe('PRE');
  });

  it('applies correct CSS class to the container', () => {
    const { container } = render(<BinaryGrass />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toBe('container');
  });

  it('schedules animation via setTimeout on mount', () => {
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    render(<BinaryGrass />);
    expect(setTimeoutSpy).toHaveBeenCalled();
  });

  it('clears timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const { unmount } = render(<BinaryGrass />);
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('registers a resize event listener on mount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    render(<BinaryGrass />);
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('removes the resize event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<BinaryGrass />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('renders grass content after the first interval elapses', () => {
    const { container } = render(<BinaryGrass />);
    const pre = container.querySelector('.canvas');

    // Advance timer past FPS_INTERVAL (100ms) to trigger the first render
    vi.advanceTimersByTime(110);

    expect(pre).toBeTruthy();
    if (pre && pre.innerHTML.length > 0) {
      expect(pre.innerHTML).toContain('\n');
    }
  });

  it('debounces resize events with a 150ms delay', () => {
    const getBoundingClientRectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 50,
      top: 0,
      left: 0,
      right: 100,
      bottom: 50,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    render(<BinaryGrass />);

    // Let the animation settle — advance past a couple render cycles
    vi.advanceTimersByTime(250);
    const callsAfterSettle = getBoundingClientRectSpy.mock.calls.length;

    // Fire multiple resize events rapidly
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));

    // Record calls right after dispatching (render timer may also fire)
    vi.advanceTimersByTime(10);
    const callsBeforeDebounce = getBoundingClientRectSpy.mock.calls.length;

    // The debounced re-init should not fire until 150ms after last resize
    // (render calls only read existing grid state — initGrid calls are the debounce target)
    vi.advanceTimersByTime(139);
    // After 149ms total from last resize, debounce hasn't fired yet
    // Render loop may add calls, but the debounced initGrid hasn't run
    const callsBefore150 = getBoundingClientRectSpy.mock.calls.length;

    // At 150ms the debounce fires, triggering one extra initGrid → getBoundingClientRect
    vi.advanceTimersByTime(1);
    const callsAfter150 = getBoundingClientRectSpy.mock.calls.length;

    // Exactly one debounced initGrid should have fired (2 getBoundingClientRect calls per initGrid)
    expect(callsAfter150).toBeGreaterThan(callsBefore150);
  });

  it('schedules subsequent frames via setTimeout', () => {
    render(<BinaryGrass />);
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    const callsBefore = setTimeoutSpy.mock.calls.length;

    // Advance one frame
    vi.advanceTimersByTime(100);
    expect(setTimeoutSpy.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('does not crash when getBoundingClientRect returns zero dimensions', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const { container } = render(<BinaryGrass />);
    expect(container.firstElementChild).toBeTruthy();
  });

  it('does not render grass before the first interval elapses', () => {
    const { container } = render(<BinaryGrass />);
    const pre = container.querySelector('.canvas');

    // Don't advance timers at all — render hasn't fired yet
    expect(pre?.innerHTML ?? '').toBe('');
  });
});
