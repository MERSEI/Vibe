import { describe, it, expect } from 'vitest';
import {
  CURSOR_COLORS,
  LANGUAGES,
  EDITOR_DEFAULTS,
  AGENT_TEMPLATES,
  CHUNKING_STRATEGIES,
  LLM_MODELS,
  KEYBOARD_SHORTCUTS,
  EVENT_CHANNELS,
  THEME_CONFIG,
} from '../../src/utils/constants';

describe('CURSOR_COLORS', () => {
  it('has at least 8 colors', () => {
    expect(CURSOR_COLORS.length).toBeGreaterThanOrEqual(8);
  });

  it('contains valid hex colors', () => {
    CURSOR_COLORS.forEach((color) => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

describe('LANGUAGES', () => {
  it('includes all core languages', () => {
    const expected = [
      'javascript',
      'typescript',
      'python',
      'yaml',
      'markdown',
      'json',
      'html',
      'css',
      'rust',
      'go',
      'sql',
      'dockerfile',
    ];
    expected.forEach((lang) => {
      expect(LANGUAGES).toHaveProperty(lang);
    });
  });

  it('each language has name, ext array, and icon', () => {
    Object.values(LANGUAGES).forEach((lang) => {
      expect(lang).toHaveProperty('name');
      expect(lang).toHaveProperty('ext');
      expect(lang).toHaveProperty('icon');
      expect(Array.isArray(lang.ext)).toBe(true);
      expect(lang.ext.length).toBeGreaterThan(0);
    });
  });
});

describe('EDITOR_DEFAULTS', () => {
  it('has standard editor settings', () => {
    expect(EDITOR_DEFAULTS).toHaveProperty('fontSize');
    expect(EDITOR_DEFAULTS).toHaveProperty('tabSize');
    expect(EDITOR_DEFAULTS).toHaveProperty('theme');
    expect(EDITOR_DEFAULTS.fontSize).toBeGreaterThan(0);
    expect(EDITOR_DEFAULTS.tabSize).toBeGreaterThan(0);
  });
});

describe('AGENT_TEMPLATES', () => {
  it('has at least one template', () => {
    expect(AGENT_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('each template has required fields', () => {
    AGENT_TEMPLATES.forEach((tmpl) => {
      expect(tmpl).toHaveProperty('id');
      expect(tmpl).toHaveProperty('name');
      expect(tmpl).toHaveProperty('model');
      expect(tmpl).toHaveProperty('tools');
      expect(Array.isArray(tmpl.tools)).toBe(true);
    });
  });
});

describe('CHUNKING_STRATEGIES', () => {
  it('has three strategies', () => {
    expect(CHUNKING_STRATEGIES).toHaveLength(3);
  });

  it('each strategy has id, name, description', () => {
    CHUNKING_STRATEGIES.forEach((s) => {
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('name');
      expect(s).toHaveProperty('description');
    });
  });
});

describe('LLM_MODELS', () => {
  it('includes Claude models', () => {
    const ids = LLM_MODELS.map((m) => m.id);
    expect(ids).toContain('claude-3-opus');
    expect(ids).toContain('claude-3-sonnet');
    expect(ids).toContain('claude-3-haiku');
  });

  it('each model has cost info', () => {
    LLM_MODELS.forEach((m) => {
      expect(m.costPer1k).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('KEYBOARD_SHORTCUTS', () => {
  it('has common shortcuts', () => {
    const actions = KEYBOARD_SHORTCUTS.map((s) => s.action);
    expect(actions).toContain('save');
    expect(actions).toContain('undo');
    expect(actions).toContain('redo');
  });
});

describe('EVENT_CHANNELS', () => {
  it('has standard channels', () => {
    expect(EVENT_CHANNELS).toHaveProperty('agents');
    expect(EVENT_CHANNELS).toHaveProperty('rag');
    expect(EVENT_CHANNELS).toHaveProperty('llm');
  });

  it('each channel has color and label', () => {
    Object.values(EVENT_CHANNELS).forEach((ch) => {
      expect(ch).toHaveProperty('color');
      expect(ch).toHaveProperty('label');
    });
  });
});

describe('THEME_CONFIG', () => {
  it('has dark and light themes', () => {
    expect(THEME_CONFIG).toHaveProperty('dark');
    expect(THEME_CONFIG).toHaveProperty('light');
  });

  it('each theme has bg, text, and border classes', () => {
    ['dark', 'light'].forEach((t) => {
      expect(THEME_CONFIG[t]).toHaveProperty('bg');
      expect(THEME_CONFIG[t]).toHaveProperty('text');
      expect(THEME_CONFIG[t]).toHaveProperty('border');
    });
  });
});
