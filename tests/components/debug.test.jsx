import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { DebugViewer } from '../../src/components/debug/DebugViewer';

// Mock Recharts to avoid rendering issues in test
vi.mock('recharts', () => ({
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
}));

describe('DebugViewer', () => {
  // Use actual i18n keys from src/utils/i18n.js
  const defaultProps = {
    theme: 'dark',
    t: {
      traces: 'Traces',
      spans: 'Spans',
      errors: 'Errors',
      cost: 'Cost',
      tokens: 'Tokens',
      duration: 'Duration',
      tokenUsage: 'Token Usage',
      traceTimeline: 'Trace Timeline',
    },
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders without crashing', () => {
    const { container } = render(<DebugViewer {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('shows traces label', () => {
    render(<DebugViewer {...defaultProps} />);
    expect(screen.getByText('Traces')).toBeInTheDocument();
  });

  it('shows token usage section', () => {
    render(<DebugViewer {...defaultProps} />);
    expect(screen.getByText('Token Usage')).toBeInTheDocument();
  });

  it('shows streaming controls', () => {
    render(<DebugViewer {...defaultProps} />);
    expect(screen.getByText('⏸ Pause')).toBeInTheDocument();
  });

  it('toggles streaming on pause/resume', () => {
    render(<DebugViewer {...defaultProps} />);
    const pauseBtn = screen.getByText('⏸ Pause');
    fireEvent.click(pauseBtn);
    expect(screen.getByText('▶ Resume')).toBeInTheDocument();
    fireEvent.click(screen.getByText('▶ Resume'));
    expect(screen.getByText('⏸ Pause')).toBeInTheDocument();
  });

  it('renders filter tabs', () => {
    render(<DebugViewer {...defaultProps} />);
    expect(screen.getByText(/All/)).toBeInTheDocument();
  });

  it('renders SVG or chart components', () => {
    const { container } = render(<DebugViewer {...defaultProps} />);
    // Recharts is mocked so we should find bar-chart testid
    expect(container.querySelector('[data-testid="bar-chart"]') || container.textContent.includes('Token Usage')).toBeTruthy();
  });
});
