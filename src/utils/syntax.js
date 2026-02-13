/**
 * Syntax Highlighting Utility
 *
 * Regex-based syntax highlighter supporting 10+ languages
 *
 * Production integration points:
 * - Monaco's tokenizer or TextMate grammars for accuracy
 * - Incremental parsing for performance on large files
 */

// Syntax highlighting patterns by language
const SYNTAX_PATTERNS = {
  javascript: [
    { regex: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, className: 'text-green-500' }, // Comments
    { regex: /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, className: 'text-amber-400' }, // Strings
    { regex: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|import|export|default|from|as|async|await|try|catch|finally|throw|new|this|super|typeof|instanceof|in|of|void|delete)\b/g, className: 'text-purple-400' }, // Keywords
    { regex: /\b(true|false|null|undefined|NaN|Infinity)\b/g, className: 'text-red-400' }, // Literals
    { regex: /\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/gi, className: 'text-cyan-400' }, // Numbers
    { regex: /\b([A-Z][a-zA-Z0-9_]*)\b/g, className: 'text-yellow-300' }, // Classes/Types
    { regex: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, className: 'text-blue-400' }, // Functions
  ],

  typescript: [
    { regex: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, className: 'text-green-500' },
    { regex: /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, className: 'text-amber-400' },
    { regex: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|implements|import|export|default|from|as|async|await|try|catch|finally|throw|new|this|super|typeof|instanceof|in|of|void|delete|interface|type|enum|namespace|module|declare|abstract|public|private|protected|readonly|static|get|set|keyof|infer|never|unknown)\b/g, className: 'text-purple-400' },
    { regex: /\b(true|false|null|undefined|NaN|Infinity)\b/g, className: 'text-red-400' },
    { regex: /\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/gi, className: 'text-cyan-400' },
    { regex: /:\s*([A-Z][a-zA-Z0-9_<>]*)/g, className: 'text-yellow-300' },
    { regex: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, className: 'text-blue-400' },
  ],

  python: [
    { regex: /(#.*$|"""[\s\S]*?"""|'''[\s\S]*?''')/gm, className: 'text-green-500' },
    { regex: /(["'])(?:(?!\1)[^\\]|\\.)*?\1/g, className: 'text-amber-400' },
    { regex: /\b(def|class|if|elif|else|for|while|with|try|except|finally|raise|return|import|from|as|global|nonlocal|pass|break|continue|lambda|yield|async|await|and|or|not|in|is|assert|del)\b/g, className: 'text-purple-400' },
    { regex: /\b(True|False|None)\b/g, className: 'text-red-400' },
    { regex: /\b(\d+\.?\d*(?:e[+-]?\d+)?j?)\b/gi, className: 'text-cyan-400' },
    { regex: /\b([A-Z][a-zA-Z0-9_]*)\b/g, className: 'text-yellow-300' },
    { regex: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, className: 'text-blue-400' },
    { regex: /@([a-zA-Z_][a-zA-Z0-9_]*)/g, className: 'text-pink-400' }, // Decorators
  ],

  yaml: [
    { regex: /(#.*$)/gm, className: 'text-green-500' },
    { regex: /^(\s*[\w-]+):/gm, className: 'text-cyan-400' }, // Keys
    { regex: /(["'])(?:(?!\1)[^\\]|\\.)*?\1/g, className: 'text-amber-400' },
    { regex: /\b(true|false|null|yes|no|on|off)\b/gi, className: 'text-red-400' },
    { regex: /\b(\d+\.?\d*)\b/g, className: 'text-purple-400' },
    { regex: /(\||\|-|>|>-)/g, className: 'text-pink-400' }, // Block scalars
    { regex: /(&|\*)[a-zA-Z_][a-zA-Z0-9_]*/g, className: 'text-yellow-300' }, // Anchors & aliases
  ],

  markdown: [
    { regex: /(^#{1,6}\s+.*)$/gm, className: 'text-purple-400 font-bold' }, // Headers
    { regex: /(\*\*|__)(.*?)\1/g, className: 'text-white font-bold' }, // Bold
    { regex: /(\*|_)(.*?)\1/g, className: 'text-white italic' }, // Italic
    { regex: /(`{1,3})(.*?)\1/g, className: 'text-pink-400' }, // Code
    { regex: /^\s*[-*+]\s/gm, className: 'text-cyan-400' }, // Lists
    { regex: /^\s*\d+\.\s/gm, className: 'text-cyan-400' }, // Numbered lists
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, className: 'text-blue-400 underline' }, // Links
    { regex: /^>\s+.*/gm, className: 'text-gray-400 italic' }, // Blockquotes
  ],

  json: [
    { regex: /(["'])(?:(?!\1)[^\\]|\\.)*?\1(?=\s*:)/g, className: 'text-cyan-400' }, // Keys
    { regex: /(["'])(?:(?!\1)[^\\]|\\.)*?\1/g, className: 'text-amber-400' }, // String values
    { regex: /\b(true|false|null)\b/g, className: 'text-red-400' },
    { regex: /\b(-?\d+\.?\d*(?:e[+-]?\d+)?)\b/gi, className: 'text-purple-400' },
  ],

  html: [
    { regex: /(<!--[\s\S]*?-->)/g, className: 'text-green-500' }, // Comments
    { regex: /(&lt;\/?[a-zA-Z][a-zA-Z0-9-]*)/g, className: 'text-red-400' }, // Tags
    { regex: /\b([a-zA-Z-]+)(?==)/g, className: 'text-yellow-300' }, // Attributes
    { regex: /(["'])(?:(?!\1)[^\\]|\\.)*?\1/g, className: 'text-amber-400' }, // Strings
    { regex: /(&amp;[a-zA-Z]+;)/g, className: 'text-cyan-400' }, // Entities
  ],

  css: [
    { regex: /(\/\*[\s\S]*?\*\/)/g, className: 'text-green-500' }, // Comments
    { regex: /([.#][a-zA-Z_-][a-zA-Z0-9_-]*)/g, className: 'text-yellow-300' }, // Selectors
    { regex: /\b(px|em|rem|vh|vw|%|fr|s|ms|deg|calc|var|rgb|rgba|hsl|hsla)\b/g, className: 'text-cyan-400' }, // Units & functions
    { regex: /(["'])(?:(?!\1)[^\\]|\\.)*?\1/g, className: 'text-amber-400' }, // Strings
    { regex: /\b([a-z-]+)\s*(?=:)/g, className: 'text-purple-400' }, // Properties
    { regex: /(#[0-9a-fA-F]{3,8})\b/g, className: 'text-pink-400' }, // Colors
    { regex: /\b(\d+\.?\d*)\b/g, className: 'text-cyan-400' }, // Numbers
    { regex: /(@[a-zA-Z-]+)/g, className: 'text-red-400' }, // At-rules
  ],

  rust: [
    { regex: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, className: 'text-green-500' }, // Comments
    { regex: /(["'])(?:(?!\1)[^\\]|\\.)*?\1/g, className: 'text-amber-400' }, // Strings
    { regex: /\b(fn|let|mut|const|pub|mod|use|struct|enum|impl|trait|for|while|loop|if|else|match|return|break|continue|async|await|move|ref|self|Self|super|crate|where|type|as|in|unsafe|extern|static|dyn)\b/g, className: 'text-purple-400' }, // Keywords
    { regex: /\b(true|false|None|Some|Ok|Err)\b/g, className: 'text-red-400' }, // Literals
    { regex: /\b(\d+\.?\d*(?:_\d+)*(?:f32|f64|u8|u16|u32|u64|i8|i16|i32|i64|usize|isize)?)\b/g, className: 'text-cyan-400' }, // Numbers
    { regex: /\b([A-Z][a-zA-Z0-9_]*)\b/g, className: 'text-yellow-300' }, // Types
    { regex: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, className: 'text-blue-400' }, // Functions
    { regex: /(#\[.*?\])/g, className: 'text-pink-400' }, // Attributes
  ],

  go: [
    { regex: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, className: 'text-green-500' }, // Comments
    { regex: /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, className: 'text-amber-400' }, // Strings
    { regex: /\b(func|return|var|const|type|struct|interface|map|chan|go|select|case|default|if|else|for|range|switch|break|continue|defer|package|import|make|new|append|len|cap|nil)\b/g, className: 'text-purple-400' }, // Keywords
    { regex: /\b(true|false|nil|iota)\b/g, className: 'text-red-400' }, // Literals
    { regex: /\b(\d+\.?\d*)\b/g, className: 'text-cyan-400' }, // Numbers
    { regex: /\b([A-Z][a-zA-Z0-9_]*)\b/g, className: 'text-yellow-300' }, // Exported/Types
    { regex: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, className: 'text-blue-400' }, // Functions
  ],

  sql: [
    { regex: /(--.*$|\/\*[\s\S]*?\*\/)/gm, className: 'text-green-500' }, // Comments
    { regex: /(["'])(?:(?!\1)[^\\]|\\.)*?\1/g, className: 'text-amber-400' }, // Strings
    { regex: /\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|SET|DELETE|CREATE|DROP|ALTER|TABLE|INDEX|VIEW|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|AS|DISTINCT|UNION|ALL|VALUES|DEFAULT|NULL|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|IF|ELSE|CASE|WHEN|THEN|END|BEGIN|COMMIT|ROLLBACK|EXTENSION|USING|WITH)\b/gi, className: 'text-purple-400' },
    { regex: /\b(INT|INTEGER|VARCHAR|TEXT|BOOLEAN|FLOAT|DOUBLE|DECIMAL|DATE|TIMESTAMP|TIMESTAMPTZ|UUID|JSONB|JSON|SERIAL|BIGINT|SMALLINT|CHAR|BLOB|VECTOR)\b/gi, className: 'text-cyan-400' }, // Types
    { regex: /\b(\d+\.?\d*)\b/g, className: 'text-red-400' }, // Numbers
  ],

  dockerfile: [
    { regex: /(#.*$)/gm, className: 'text-green-500' }, // Comments
    { regex: /^(FROM|RUN|CMD|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|LABEL|HEALTHCHECK|SHELL|STOPSIGNAL)\b/gm, className: 'text-purple-400' }, // Instructions
    { regex: /(["'])(?:(?!\1)[^\\]|\\.)*?\1/g, className: 'text-amber-400' }, // Strings
    { regex: /(\$\{?[a-zA-Z_][a-zA-Z0-9_]*\}?)/g, className: 'text-cyan-400' }, // Variables
  ],
};

/**
 * Apply syntax highlighting to code
 * @param {string} code - Source code
 * @param {string} language - Programming language
 * @returns {string} HTML with syntax highlighting spans
 */
export function highlightSyntax(code, language = 'javascript') {
  // Escape HTML entities
  let result = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Get patterns for language (fall back to javascript)
  const patterns = SYNTAX_PATTERNS[language] || SYNTAX_PATTERNS.javascript;

  // Apply patterns
  // Note: This is a simplified approach. Production should use proper tokenizer
  for (const { regex, className } of patterns) {
    result = result.replace(regex, (match) => {
      // Avoid double-wrapping already highlighted content
      if (match.includes('<span')) return match;
      return `<span class="${className}">${match}</span>`;
    });
  }

  return result;
}

/**
 * Get language from file extension
 * @param {string} filename - File name or path
 * @returns {string} Language identifier
 */
export function getLanguageFromFile(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const langMap = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    json: 'json',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'css',
    rs: 'rust',
    go: 'go',
    sql: 'sql',
    dockerfile: 'dockerfile',
  };
  // Handle Dockerfile (no extension, just filename)
  if (filename.toLowerCase() === 'dockerfile' || filename.toLowerCase().startsWith('dockerfile.')) {
    return 'dockerfile';
  }
  return langMap[ext] || 'javascript';
}

/**
 * Format code (basic auto-indent)
 * @param {string} code - Source code
 * @param {string} language - Programming language
 * @returns {string} Formatted code
 */
export function formatCode(code, language = 'javascript') {
  if (language === 'json') {
    try {
      return JSON.stringify(JSON.parse(code), null, 2);
    } catch {
      return code;
    }
  }

  // Basic bracket-based indentation for other languages
  const lines = code.split('\n');
  let indent = 0;
  const tabSize = 2;

  return lines.map(line => {
    const trimmed = line.trim();
    
    // Decrease indent for closing brackets
    if (/^[}\])]/.test(trimmed)) {
      indent = Math.max(0, indent - 1);
    }
    
    const result = ' '.repeat(indent * tabSize) + trimmed;
    
    // Increase indent for opening brackets
    if (/[{[\(]\s*$/.test(trimmed) && !/[}\])]/.test(trimmed)) {
      indent++;
    }
    
    return result;
  }).join('\n');
}
