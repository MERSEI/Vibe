/**
 * AgentBuilder Component
 *
 * AI Agent orchestration panel with:
 * - Template gallery
 * - Drag-and-drop + connect-mode DAG editor
 * - Active agents management (add / delete)
 * - IDE file attachment and write-back
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { AGENT_TEMPLATES, LLM_MODELS, LLM_PROVIDERS, CURSOR_COLORS } from '../../utils/constants';
import { sendMessage } from '../../api/anthropic/client';
import { publishEvent } from '../../api/nats/client';

// DAG canvas dimensions
const NODE_W = 164;
const NODE_H = 62;
const VB_W   = 1400;
const VB_H   = 820;

const INITIAL_NODES = [
  { id: 'input',  x: 60,   y: 379, label: 'Input',        type: 'input'  },
  { id: 'agent1', x: 380,  y: 200, label: 'CodeReviewer', type: 'agent'  },
  { id: 'agent2', x: 380,  y: 560, label: 'DocWriter',    type: 'agent'  },
  { id: 'merge',  x: 760,  y: 379, label: 'Merge',        type: 'merge'  },
  { id: 'output', x: 1120, y: 379, label: 'Output',       type: 'output' },
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

/** Topological sort — returns execution levels (nodes at same level run in parallel) */
function topoLevels(nodes, edges) {
  const inDeg = {};
  nodes.forEach(n => (inDeg[n.id] = 0));
  edges.forEach(e => (inDeg[e.to] = (inDeg[e.to] || 0) + 1));

  let current = nodes.filter(n => inDeg[n.id] === 0).map(n => n.id);
  const levels = [];
  while (current.length) {
    levels.push(current);
    const next = [];
    current.forEach(id => {
      edges.filter(e => e.from === id).forEach(e => {
        if (--inDeg[e.to] === 0) next.push(e.to);
      });
    });
    current = next;
  }
  return levels;
}

export function AgentBuilder({ theme, t, createFile, selectFile, files, getFileContent, updateFile, selectedFile }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [agents, setAgents] = useState([
    { id: 1, name: 'CodeReviewer', model: 'claude-3-opus',   status: 'idle',    tools: ['code_analysis', 'git_diff'], provider: 'gemini', apiKey: '' },
    { id: 2, name: 'DocWriter',    model: 'claude-3-sonnet', status: 'idle',    tools: ['markdown_gen'],              provider: 'gemini', apiKey: '' },
  ]);
  const [dagNodes, setDagNodes] = useState(INITIAL_NODES);
  const [dagEdges, setDagEdges] = useState(INITIAL_EDGES);
  const [nodeStatus, setNodeStatus] = useState({});
  const [dagRunning, setDagRunning] = useState(false);
  const [dagInput,   setDagInput]   = useState('');
  const [dagOutput,  setDagOutput]  = useState(null);
  const [inputFiles,      setInputFiles]      = useState([]);
  const [showInputPicker, setShowInputPicker] = useState(false);
  const [showOutputPanel, setShowOutputPanel] = useState(false);
  const [showLeftPanel,   setShowLeftPanel]   = useState(true);

  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';

  // ---- Bidirectional agent ↔ file sync ----
  // Tracks last content we wrote so we can skip our own writes
  const agentFileSyncRef = useRef({});

  // Agent state → file: write agents/{name}.json when agents change
  useEffect(() => {
    if (!createFile) return;
    agents.forEach(agent => {
      const content = JSON.stringify(
        { name: agent.name, model: agent.model, tools: agent.tools, provider: agent.provider, apiKey: agent.apiKey },
        null, 2
      );
      if (agentFileSyncRef.current[agent.name] !== content) {
        agentFileSyncRef.current[agent.name] = content;
        createFile('agents', `${agent.name}.json`, content);
      }
    });
  }, [agents, createFile]);

  // File → agent state: update agent when user edits its JSON file in the editor
  useEffect(() => {
    if (!files) return;
    const agentFiles = files?.agents?.children ?? {};
    setAgents(prev => {
      let changed = false;
      const updated = prev.map(agent => {
        const fileNode = agentFiles[`${agent.name}.json`];
        if (!fileNode?.content) return agent;
        // Skip if this is content we wrote (prevents circular update)
        if (fileNode.content === agentFileSyncRef.current[agent.name]) return agent;
        try {
          const parsed = JSON.parse(fileNode.content);
          const newModel    = parsed.model    ?? agent.model;
          const newTools    = Array.isArray(parsed.tools) ? parsed.tools : agent.tools;
          const newProvider = parsed.provider ?? agent.provider ?? 'gemini';
          const newApiKey   = parsed.apiKey   ?? agent.apiKey   ?? '';
          if (newModel !== agent.model || JSON.stringify(newTools) !== JSON.stringify(agent.tools) ||
              newProvider !== agent.provider || newApiKey !== agent.apiKey) {
            changed = true;
            return { ...agent, model: newModel, tools: newTools, provider: newProvider, apiKey: newApiKey };
          }
        } catch {}
        return agent;
      });
      return changed ? updated : prev;
    });
  }, [files]);
  // ---- End sync ----

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

  /** Open AgentConfig for an agent from the list */
  const handleSelectAgent = useCallback((agent) => {
    setSelectedTemplate({
      id: agent.id,
      name: agent.name,
      icon: '🤖',
      description: 'Custom agent',
      model: agent.model,
      tools: agent.tools,
    });
  }, []);

  /** Apply a template: reset agents + DAG to match the template */
  const handleApplyTemplate = useCallback((tmpl) => {
    setSelectedTemplate(tmpl);
    setAgents([{
      id: 1,
      name: tmpl.name,
      model: tmpl.model,
      status: 'idle',
      tools: tmpl.tools,
      provider: 'gemini',
      apiKey: '',
    }]);
    setDagNodes([
      { id: 'input',  x: 60,   y: 379, label: 'Input',   type: 'input'  },
      { id: 'agent1', x: 530,  y: 379, label: tmpl.name, type: 'agent'  },
      { id: 'output', x: 1000, y: 379, label: 'Output',  type: 'output' },
    ]);
    setDagEdges([
      { from: 'input',  to: 'agent1' },
      { from: 'agent1', to: 'output' },
    ]);
    setDagOutput(null);
    setNodeStatus({});
    publishEvent('agents.template.apply', { templateName: tmpl.name, model: tmpl.model, tools: tmpl.tools });
  }, []);

  /** Add a new Merge node to the DAG */
  const handleAddMerge = useCallback(() => {
    setDagNodes(prev => {
      const existingMerges = prev.filter(n => n.type === 'merge').length;
      return [...prev, {
        id: `merge-${Date.now()}`,
        x: 250 + (existingMerges * 30) % 150,
        y: 100 + (existingMerges * 20) % 80,
        label: `Merge${existingMerges > 0 ? existingMerges + 1 : ''}`,
        type: 'merge',
      }];
    });
  }, []);

  /** Run the DAG — execute levels in sequence, parallel within each level */
  const runDAG = useCallback(async (userInput) => {
    setDagRunning(true);
    setDagOutput(null);
    setNodeStatus({});
    const outputs = {};
    publishEvent('agents.dag.start', { nodeCount: dagNodes.length, edgeCount: dagEdges.length, inputFile: inputFiles[0] || null });

    for (const level of topoLevels(dagNodes, dagEdges)) {
      await Promise.all(level.map(async nodeId => {
        const node = dagNodes.find(n => n.id === nodeId);
        if (!node) return;

        const upstreamText = dagEdges
          .filter(e => e.to === nodeId)
          .map(e => outputs[e.from] ?? '')
          .join('\n\n---\n\n');

        if (node.type === 'input') {
        const fileContents = inputFiles.map(path => {
          const content = getFileContent?.(path);
          return content ? `// ${path}\n${content}` : '';
        }).filter(Boolean).join('\n\n');
        outputs[nodeId] = fileContents ? `${fileContents}\n\n${userInput}` : userInput;
        return;
      }
        if (node.type === 'merge')  { outputs[nodeId] = upstreamText; return; }
        if (node.type === 'output') { outputs[nodeId] = upstreamText; setDagOutput(upstreamText); return; }

        if (node.type === 'agent') {
          const agent = agents.find(a => a.name === node.label);
          if (!agent) return;
          setNodeStatus(prev => ({ ...prev, [nodeId]: 'running' }));
          publishEvent('agents.dag.node.start', { nodeId, nodeLabel: node.label, nodeType: node.type, agentModel: agent.model });
          try {
            const res = await sendMessage({
              model: agent.model,
              systemPrompt: `You are ${agent.name}. Tools: ${agent.tools.join(', ')}`,
              userMessage: upstreamText || userInput,
              traceName: `agent.${agent.name}`,
              apiKey: agent.apiKey || undefined,
              provider: agent.provider || 'gemini',
            });
            outputs[nodeId] = res.text;
            setNodeStatus(prev => ({ ...prev, [nodeId]: 'completed' }));
            publishEvent('agents.dag.node.complete', { nodeId, nodeLabel: node.label, outputLength: res.text?.length ?? 0 });
          } catch (e) {
            outputs[nodeId] = `Error: ${e.message}`;
            setNodeStatus(prev => ({ ...prev, [nodeId]: 'error' }));
            publishEvent('agents.dag.node.error', { nodeId, nodeLabel: node.label, error: e.message });
          }
        }
      }));
    }
    setDagRunning(false);
    publishEvent('agents.dag.complete', { nodeCount: dagNodes.length, success: true });
  }, [dagNodes, dagEdges, agents, inputFiles, getFileContent]);

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
      <div className={`border-r ${borderClass} flex flex-col transition-all duration-200 overflow-hidden ${showLeftPanel ? 'w-80' : 'w-0'}`}>
        <TemplateGallery
          templates={AGENT_TEMPLATES}
          selectedTemplate={selectedTemplate}
          onSelect={handleApplyTemplate}
          theme={theme}
          t={t}
        />
        <AgentList
          agents={agents}
          onAddAgent={handleAddAgent}
          onDeleteAgent={handleDeleteAgent}
          onSelectAgent={handleSelectAgent}
          theme={theme}
          t={t}
        />
      </div>

      {/* Right Panel — DAG + Config */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <DAGVisualization
          nodes={dagNodes}
          setNodes={setDagNodes}
          edges={dagEdges}
          setEdges={setDagEdges}
          onDeleteNode={handleDeleteDagNode}
          onAddMerge={handleAddMerge}
          nodeStatuses={nodeStatus}
          onRun={runDAG}
          dagRunning={dagRunning}
          dagInput={dagInput}
          setDagInput={setDagInput}
          dagOutput={dagOutput}
          files={files}
          inputFiles={inputFiles}
          onInputNodeClick={() => setShowInputPicker(true)}
          onOutputNodeClick={() => dagOutput && setShowOutputPanel(true)}
          showLeftPanel={showLeftPanel}
          onToggleLeftPanel={() => setShowLeftPanel(!showLeftPanel)}
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
            onUpdateAgentKeys={(name, provider, apiKey) =>
              setAgents(prev => prev.map(a => a.name === name ? { ...a, provider, apiKey } : a))
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

        {/* Input file picker modal */}
        {showInputPicker && (
          <InputFilePicker
            files={files}
            selected={inputFiles}
            onSelect={setInputFiles}
            onClose={() => setShowInputPicker(false)}
            theme={theme}
          />
        )}

        {/* Output viewer modal */}
        {showOutputPanel && dagOutput && (
          <OutputViewer
            output={dagOutput}
            onClose={() => setShowOutputPanel(false)}
            createFile={createFile}
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
function AgentList({ agents, onAddAgent, onDeleteAgent, onSelectAgent, theme, t }) {
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
            className={`group p-3 rounded-lg flex flex-col gap-1 cursor-pointer transition-all ${
              theme === 'dark'
                ? 'bg-slate-800/50 border border-slate-700 hover:border-purple-500/50'
                : 'bg-gray-50 border border-gray-200 hover:border-purple-300'
            }`}
            onClick={() => onSelectAgent?.(agent)}
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
                  onClick={(e) => { e.stopPropagation(); onDeleteAgent?.(agent.name); }}
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
const NODE_META = {
  input:  { bg: '#059669', label: 'INPUT',  glyph: '▶' },
  agent:  { bg: '#7c3aed', label: 'AGENT',  glyph: '✦' },
  merge:  { bg: '#475569', label: 'MERGE',  glyph: '⊕' },
  output: { bg: '#dc2626', label: 'OUTPUT', glyph: '■' },
};

const STATUS_STROKE = { running: '#3b82f6', completed: '#22c55e', error: '#ef4444' };

function DAGVisualization({ nodes, setNodes, edges, setEdges, onDeleteNode, onAddMerge,
  nodeStatuses, onRun, dagRunning, dagInput, setDagInput, dagOutput,
  files, inputFiles, onInputNodeClick, onOutputNodeClick,
  showLeftPanel, onToggleLeftPanel, theme, t }) {
  const [mode, setMode] = useState('drag');
  const [fromNode, setFromNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);
  const isDark = theme === 'dark';

  const toSVG = useCallback((cx, cy) => {
    const svg = svgRef.current;
    if (!svg) return { x: cx, y: cy };
    const r = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    return {
      x: ((cx - r.left) / r.width) * vb.width,
      y: ((cy - r.top) / r.height) * vb.height,
    };
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
        ? { ...n,
            x: Math.max(0, Math.min(VB_W - NODE_W, pt.x - dragOffset.x)),
            y: Math.max(0, Math.min(VB_H - NODE_H, pt.y - dragOffset.y)),
          }
        : n
    ));
  }, [draggingNode, dragOffset, toSVG, setNodes]);

  const handleMouseUp = useCallback(() => setDraggingNode(null), []);

  const handleNodeClick = useCallback((e, nodeId) => {
    e.stopPropagation();
    if (mode !== 'connect') {
      // drag mode: Input/Output node special actions
      const node = nodes.find(n => n.id === nodeId);
      if (node?.type === 'input')  { onInputNodeClick?.(); return; }
      if (node?.type === 'output') { onOutputNodeClick?.(); return; }
      return;
    }
    if (!fromNode) {
      setFromNode(nodeId);
    } else if (fromNode === nodeId) {
      setFromNode(null);
    } else {
      if (!edges.some(ed => ed.from === fromNode && ed.to === nodeId)) {
        setEdges(prev => [...prev, { from: fromNode, to: nodeId }]);
      }
      setFromNode(null);
    }
  }, [mode, fromNode, edges, setEdges, nodes, onInputNodeClick, onOutputNodeClick]);

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

  const toolBtn = (active) =>
    `px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
      active
        ? 'bg-purple-600 text-white'
        : isDark
          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
    }`;

  return (
    <div className={`shrink-0 flex flex-col border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`} style={{ minHeight: 520 }}>
      {/* Toolbar */}
      <div className={`shrink-0 px-4 py-2 flex items-center justify-between ${isDark ? 'bg-slate-900/80 border-b border-slate-700/60' : 'bg-gray-50 border-b border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
            🔀 {t.dagExecution}
          </span>
          {mode === 'connect' && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
              {fromNode
                ? `"${nodes.find(n => n.id === fromNode)?.label}" → click target`
                : 'Click source node to start edge'}
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          <button onClick={onToggleLeftPanel} className={toolBtn(false)} title="Toggle templates panel">
            {showLeftPanel ? '◀' : '▶ Templates'}
          </button>
          <button onClick={() => switchMode('drag')}    className={toolBtn(mode === 'drag')}>✥ Drag</button>
          <button onClick={() => switchMode('connect')} className={toolBtn(mode === 'connect')}>🔗 Connect</button>
          <button onClick={onAddMerge}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
            + Merge
          </button>
          <button
            onClick={() => onRun?.(dagInput)}
            disabled={dagRunning}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              dagRunning ? 'bg-purple-400/50 text-white cursor-wait' : 'bg-purple-600 hover:bg-purple-500 text-white'
            }`}
          >
            {dagRunning ? '⏳ Running...' : '▶ Run'}
          </button>
        </div>
      </div>

      {/* Run input */}
      <div className={`shrink-0 px-4 py-2 border-b flex gap-2 ${isDark ? 'bg-slate-900/80 border-slate-700/60' : 'bg-gray-50 border-gray-200'}`}>
        <input
          value={dagInput}
          onChange={e => setDagInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !dagRunning && onRun?.(dagInput)}
          placeholder="Enter prompt and press ▶ Run..."
          className={`flex-1 px-3 py-1.5 rounded text-sm outline-none border ${
            isDark
              ? 'bg-slate-800 border-slate-600 text-slate-200 placeholder-slate-500'
              : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
          }`}
        />
      </div>

      {/* Canvas — wrapper lets SVG fill flex space reliably */}
      <div className="flex-1 min-h-0 relative" style={{ minHeight: 440 }}>
      <svg
        ref={svgRef}
        className={`absolute inset-0 w-full h-full select-none ${mode === 'connect' ? 'cursor-crosshair' : ''}`}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <pattern id="dag-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill={isDark ? '#334155' : '#d1d5db'} />
          </pattern>
          <marker id="dag-arr" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={isDark ? '#6366f1' : '#818cf8'} />
          </marker>
          {nodes.map(n => (
            <clipPath key={`clip-${n.id}`} id={`nclip-${n.id}`}>
              <rect x={n.x} y={n.y} width={NODE_W} height={NODE_H} rx="10" />
            </clipPath>
          ))}
        </defs>

        {/* Background */}
        <rect width={VB_W} height={VB_H} fill={isDark ? '#0f172a' : '#f8fafc'} />
        <rect width={VB_W} height={VB_H} fill="url(#dag-dots)" />

        {/* Edges */}
        {edges.map((edge, i) => {
          const src = nodes.find(n => n.id === edge.from);
          const dst = nodes.find(n => n.id === edge.to);
          if (!src || !dst) return null;
          const x1 = src.x + NODE_W, y1 = src.y + NODE_H / 2;
          const x2 = dst.x,          y2 = dst.y + NODE_H / 2;
          const cp = Math.max(50, Math.abs(x2 - x1) * 0.45);
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
          return (
            <g key={i}>
              <path
                d={`M ${x1} ${y1} C ${x1+cp} ${y1}, ${x2-cp} ${y2}, ${x2} ${y2}`}
                stroke={isDark ? '#6366f1' : '#818cf8'}
                strokeWidth="2"
                fill="none"
                markerEnd="url(#dag-arr)"
              />
              {/* Hit area for delete */}
              <circle cx={mx} cy={my} r="10" fill="transparent"
                style={{ cursor: 'pointer' }} onClick={() => handleDeleteEdge(i)} />
              {/* × badge */}
              <circle cx={mx} cy={my} r="7" fill={isDark ? '#1e293b' : '#fff'}
                stroke={isDark ? '#475569' : '#e2e8f0'} strokeWidth="1"
                style={{ pointerEvents: 'none' }} />
              <text x={mx} y={my} textAnchor="middle" fontSize="10"
                fill={isDark ? '#94a3b8' : '#6b7280'} dominantBaseline="central"
                style={{ pointerEvents: 'none' }}>×</text>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const isFrom     = fromNode === node.id;
          const isDragging = draggingNode === node.id;
          const isHovered  = hoveredNode === node.id;
          const deletable  = node.type === 'agent' || node.type === 'merge';
          const meta       = NODE_META[node.type] ?? NODE_META.merge;
          const nx = node.x, ny = node.y;
          const statusStroke = nodeStatuses?.[node.id] ? STATUS_STROKE[nodeStatuses[node.id]] : null;

          return (
            <g
              key={node.id}
              style={{ cursor: mode === 'connect' ? 'pointer' : isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={e => handleMouseDown(e, node.id)}
              onClick={e => handleNodeClick(e, node.id)}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* Drop shadow */}
              <rect x={nx+2} y={ny+3} width={NODE_W} height={NODE_H} rx="10"
                fill={isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.08)'} />
              {/* Card body */}
              <rect x={nx} y={ny} width={NODE_W} height={NODE_H} rx="10"
                fill={isDark ? '#1e293b' : '#ffffff'}
                stroke={statusStroke ?? (isFrom ? '#f59e0b' : isHovered ? meta.bg : isDark ? '#334155' : '#e2e8f0')}
                strokeWidth={statusStroke ? 2.5 : (isFrom || isHovered ? 2 : 1)}
              />
              {/* Left accent bar */}
              <rect x={nx} y={ny} width="6" height={NODE_H}
                fill={meta.bg} clipPath={`url(#nclip-${node.id})`} />
              {/* Icon circle */}
              <circle cx={nx+28} cy={ny+NODE_H/2} r="13"
                fill={meta.bg + '20'} stroke={meta.bg + '50'} strokeWidth="1" />
              <text x={nx+28} y={ny+NODE_H/2} textAnchor="middle" fontSize="14"
                fill={meta.bg} dominantBaseline="central"
                style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {meta.glyph}
              </text>
              {/* Node label */}
              <text x={nx+50} y={ny+NODE_H/2-8}
                fill={isDark ? '#f1f5f9' : '#0f172a'}
                fontSize="13" fontWeight="600" dominantBaseline="middle"
                style={{ pointerEvents: 'none' }}>
                {node.label.length > 12 ? node.label.slice(0, 11) + '…' : node.label}
              </text>
              {/* Type badge */}
              <rect x={nx+50} y={ny+NODE_H/2+4} width={58} height={14} rx="4"
                fill={meta.bg + '22'} />
              <text x={nx+79} y={ny+NODE_H/2+11}
                textAnchor="middle" fill={meta.bg} fontSize="9" fontWeight="700"
                dominantBaseline="middle" style={{ pointerEvents: 'none' }}>
                {meta.label}
              </text>
              {/* Connection ports */}
              <circle cx={nx+NODE_W} cy={ny+NODE_H/2} r="5"
                fill={isFrom ? '#f59e0b' : meta.bg}
                stroke={isDark ? '#0f172a' : '#fff'} strokeWidth="1.5" />
              <circle cx={nx} cy={ny+NODE_H/2} r="5"
                fill={meta.bg} stroke={isDark ? '#0f172a' : '#fff'} strokeWidth="1.5" />
              {/* Input node: files attached badge */}
              {node.type === 'input' && inputFiles?.length > 0 && (
                <text x={nx + NODE_W / 2} y={ny - 7} textAnchor="middle" fontSize="9"
                  fill="#059669" dominantBaseline="central" style={{ pointerEvents: 'none' }}>
                  📎 {inputFiles.length} file{inputFiles.length > 1 ? 's' : ''}
                </text>
              )}
              {/* Output node: view results badge */}
              {node.type === 'output' && dagOutput && (
                <text x={nx + NODE_W / 2} y={ny - 7} textAnchor="middle" fontSize="9"
                  fill="#22c55e" dominantBaseline="central" style={{ pointerEvents: 'none' }}>
                  📤 View
                </text>
              )}
              {/* Delete × button */}
              {deletable && isHovered && mode === 'drag' && (
                <g onClick={e => handleDeleteNodeClick(e, node.id)}>
                  <circle cx={nx+NODE_W-9} cy={ny+9} r="9" fill="#ef4444"
                    style={{ cursor: 'pointer' }} />
                  <text x={nx+NODE_W-9} y={ny+9} textAnchor="middle" fontSize="11"
                    fill="white" dominantBaseline="central"
                    style={{ pointerEvents: 'none' }}>×</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend — absolute overlay at bottom of canvas */}
      <div className={`absolute bottom-0 left-0 right-0 px-4 py-1.5 flex items-center gap-4 pointer-events-none ${
        isDark ? 'bg-gradient-to-t from-slate-950/80 to-transparent' : 'bg-gradient-to-t from-white/80 to-transparent'
      }`}>
        {Object.entries(NODE_META).map(([type, meta]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.bg }} />
            <span className={`text-xs capitalize ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{type}</span>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AgentConfig
// ---------------------------------------------------------------------------
function AgentConfig({ template, onClose, onAgentStatusChange, onUpdateAgentKeys, createFile, selectFile, selectedFile, files, getFileContent, updateFile, theme }) {
  const [config, setConfig] = useState({
    name: template.name,
    model: template.model,
    temperature: 0.7,
    tools: template.tools,
  });
  const [localProvider, setLocalProvider] = useState(template.provider ?? 'gemini');
  const [localApiKey,   setLocalApiKey]   = useState(template.apiKey   ?? '');
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
      onUpdateAgentKeys?.(config.name, localProvider, localApiKey);
      const result = await sendMessage({
        model: config.model,
        systemPrompt: `You are ${config.name}. ${template.description}. Available tools: ${config.tools.join(', ')}.`,
        userMessage: userPrompt + contextBlock,
        maxTokens: 1024,
        traceName: `agent.run() — ${config.name}`,
        apiKey: localApiKey || undefined,
        provider: localProvider,
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
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Provider & API Key</label>
          <div className="flex gap-2">
            <select
              value={localProvider}
              onChange={e => setLocalProvider(e.target.value)}
              className={`w-28 px-2 py-1.5 rounded-lg border text-sm outline-none ${inputClass}`}
            >
              {LLM_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input
              type="password"
              value={localApiKey}
              onChange={e => setLocalApiKey(e.target.value)}
              placeholder={LLM_PROVIDERS.find(p => p.id === localProvider)?.placeholder ?? 'API key...'}
              className={`flex-1 px-2 py-1.5 rounded-lg border text-sm outline-none ${inputClass}`}
            />
          </div>
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

// ---------------------------------------------------------------------------
// InputFilePicker — modal to select files from the file tree for Input node
// ---------------------------------------------------------------------------
function getFlatPaths(tree, prefix = '') {
  const paths = [];
  if (!tree) return paths;
  for (const [name, item] of Object.entries(tree)) {
    const p = prefix ? `${prefix}/${name}` : name;
    if (item.type === 'folder' && item.children) {
      paths.push(...getFlatPaths(item.children, p));
    } else if (item.type !== 'folder') {
      paths.push(p);
    }
  }
  return paths;
}

function InputFilePicker({ files, selected, onSelect, onClose, theme }) {
  const isDark = theme === 'dark';
  const allPaths = getFlatPaths(files);
  const [checked, setChecked] = useState(new Set(selected));

  const toggle = (path) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const commit = () => {
    onSelect([...checked]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`w-96 max-h-[70vh] flex flex-col rounded-xl shadow-2xl border ${
        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
      }`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between ${
          isDark ? 'border-slate-700' : 'border-gray-200'
        }`}>
          <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
            📎 Attach files to Input
          </span>
          <button onClick={onClose} className={`text-xs px-2 py-1 rounded ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>✕</button>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {allPaths.length === 0 ? (
            <p className={`text-xs p-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No files in project</p>
          ) : allPaths.map(path => (
            <label key={path} className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm ${
              isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-50 text-gray-700'
            }`}>
              <input type="checkbox" checked={checked.has(path)} onChange={() => toggle(path)} className="accent-purple-500" />
              <span className="truncate">{path}</span>
            </label>
          ))}
        </div>
        <div className={`px-4 py-3 border-t flex justify-end gap-2 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <button onClick={onClose} className={`px-3 py-1.5 rounded text-xs ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>Cancel</button>
          <button onClick={commit} className="px-3 py-1.5 rounded text-xs bg-purple-600 hover:bg-purple-500 text-white">
            Attach {checked.size > 0 ? `(${checked.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OutputViewer — modal to view DAG execution results
// ---------------------------------------------------------------------------
function OutputViewer({ output, onClose, createFile, theme }) {
  const isDark = theme === 'dark';
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!createFile || !output) return;
    const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    createFile('AgentsOutputs', `output-${ts}.md`, output);
    setSaved(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`w-[640px] max-h-[80vh] flex flex-col rounded-xl shadow-2xl border ${
        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
      }`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between ${
          isDark ? 'border-slate-700' : 'border-gray-200'
        }`}>
          <span className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
            📤 DAG Execution Output
          </span>
          <button onClick={onClose} className={`text-xs px-2 py-1 rounded ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}>✕</button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre className={`text-xs whitespace-pre-wrap leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
            {output}
          </pre>
        </div>
        <div className={`px-4 py-3 border-t flex justify-end gap-2 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          {createFile && (
            <button
              onClick={handleSave}
              disabled={saved}
              className={`px-3 py-1.5 rounded text-xs transition-colors ${
                saved
                  ? 'bg-green-600/20 text-green-400 cursor-default'
                  : isDark
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {saved ? '✓ Saved' : '💾 Save to AgentsOutputs/'}
            </button>
          )}
          <button onClick={onClose} className="px-3 py-1.5 rounded text-xs bg-purple-600 hover:bg-purple-500 text-white">Close</button>
        </div>
      </div>
    </div>
  );
}
