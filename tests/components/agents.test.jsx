import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AgentBuilder } from '../../src/components/agents/AgentBuilder';

describe('AgentBuilder', () => {
  // Use actual i18n keys from src/utils/i18n.js
  const defaultProps = {
    theme: 'dark',
    t: {
      templates: 'Templates',
      createAgent: 'Create Agent',
      activeAgents: 'Active Agents',
      dagExecution: 'DAG Execution',
      agentStatus: {
        idle: 'Idle',
        running: 'Running',
        completed: 'Completed',
        error: 'Error',
      },
    },
  };

  it('renders without crashing', () => {
    const { container } = render(<AgentBuilder {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('shows template gallery', () => {
    render(<AgentBuilder {...defaultProps} />);
    expect(screen.getByText('Templates')).toBeInTheDocument();
  });

  it('displays active agents section', () => {
    render(<AgentBuilder {...defaultProps} />);
    expect(screen.getByText('Active Agents')).toBeInTheDocument();
  });

  it('shows DAG Execution section', () => {
    render(<AgentBuilder {...defaultProps} />);
    expect(screen.getByText('DAG Execution')).toBeInTheDocument();
  });

  it('renders agent template cards', () => {
    render(<AgentBuilder {...defaultProps} />);
    expect(screen.getByText('ChatBot')).toBeInTheDocument();
    expect(screen.getByText('RAG-Search')).toBeInTheDocument();
  });

  it('renders SVG for DAG visualization', () => {
    const { container } = render(<AgentBuilder {...defaultProps} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});
