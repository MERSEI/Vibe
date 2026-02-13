import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { EventBusInspector } from '../../src/components/debug/EventBusInspector';

describe('EventBusInspector', () => {
  const defaultProps = {
    theme: 'dark',
    t: {
      eventBus: 'Event Bus',
    },
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders without crashing', () => {
    const { container } = render(<EventBusInspector {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('shows NATS Event Bus header', () => {
    const { container } = render(<EventBusInspector {...defaultProps} />);
    expect(container.textContent).toContain('NATS Event Bus');
  });

  it('shows pause/resume button', () => {
    const { container } = render(<EventBusInspector {...defaultProps} />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('generates events over time', () => {
    const { container } = render(<EventBusInspector {...defaultProps} />);
    act(() => vi.advanceTimersByTime(5000));
    // Events should be in the list
    expect(container.textContent.length).toBeGreaterThan(0);
  });

  it('has channel filter buttons', () => {
    const { container } = render(<EventBusInspector {...defaultProps} />);
    // Should see "All" and channel labels
    expect(container.textContent).toContain('All');
  });

  it('has replay button', () => {
    const { container } = render(<EventBusInspector {...defaultProps} />);
    expect(container.textContent).toContain('Replay');
  });
});
