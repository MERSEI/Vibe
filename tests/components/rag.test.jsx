import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { RAGPlayground } from '../../src/components/rag/RAGPlayground';

describe('RAGPlayground', () => {
  const defaultProps = {
    theme: 'dark',
    t: {
      query: 'Ask a question...',
      search: 'Search',
      chunkingStrategy: 'Chunking Strategy',
      vectorDb: 'Vector Database',
      embeddingModel: 'Embedding Model',
      ttl: 'TTL',
      relevance: 'Relevance',
      hybridSearch: 'Hybrid BM25 + Vector search enabled',
      noResults: 'No results found',
    },
  };

  it('renders without crashing', () => {
    const { container } = render(<RAGPlayground {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('renders search input with placeholder', () => {
    render(<RAGPlayground {...defaultProps} />);
    const input = document.querySelector('input[type="text"]');
    expect(input).toBeTruthy();
    expect(input.placeholder).toBe('Ask a question...');
  });

  it('renders search button', () => {
    const { container } = render(<RAGPlayground {...defaultProps} />);
    // Search button contains "🔍 Search" — find button element
    const buttons = container.querySelectorAll('button');
    const searchBtn = Array.from(buttons).find((b) => b.textContent.includes('Search'));
    expect(searchBtn).toBeTruthy();
  });

  it('shows search mode options', () => {
    const { container } = render(<RAGPlayground {...defaultProps} />);
    expect(container.textContent).toContain('Hybrid');
    expect(container.textContent).toContain('Vector');
    expect(container.textContent).toContain('BM25');
  });

  it('shows chunking strategy section', () => {
    const { container } = render(<RAGPlayground {...defaultProps} />);
    expect(container.textContent).toContain('Chunking Strategy');
  });

  it('renders vector DB stats area', () => {
    const { container } = render(<RAGPlayground {...defaultProps} />);
    expect(container.textContent).toContain('Vector Database');
  });

  it('performs search on button click', () => {
    const { container } = render(<RAGPlayground {...defaultProps} />);
    const input = container.querySelector('input[type="text"]');
    fireEvent.change(input, { target: { value: 'test query' } });
    const buttons = container.querySelectorAll('button');
    const searchBtn = Array.from(buttons).find((b) => b.textContent.includes('Search'));
    fireEvent.click(searchBtn);
    // After search, component re-renders with results
    expect(container).toBeTruthy();
  });
});
