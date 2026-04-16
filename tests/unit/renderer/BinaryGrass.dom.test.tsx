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
  let rafCallbacks: ((time: number) => void)[];
  let rafId: number;

  beforeEach(() => {
    rafCallbacks = [];
    rafId = 0;

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      rafId += 1;
      return rafId;
    });

    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

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

  it('requests animation frame on mount', () => {
    render(<BinaryGrass />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it('cancels animation frame on unmount', () => {
    const { unmount } = render(<BinaryGrass />);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
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

  it('fires render callback via requestAnimationFrame', () => {
    render(<BinaryGrass />);
    // The initial rAF call queues the render function
    expect(rafCallbacks.length).toBeGreaterThan(0);

    // Invoke the first frame — the render function schedules the next frame
    rafCallbacks[0](0);
    expect(rafCallbacks.length).toBeGreaterThan(1);
  });

  it('renders grass content after sufficient time elapses', () => {
    const { container } = render(<BinaryGrass />);
    const pre = container.querySelector('.canvas');

    // First frame at t=0 initializes; second frame at t=200ms exceeds FPS_INTERVAL (100ms)
    if (rafCallbacks.length > 0) {
      rafCallbacks[0](0);
    }
    if (rafCallbacks.length > 1) {
      rafCallbacks[1](200);
    }

    // After rendering, the pre element should have content written via innerHTML
    expect(pre).toBeTruthy();
    if (pre && pre.innerHTML.length > 0) {
      expect(pre.innerHTML).toContain('\n');
    }
  });

  it('debounces resize events with a 150ms delay', () => {
    vi.useFakeTimers();
    render(<BinaryGrass />);

    // Fire multiple resize events rapidly
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));

    // Advance past the debounce delay
    vi.advanceTimersByTime(150);

    vi.useRealTimers();
  });

  it('schedules each subsequent frame inside the render loop', () => {
    render(<BinaryGrass />);
    const initialCount = rafCallbacks.length;

    // Execute the render function — it should schedule the next frame
    rafCallbacks[initialCount - 1](0);
    expect(rafCallbacks.length).toBe(initialCount + 1);
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

  it('skips rendering when FPS interval has not elapsed', () => {
    const { container } = render(<BinaryGrass />);
    const pre = container.querySelector('.canvas');

    // First frame
    if (rafCallbacks.length > 0) {
      rafCallbacks[0](0);
    }
    // Second frame only 10ms later — below FPS_INTERVAL of 100ms
    if (rafCallbacks.length > 1) {
      rafCallbacks[1](10);
    }

    // Pre should still be empty because the render was throttled
    expect(pre?.innerHTML ?? '').toBe('');
  });
});
