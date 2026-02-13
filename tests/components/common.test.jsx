import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import {
  Toast,
  Button,
  Badge,
  Spinner,
  EmptyState,
} from '../../src/components/common/index';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders message text', () => {
    render(<Toast message="File saved!" onClose={() => {}} />);
    expect(screen.getByText('File saved!')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Toast message="msg" onClose={onClose} />);
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('auto-closes after duration', () => {
    const onClose = vi.fn();
    render(<Toast message="msg" onClose={onClose} duration={1000} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled').closest('button')).toBeDisabled();
  });

  it('renders with primary variant by default', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByText('Primary').closest('button');
    expect(btn.className).toContain('bg-purple-600');
  });

  it('renders with danger variant', () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByText('Delete').closest('button');
    expect(btn.className).toContain('bg-red-600');
  });
});

describe('Badge', () => {
  it('renders text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});

describe('Spinner', () => {
  it('renders without crashing', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState icon="📭" title="No data" description="Nothing to show" />);
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByText('Nothing to show')).toBeInTheDocument();
  });

  it('renders icon', () => {
    render(<EmptyState icon="📭" title="Empty" />);
    expect(screen.getByText('📭')).toBeInTheDocument();
  });
});
