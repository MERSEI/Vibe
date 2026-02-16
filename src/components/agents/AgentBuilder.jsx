/**
 * AgentBuilder Component
 *
 * AI Agent orchestration panel with:
 * - Template gallery
 * - Drag-and-drop + connect-mode DAG editor
 * - Active agents management (add / delete)
 * - IDE file attachment and write-back
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { AGENT_TEMPLATES, LLM_MODELS, CURSOR_COLORS } from '../../utils/constants';
import { sendMessage } from '../../api/anthropic/client';

const INITIAL_NODES = [
  { id: 'input',  x: 50,  y: 100, label: 'Input',        type: 'input'  },
  { id: 'agent1', x: 200, y: 50,  label: 'CodeReviewer', type: 'agent'  },
  { id: 'agent2', x: 200, y: 150, label: 'DocWriter',    type: 'agent'  },
  { id: 'merge',  x: 350, y: 100, label: 'Merge',        type: 'merge'  },
  { id: 'output', x: 500, y: 100, label: 'Output',       type: 'output' },
];

const INITIAL_EDGES = [
  { from: 'input',  to: 'agent1' },
  { from: 'input',  to: 'agent2' },
  { from: 'agent1', to: 'merge'  },
  { from: 'agent2', to: 'merge'  },
  { from: 'merge',  to: 'output' },
];

/** Flatten nested file tree into array of path strings */
function getFlatFiles(tree, prefix = '') {
  const result = [];
  if (!tree) return result;
  for (const [name, item] of Object.entries(tree)) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (item.type === 'folder' && item.children) {
      result.push(...getFlatFiles(item.children, path));
    } else if (item.type !== 'folder') {
      result.push(path);
    }
  }
  return result;
}

export function AgentBuilder({ theme, t, createFile, selectFile, files, getFileContent, updateFile, selectedFile }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [agents, setAgents] = useState([
    { id: 1, name: 'CodeReviewer', model: 'claude-3-opus',   status: 'idle',      tools: ['code_analysis', 'git_diff'] },
    { id: 2, name: 'DocWriter',    model: 'claude-3-sonnet', status: 'running',   tools: ['markdown_gen'] },
    { id: 3, name: 'TestGenerator',model: 'claude-3-haiku',  status: 'completed', tools: ['test_runner'] },
  ]);
  const [dagNodes, setDagNodes] = useState(INITIAL_NODES);
  const [dagEdges, setDagEdges] = useState(INITIAL_EDGES);

  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';

  const handleAddAgent = useCallback((name, model) => {
    const id = Date.now();
    setAgents(prev => [...prev, { id, name, model, status: 'idle', tools: [] }]);
    setDagNodes(prev => [
      ...prev,
      {
        id: `agent-${id}`,
        x: 120 + (prev.filter(n => n.type === 'agent').length * 30) % 200,
        y: 60 + (prev.filter(n => n.type === 'agent').length * 25) % 120,
        label: name,
        type: 'agent',
      },
    ]);
  }, []);

  /** Delete agent by name (from agent list) */
  const handleDeleteAgent = useCallback((agentName) => {
    const nodeIds = dagNodes
      .filter(n => n.type === 'agent' && n.label === agentName)
      .map(n => n.id);
    setAgents(prev => prev.filter(a => a.name !== agentName));
    setDagNodes(prev => prev.filter(n => !nodeIds.includes(n.id)));
    setDagEdges(prev => prev.filter(e => !nodeIds.includes(e.from) && !nodeIds.includes(e.to)));
  }, [dagNodes]);

  /** Delete a DAG node by nodeId (from DAG canvas) */
  const handleDeleteDagNode = useCallback((nodeId) => {
    const node = dagNodes.find(n => n.id === nodeId);
    setDagNodes(prev => prev.filter(n => n.id !== nodeId));
    setDagEdges(prev => prev.filter(e => e.from !== nodeId && e.to !== nodeId));
    if (node?.type === 'agent') {
      setAgents(prev => prev.filter(a => a.name !== node.label));
    }
  }, [dagNodes]);

  return (
    <div className="h-full flex">
      {/* Left Panel — Templates & Agents */}
      <div className={`w-80 border-r ${borderClass} flex flex-col`}>
        <TemplateGallery
          templates={AGENT_TEMPLATES}
          selectedTemplate={selectedTemplate}
          onSelect={setSelectedTemplate}
          theme={theme}
          t={t}
        />
        <AgentList
          agents={agents}
          onAddAgent={handleAddAgent}
          onDeleteAgent={handleDeleteAgent}
          theme={theme}
          t={t}
        />
      </div>

      {/* Right Panel — DAG + Config */}
      <div className="flex-1 flex flex-col">
        <DAGVisualization
          nodes={dagNodes}
          setNodes={setDagNodes}
          edges={dagEdges}
          setEdges={setDagEdges}
          onDeleteNode={handleDeleteDagNode}
          theme={theme}
          t={t}
        />

        {selectedTemplate && (
          <AgentConfig
            template={selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
            onAgentStatusChange={(name, status) =>
              setAgents(prev => prev.map(a => a.name === name ? { ...a, status } : a))
            }
            createFile={createFile}
            selectFile={selectFile}
            selectedFile={selectedFile}
            files={files}
            getFileContent={getFileContent}
            updateFile={updateFile}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TemplateGallery
// ---------------------------------------------------------------------------
function TemplateGallery({ templates, selectedTemplate, onSelect, theme, t }) {
  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';
  return (
    <div className={`p-4 border-b ${borderClass}`}>
      <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
        <span>📦</span> {t.templates}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {templates.map(tmpl => (
          <button
            key={tmpl.id}
            onClick={() => onSelect(tmpl)}
            className={`p-3 rounded-lg text-left transition-all border ${
              selectedTemplate?.id === tmpl.id
                ? 'bg-purple-600/20 border-purple-500'
                : theme === 'dark'
                  ? 'bg-slate-800/50 hover:bg-slate-700/50 border-slate-700'
                  : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
            }`}
          >
            <div className="text-xl mb-1">{tmpl.icon}</div>
            <div className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
              {tmpl.name}
            </div>
            <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} line-clamp-2`}>
              {tmpl.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AgentList
// ---------------------------------------------------------------------------
function AgentList({ agents, onAddAgent, onDeleteAgent, theme, t }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newModel, setNewModel] = useState(LLM_MODELS[0]?.id || 'claude-3-opus');

  const statusColors = {
    idle:      'bg-slate-500/20 text-slate-400',
    running:   'bg-blue-500/20  text-blue-400',
    completed: 'bg-green-500/20 text-green-400',
    error:     'bg-red-500/20   text-red-400',
  };

  const inputClass = `w-full px-2 py-1.5 rounded border text-sm outline-none ${
    theme === 'dark'
      ? 'bg-slate-700 border-slate-600 text-slate-200 focus:border-purple-500'
      : 'bg-white border-gray-300 text-gray-800 focus:border-purple-500'
  }`;

  const handleCommit = () => {
    if (!newName.trim()) return;
    onAddAgent?.(newName.trim(), newModel);
    setNewName('');
    setShowAddForm(false);
  };

  return (
    <div className="flex-1 overflow-auto p-4">
      <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
        <span>🤖</span> {t.activeAgents}
      </h3>
      <div className="space-y-2">
        {agents.map((agent, i) => (
          <div
            key={agent.id}
            className={`group p-3 rounded-lg flex flex-col gap-1 ${
              theme === 'dark' ? 'bg-slate-800/50 border border-slate-700' : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs text-white"
                  style={{ backgroundColor: CURSOR_COLORS[i % CURSOR_COLORS.length] }}
                >
                  {agent.name.charAt(0)}
                </div>
                <span className={`font-medium truncate ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                  {agent.name}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[agent.status]}`}>
                  {t.agentStatus?.[agent.status] ?? agent.status}
                </span>
                {/* Delete button — visible on row hover */}
                <button
                  onClick={() => onDeleteAgent?.(agent.name)}
                  className={`opacity-0 group-hover:opacity-100 p-0.5 rounded text-red-400 hover:bg-red-500/20 transition-opacity`}
                  title="Remove agent"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
              {agent.model}{agent.tools.length > 0 ? ` · ${agent.tools.join(', ')}` : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Add Agent form */}
      {showAddForm ? (
        <div className={`mt-3 p-3 rounded-lg border ${theme === 'dark' ? 'border-slate-600 bg-slate-800/50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="space-y-2">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCommit(); if (e.key === 'Escape') setShowAddForm(false); }}
              placeholder="Agent name"
              className={inputClass}
            />
            <select value={newModel} onChange={e => setNewModel(e.target.value)} className={inputClass}>
              {LLM_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleCommit}
                disabled={!newName.trim()}
                className="flex-1 py-1.5 rounded text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className={`flex-1 py-1.5 rounded text-xs ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className={`mt-3 w-full py-2 rounded-lg text-xs border-dashed border transition-colors ${
            theme === 'dark'
              ? 'border-slate-600 text-slate-400 hover:border-purple-500 hover:text-purple-400'
              : 'border-gray-300 text-gray-500 hover:border-purple-400 hover:text-purple-500'
          }`}
        >
          + Add Agent
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DAGVisualization
// ---------------------------------------------------------------------------
function DAGVisualization({ nodes, setNodes, edges, setEdges, onDeleteNode, theme, t }) {
  const [mode, setMode] = useState('drag'); // 'drag' | 'connect'
  const [fromNode, setFromNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  const nodeColor = (type, highlighted = false) => {
    if (highlighted) return '#f59e0b';
    const map = {
      input:  theme === 'dark' ? '#059669' : '#34d399',
      agent:  theme === 'dark' ? '#7c3aed' : '#a78bfa',
      merge:  theme === 'dark' ? '#475569' : '#94a3b8',
      output: theme === 'dark' ? '#dc2626' : '#f87171',
    };
    return map[type] ?? map.merge;
  };

  const toSVG = useCallback((cx, cy) => {
    const svg = svgRef.current;
    if (!svg) return { x: cx, y: cy };
    const r = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    return { x: ((cx - r.left) / r.width) * vb.width, y: ((cy - r.top) / r.height) * vb.height };
  }, []);

  const handleMouseDown = useCallback((e, nodeId) => {
    if (mode !== 'drag') return;
    e.preventDefault();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const pt = toSVG(e.clientX, e.clientY);
    setDraggingNode(nodeId);
    setDragOffset({ x: pt.x - node.x, y: pt.y - node.y });
  }, [mode, nodes, toSVG]);

  const handleMouseMove = useCallback((e) => {
    if (!draggingNode) return;
    const pt = toSVG(e.clientX, e.clientY);
    setNodes(prev => prev.map(n =>
      n.id === draggingNode
        ? { ...n, x: Math.max(0, Math.min(480, pt.x - dragOffset.x)), y: Math.max(25, Math.min(175, pt.y - dragOffset.y)) }
        : n
    ));
  }, [draggingNode, dragOffset, toSVG, setNodes]);

  const handleMouseUp = useCallback(() => setDraggingNode(null), []);

  const handleNodeClick = useCallback((e, nodeId) => {
    if (mode !== 'connect') return;
    e.stopPropagation();
    if (!fromNode) {
      setFromNode(nodeId);
    } else if (fromNode === nodeId) {
      setFromNode(null); // cancel
    } else {
      if (!edges.some(ed => ed.from === fromNode && ed.to === nodeId)) {
        setEdges(prev => [...prev, { from: fromNode, to: nodeId }]);
      }
      setFromNode(null);
    }
  }, [mode, fromNode, edges, setEdges]);

  const handleDeleteNodeClick = useCallback((e, nodeId) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteNode?.(nodeId);
    setHoveredNode(null);
  }, [onDeleteNode]);

  const handleDeleteEdge = useCallback((idx) => {
    setEdges(prev => prev.filter((_, i) => i !== idx));
  }, [setEdges]);

  const switchMode = (m) => { setMode(m); setFromNode(null); setDraggingNode(null); };

  const handleAddMerge = useCallback(() => {
    const existingMerges = nodes.filter(n => n.type === 'merge').length;
    setNodes(prev => [...prev, {
      id: `merge-${Date.now()}`,
      x: 250 + (existingMerges * 30) % 150,
      y: 100 + (existingMerges * 20) % 80,
      label: `Merge${existingMerges > 0 ? existingMerges + 1 : ''}`,
      type: 'merge',
    }]);
  }, [nodes, setNodes]);

  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';
  const btnBase = (active) => `px-2 py-1 rounded text-xs ${active
    ? 'bg-purple-600 text-white'
    : theme === 'dark' ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
  }`;

  return (
    <div className={`p-4 border-b ${borderClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-sm font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
          <span>🔀</span> {t.dagExecution}
        </h3>
        <div className="flex gap-1">
          <button onClick={() => switchMode('drag')}    className={btnBase(mode === 'drag')}>✥ Drag</button>
          <button onClick={() => switchMode('connect')} className={btnBase(mode === 'connect')}>🔗 Connect</button>
          <button onClick={handleAddMerge} className={`px-2 py-1 rounded text-xs bg-slate-600 hover:bg-slate-500 text-white`}>+ Merge</button>
        </div>
      </div>

      {/* Connect mode hint */}
      {mode === 'connect' && (
        <p className={`mb-1 text-xs ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
          {fromNode
            ? `From "${nodes.find(n => n.id === fromNode)?.label}" → click target node`
            : 'Click a node to start a connection · click × on an edge to delete it'}
        </p>
      )}

      <svg
        ref={svgRef}
        className={`w-full h-40 select-none ${mode === 'connect' ? 'cursor-crosshair' : ''}`}
        viewBox="0 0 560 200"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Edges */}
        {edges.map((edge, i) => {
          const src = nodes.find(n => n.id === edge.from);
          const dst = nodes.find(n => n.id === edge.to);
          if (!src || !dst) return null;
          const mx = (src.x + 40 + dst.x) / 2;
          const my = (src.y + dst.y) / 2;
          return (
            <g key={i}>
              <path
                d={`M ${src.x + 40} ${src.y} Q ${mx} ${my} ${dst.x} ${dst.y}`}
                stroke={theme === 'dark' ? '#6366f1' : '#818cf8'}
                strokeWidth="2"
                fill="none"
                strokeDasharray="4 2"
              />
              {/* Delete edge × button at midpoint */}
              <circle
                cx={mx} cy={my} r="8"
                fill={theme === 'dark' ? '#1e293b' : '#fff'}
                stroke={theme === 'dark' ? '#475569' : '#d1d5db'}
                strokeWidth="1"
                style={{ cursor: 'pointer' }}
                onClick={() => handleDeleteEdge(i)}
              />
              <text
                x={mx} y={my + 4}
                textAnchor="middle" fontSize="11"
                fill={theme === 'dark' ? '#94a3b8' : '#6b7280'}
                style={{ pointerEvents: 'none' }}
              >
                ×
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const isFrom    = fromNode === node.id;
          const isDrag    = draggingNode === node.id;
          const isHovered = hoveredNode === node.id;
          const deletable = node.type === 'agent' || node.type === 'merge';
          return (
            <g
              key={node.id}
              style={{ cursor: mode === 'connect' ? 'pointer' : isDrag ? 'grabbing' : 'grab' }}
              onMouseDown={e => handleMouseDown(e, node.id)}
              onClick={e => handleNodeClick(e, node.id)}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <rect
                x={node.x} y={node.y - 25} width="80" height="50" rx="8"
                fill={nodeColor(node.type, isFrom)}
                stroke={isFrom ? '#f59e0b' : isDrag ? '#fff' : 'none'}
                strokeWidth="2"
              />
              <text
                x={node.x + 40} y={node.y + 5}
                textAnchor="middle" fill="white" fontSize="10" fontWeight="500"
                style={{ pointerEvents: 'none' }}
              >
                {node.label}
              </text>
              {/* Delete node × — hover + drag mode + deletable type */}
              {deletable && isHovered && mode === 'drag' && (
                <g onClick={e => handleDeleteNodeClick(e, node.id)}>
                  <circle cx={node.x + 74} cy={node.y - 19} r="7" fill="#ef4444" style={{ cursor: 'pointer' }} />
                  <text
                    x={node.x + 74} y={node.y - 15}
                    textAnchor="middle" fontSize="9" fill="white"
                    style={{ pointerEvents: 'none' }}
                  >
                    ×
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-2 text-xs">
        {[
          { type: 'input',  label: 'Input'  },
          { type: 'agent',  label: 'Agent'  },
          { type: 'merge',  label: 'Merge'  },
          { type: 'output', label: 'Output' },
        ].map(item => (
          <div key={item.type} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: nodeColor(item.type) }} />
            <span className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AgentConfig
// ---------------------------------------------------------------------------
function AgentConfig({ template, onClose, onAgentStatusChange, createFile, selectFile, selectedFile, files, getFileContent, updateFile, theme }) {
  const [config, setConfig] = useState({
    name: template.name,
    model: template.model,
    temperature: 0.7,
    tools: template.tools,
  });
  const [userPrompt, setUserPrompt]     = useState('');
  const [running, setRunning]           = useState(false);
  const [output, setOutput]             = useState('');
  const [error, setError]               = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [writeToPath, setWriteToPath]   = useState('');
  const [writeSuccess, setWriteSuccess] = useState(false);

  const flatFiles = useMemo(() => getFlatFiles(files || {}), [files]);

  const toggleAttach = (path) =>
    setAttachedFiles(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]);

  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';
  const inputClass  = theme === 'dark'
    ? 'bg-slate-800 border-slate-600 text-slate-200 focus:border-purple-500'
    : 'bg-white border-gray-300 text-gray-800 focus:border-purple-500';

  const handleRun = useCallback(async () => {
    if (!userPrompt.trim() || running) return;
    setRunning(true);
    setOutput('');
    setError(null);
    setWriteSuccess(false);
    onAgentStatusChange?.(config.name, 'running');

    // Build file context to append to user message
    let contextBlock = '';
    if (attachedFiles.length > 0 && getFileContent) {
      contextBlock = '\n\n---\nFile context:\n' +
        attachedFiles.map(path => {
          const content = getFileContent(path) || '';
          return `\`\`\`\n// ${path}\n${content}\n\`\`\``;
        }).join('\n\n');
    }

    try {
      const result = await sendMessage({
        model: config.model,
        systemPrompt: `You are ${config.name}. ${template.description}. Available tools: ${config.tools.join(', ')}.`,
        userMessage: userPrompt + contextBlock,
        maxTokens: 1024,
        traceName: `agent.run() — ${config.name}`,
      });
      setOutput(result.text);
      onAgentStatusChange?.(config.name, 'completed');
    } catch (err) {
      setError(err.message);
      onAgentStatusChange?.(config.name, 'error');
    } finally {
      setRunning(false);
    }
  }, [userPrompt, running, config, template, attachedFiles, getFileContent]);

  const handleOpenInEditor = useCallback(() => {
    if (!output) return;
    if (selectedFile && updateFile) {
      // Overwrite the currently open IDE file
      updateFile(selectedFile, output);
      selectFile?.(selectedFile);
    } else {
      // No file open — create a new one as fallback
      const safeName = config.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const fileName = `${safeName}-output.md`;
      createFile?.('agents', fileName, output);
      selectFile?.(`agents/${fileName}`);
    }
  }, [output, selectedFile, config.name, updateFile, createFile, selectFile]);

  const handleWriteToFile = useCallback(() => {
    if (!writeToPath || !output) return;
    updateFile?.(writeToPath, output);
    selectFile?.(writeToPath);
    setWriteSuccess(true);
  }, [writeToPath, output, updateFile, selectFile]);

  return (
    <div className={`p-4 border-t ${borderClass} ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-50'} overflow-auto max-h-96`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
          <span>{template.icon}</span> Configure {template.name}
        </h3>
        <button onClick={onClose} className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}>✕</button>
      </div>

      {/* Config grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Agent Name</label>
          <input
            type="text" value={config.name}
            onChange={e => setConfig({ ...config, name: e.target.value })}
            className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`}
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Model</label>
          <select
            value={config.model}
            onChange={e => setConfig({ ...config, model: e.target.value })}
            className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`}
          >
            {LLM_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
            Temperature: {config.temperature}
          </label>
          <input
            type="range" min="0" max="1" step="0.1" value={config.temperature}
            onChange={e => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
            className="w-full accent-purple-500"
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Tools</label>
          <div className="flex flex-wrap gap-1">
            {config.tools.map(tool => (
              <span key={tool} className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">{tool}</span>
            ))}
          </div>
        </div>
      </div>

      {/* File attachment */}
      {flatFiles.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-1">
            <label className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
              📎 Attach files as context
            </label>
            <button
              onClick={() => setShowFilePicker(p => !p)}
              className={`text-xs px-2 py-0.5 rounded ${
                showFilePicker
                  ? 'bg-purple-600 text-white'
                  : theme === 'dark' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {showFilePicker ? 'Hide' : `Pick files${attachedFiles.length ? ` (${attachedFiles.length})` : ''}`}
            </button>
            {attachedFiles.length > 0 && (
              <button onClick={() => setAttachedFiles([])} className="text-xs text-red-400 hover:text-red-300">clear</button>
            )}
          </div>

          {showFilePicker && (
            <div className={`rounded-lg border max-h-32 overflow-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
              {flatFiles.map(path => (
                <label
                  key={path}
                  className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-xs transition-colors ${
                    attachedFiles.includes(path)
                      ? theme === 'dark' ? 'bg-purple-600/20 text-purple-300' : 'bg-purple-50 text-purple-700'
                      : theme === 'dark' ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={attachedFiles.includes(path)}
                    onChange={() => toggleAttach(path)}
                    className="accent-purple-500"
                  />
                  {path}
                </label>
              ))}
            </div>
          )}

          {attachedFiles.length > 0 && !showFilePicker && (
            <div className="flex flex-wrap gap-1">
              {attachedFiles.map(p => (
                <span key={p} className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 flex items-center gap-1">
                  {p.split('/').pop()}
                  <button onClick={() => toggleAttach(p)} className="opacity-60 hover:opacity-100">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Prompt */}
      <div className="mt-4">
        <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Prompt</label>
        <textarea
          value={userPrompt}
          onChange={e => setUserPrompt(e.target.value)}
          placeholder={`What should ${config.name} do?`}
          rows={3}
          className={`w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none ${inputClass}`}
        />
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={onClose}
          className={`px-4 py-2 rounded-lg text-sm ${
            theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          Cancel
        </button>
        <button
          onClick={handleRun}
          disabled={running || !userPrompt.trim()}
          className="px-4 py-2 rounded-lg text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white transition-all"
        >
          {running ? '⏳ Running...' : '▶ Run Agent'}
        </button>
      </div>

      {/* Output */}
      {(output || error) && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${
          error
            ? 'bg-red-500/10 text-red-400'
            : theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-white text-gray-800 border border-gray-200'
        }`}>
          <div className={`text-xs font-semibold mb-2 flex items-center justify-between flex-wrap gap-2 ${error ? 'text-red-400' : theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
            <span>{error ? '❌ Error' : '✅ Response'}</span>
            {output && !error && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Write to current IDE file (or create new if none open) */}
                <button
                  onClick={handleOpenInEditor}
                  className="px-2 py-0.5 rounded text-xs bg-purple-600/20 text-purple-400 hover:bg-purple-600/40 transition-colors"
                  title={selectedFile ? `Overwrite ${selectedFile}` : 'Create agents/NAME-output.md'}
                >
                  {selectedFile ? `✏️ Write to ${selectedFile.split('/').pop()}` : '📝 Open in Editor'}
                </button>
                {/* Write to existing file */}
                {flatFiles.length > 0 && (
                  <div className="flex items-center gap-1">
                    <select
                      value={writeToPath}
                      onChange={e => { setWriteToPath(e.target.value); setWriteSuccess(false); }}
                      className={`text-xs px-1 py-0.5 rounded border outline-none ${
                        theme === 'dark' ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-gray-100 border-gray-300 text-gray-700'
                      }`}
                    >
                      <option value="">Write to file…</option>
                      {flatFiles.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {writeToPath && (
                      <button
                        onClick={handleWriteToFile}
                        className={`px-2 py-0.5 rounded text-xs ${
                          writeSuccess
                            ? 'bg-green-600/20 text-green-400'
                            : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/40'
                        } transition-colors`}
                      >
                        {writeSuccess ? '✓ Saved' : '✏️ Write'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <pre className="whitespace-pre-wrap font-sans leading-relaxed">{error || output}</pre>
        </div>
      )}
    </div>
  );
}
