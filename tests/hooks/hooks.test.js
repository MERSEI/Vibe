import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useTheme,
  useI18n,
  useFileSystem,
  useLocalStorage,
  useDebounce,
  useCollaborators,
  useKeyboardShortcuts,
} from '../../src/hooks/index';

describe('useTheme', () => {
  it('starts with dark theme by default', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('accepts a custom initial theme', () => {
    const { result } = renderHook(() => useTheme('light'));
    expect(result.current.theme).toBe('light');
  });

  it('toggleTheme switches between dark and light', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('light');
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('setTheme sets an explicit theme', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('light'));
    expect(result.current.theme).toBe('light');
  });
});

describe('useI18n', () => {
  it('starts with English by default', () => {
    const { result } = renderHook(() => useI18n());
    expect(result.current.lang).toBe('en');
    expect(result.current.t).toBeDefined();
  });

  it('toggleLang switches between en and ru', () => {
    const { result } = renderHook(() => useI18n());
    act(() => result.current.toggleLang());
    expect(result.current.lang).toBe('ru');
    act(() => result.current.toggleLang());
    expect(result.current.lang).toBe('en');
  });

  it('translations object changes with language', () => {
    const { result } = renderHook(() => useI18n());
    const enTranslations = result.current.t;
    act(() => result.current.toggleLang());
    const ruTranslations = result.current.t;
    expect(enTranslations).not.toEqual(ruTranslations);
  });
});

describe('useFileSystem', () => {
  it('has initial files', () => {
    const { result } = renderHook(() => useFileSystem());
    expect(result.current.files).toHaveProperty('src');
    expect(result.current.files).toHaveProperty('docs');
  });

  it('default selected file is src/index.js', () => {
    const { result } = renderHook(() => useFileSystem());
    expect(result.current.selectedFile).toBe('src/index.js');
  });

  it('selectFile opens tab and sets selected', () => {
    const { result } = renderHook(() => useFileSystem());
    act(() => result.current.selectFile('src/agent.js'));
    expect(result.current.selectedFile).toBe('src/agent.js');
    expect(result.current.openTabs).toContain('src/agent.js');
  });

  it('closeTab removes tab', () => {
    const { result } = renderHook(() => useFileSystem());
    act(() => result.current.selectFile('src/agent.js'));
    act(() => result.current.closeTab('src/agent.js'));
    expect(result.current.openTabs).not.toContain('src/agent.js');
  });

  it('getFileContent returns content', () => {
    const { result } = renderHook(() => useFileSystem());
    const content = result.current.getFileContent('src/index.js');
    expect(content).toContain('Vibe IDE');
  });

  it('getFileLanguage detects language', () => {
    const { result } = renderHook(() => useFileSystem());
    expect(result.current.getFileLanguage('test.py')).toBe('python');
    expect(result.current.getFileLanguage('main.js')).toBe('javascript');
  });

  it('updateFile changes content', () => {
    const { result } = renderHook(() => useFileSystem());
    act(() => result.current.updateFile('src/index.js', 'updated'));
    expect(result.current.getFileContent('src/index.js')).toBe('updated');
  });

  it('createFile adds a file to a folder', () => {
    const { result } = renderHook(() => useFileSystem());
    act(() => result.current.createFile('src', 'new.js', 'code'));
    expect(result.current.getFileContent('src/new.js')).toBe('code');
  });

  it('deleteFile removes a file', () => {
    const { result } = renderHook(() => useFileSystem());
    act(() => result.current.deleteFile('src/agent.js'));
    expect(result.current.getFileContent('src/agent.js')).toBe('');
  });
});

describe('useLocalStorage', () => {
  it('returns initial value', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'init'));
    expect(result.current[0]).toBe('init');
  });

  it('setValue updates the value', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'init'));
    act(() => result.current[1]('updated'));
    expect(result.current[0]).toBe('updated');
  });
});

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'b' });
    expect(result.current).toBe('a');

    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('b');
  });
});

describe('useCollaborators', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts disconnected with empty list', () => {
    const { result } = renderHook(() => useCollaborators());
    expect(result.current.collaborators).toHaveLength(0);
    expect(result.current.isConnected).toBe(false);
  });

  it('connects after timeout', () => {
    const { result } = renderHook(() => useCollaborators());
    act(() => vi.advanceTimersByTime(1100));
    expect(result.current.isConnected).toBe(true);
  });

  it('adds collaborators after timeouts', () => {
    const { result } = renderHook(() => useCollaborators());
    act(() => vi.advanceTimersByTime(4100));
    expect(result.current.collaborators.length).toBeGreaterThanOrEqual(1);
  });
});

describe('useKeyboardShortcuts', () => {
  it('calls onSave when Ctrl+S is pressed', () => {
    const onSave = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onSave }));

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onRun when Ctrl+R is pressed', () => {
    const onRun = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onRun }));

    const event = new KeyboardEvent('keydown', {
      key: 'r',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('calls onSearch when Ctrl+F is pressed', () => {
    const onSearch = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onSearch }));

    const event = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(onSearch).toHaveBeenCalledTimes(1);
  });
});
