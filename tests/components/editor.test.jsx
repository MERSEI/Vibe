import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CodeEditor } from '../../src/components/editor/CodeEditor';
import { LivePreview } from '../../src/components/editor/LivePreview';

// Mock canvas for Minimap
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 10 })),
  set fillStyle(_v) {},
  get fillStyle() { return ''; },
  set font(_v) {},
  get font() { return ''; },
  canvas: { width: 60, height: 400 },
}));

describe('CodeEditor', () => {
  const defaultProps = {
    content: 'const x = 1;\nconst y = 2;',
    onChange: vi.fn(),
    language: 'javascript',
    theme: 'dark',
    collaborators: [],
  };

  it('renders without crashing', () => {
    const { container } = render(<CodeEditor {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('displays line numbers', () => {
    const { container } = render(<CodeEditor {...defaultProps} />);
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('2');
  });

  it('renders textarea with code content', () => {
    render(<CodeEditor {...defaultProps} />);
    const textarea = document.querySelector('textarea');
    expect(textarea).toBeTruthy();
    expect(textarea.value).toBe(defaultProps.content);
  });

  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    render(<CodeEditor {...defaultProps} onChange={onChange} />);
    const textarea = document.querySelector('textarea');
    fireEvent.change(textarea, { target: { value: 'new code' } });
    expect(onChange).toHaveBeenCalledWith('new code');
  });

  it('renders collaborator cursors', () => {
    const collaborators = [
      { id: 'u1', name: 'Alice', color: '#9333EA', cursor: { line: 1, col: 5 } },
    ];
    const { container } = render(
      <CodeEditor {...defaultProps} collaborators={collaborators} />
    );
    expect(container.textContent).toContain('Alice');
  });

  it('applies readonly when readOnly is true', () => {
    render(<CodeEditor {...defaultProps} readOnly />);
    const textarea = document.querySelector('textarea');
    expect(textarea.readOnly).toBe(true);
  });
});

describe('LivePreview', () => {
  // Use actual i18n keys from src/utils/i18n.js
  const defaultProps = {
    code: 'console.log("hello");',
    theme: 'dark',
    t: {
      preview: 'Preview',
      live: 'Live',
      run: 'Run',
      noOutput: 'No output yet',
      runToSee: 'Run code to see results',
      console: 'Console',
    },
  };

  it('renders without crashing', () => {
    const { container } = render(<LivePreview {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('displays Preview header', () => {
    render(<LivePreview {...defaultProps} />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('detects vanilla JS framework', () => {
    const { container } = render(<LivePreview {...defaultProps} />);
    // Framework badge contains emoji + label as separate text nodes
    expect(container.textContent).toContain('JS');
  });

  it('detects React framework from code', () => {
    const { container } = render(
      <LivePreview
        {...defaultProps}
        code="import React from 'react'; function App() { return <div/>; }"
      />
    );
    expect(container.textContent).toContain('React');
  });

  it('shows run button', () => {
    render(<LivePreview {...defaultProps} />);
    // Run button text comes from t.run prefixed with ▶
    const runBtns = screen.getAllByText(/Run/);
    expect(runBtns.length).toBeGreaterThan(0);
  });
});
