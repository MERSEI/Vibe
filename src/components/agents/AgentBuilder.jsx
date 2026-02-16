/**
 * AgentBuilder Component
 *
 * AI Agent orchestration panel with:
 * - Template gallery
 * - Drag-and-drop DAG editor
 * - Active agents management
 *
 * Production integration points:
 * - LangChain.js for actual agent execution
 * - NATS for message bus
 */

import React, { useState, useCallback, useRef } from 'react';
import { AGENT_TEMPLATES, LLM_MODELS, CURSOR_COLORS } from '../../utils/constants';
import { sendMessage } from '../../api/anthropic/client';
const INITIAL_NODES = [
  { id: 'input', x: 50, y: 100, label: 'Input', type: 'input' },
  { id: 'agent1', x: 200, y: 50, label: 'CodeReviewer', type: 'agent' },
  { id: 'agent2', x: 200, y: 150, label: 'DocWriter', type: 'agent' },
  { id: 'merge', x: 350, y: 100, label: 'Merge', type: 'merge' },
  { id: 'output', x: 500, y: 100, label: 'Output', type: 'output' },
];

const INITIAL_EDGES = [
  { from: 'input', to: 'agent1' },
  { from: 'input', to: 'agent2' },
  { from: 'agent1', to: 'merge' },
  { from: 'agent2', to: 'merge' },
  { from: 'merge', to: 'output' },
];

export function AgentBuilder({ theme, t, createFile, selectFile }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [agents, setAgents] = useState([
    { id: 1, name: 'CodeReviewer', model: 'claude-3-opus', status: 'idle', tools: ['code_analysis', 'git_diff'] },
    { id: 2, name: 'DocWriter', model: 'claude-3-sonnet', status: 'running', tools: ['markdown_gen'] },
    { id: 3, name: 'TestGenerator', model: 'claude-3-haiku', status: 'completed', tools: ['test_runner'] },
  ]);
  const [dagNodes, setDagNodes] = useState(INITIAL_NODES);

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

  return (
    <div className="h-full flex">
      {/* Left Panel - Templates & Agents */}
      <div className={`w-80 border-r ${borderClass} flex flex-col`}>
        {/* Templates */}
        <TemplateGallery
          templates={AGENT_TEMPLATES}
          selectedTemplate={selectedTemplate}
          onSelect={setSelectedTemplate}
          theme={theme}
          t={t}
        />

        {/* Active Agents */}
        <AgentList
          agents={agents}
          onAddAgent={handleAddAgent}
          theme={theme}
          t={t}
        />
      </div>

      {/* Right Panel - DAG Visualization with drag-and-drop */}
      <div className="flex-1 flex flex-col">
        <DAGVisualization nodes={dagNodes} setNodes={setDagNodes} theme={theme} t={t} />

        {/* Agent Details / Config */}
        {selectedTemplate && (
          <AgentConfig
            template={selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
            onAgentStatusChange={(name, status) =>
              setAgents((prev) => prev.map((a) => a.name === name ? { ...a, status } : a))
            }
            createFile={createFile}
            selectFile={selectFile}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
}

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
            className={`p-3 rounded-lg text-left transition-all ${
              selectedTemplate?.id === tmpl.id
                ? 'bg-purple-600/20 border-purple-500'
                : theme === 'dark'
                  ? 'bg-slate-800/50 hover:bg-slate-700/50 border-slate-700'
                  : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
            } border`}
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

function AgentList({ agents, onAddAgent, theme, t }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newModel, setNewModel] = useState(LLM_MODELS[0]?.id || 'claude-3-opus');

  const statusColors = {
    idle: 'bg-slate-500/20 text-slate-400',
    running: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-green-500/20 text-green-400',
    error: 'bg-red-500/20 text-red-400',
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
            className={`p-3 rounded-lg ${
              theme === 'dark' ? 'bg-slate-800/50 border border-slate-700' : 'bg-gray-50 border border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white"
                  style={{ backgroundColor: CURSOR_COLORS[i % CURSOR_COLORS.length] }}
                >
                  {agent.name.charAt(0)}
                </div>
                <span className={`font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-800'}`}>
                  {agent.name}
                </span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[agent.status]}`}>
                {t.agentStatus[agent.status]}
              </span>
            </div>
            <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
              Model: {agent.model}{agent.tools.length > 0 ? ` • Tools: ${agent.tools.join(', ')}` : ''}
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
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCommit(); if (e.key === 'Escape') setShowAddForm(false); }}
              placeholder="Agent name"
              className={inputClass}
            />
            <select value={newModel} onChange={(e) => setNewModel(e.target.value)} className={inputClass}>
              {LLM_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
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
          className={`mt-3 w-full py-2 rounded-lg text-xs border-dashed border ${
            theme === 'dark'
              ? 'border-slate-600 text-slate-400 hover:border-purple-500 hover:text-purple-400'
              : 'border-gray-300 text-gray-500 hover:border-purple-400 hover:text-purple-500'
          } transition-colors`}
        >
          + Add Agent
        </button>
      )}
    </div>
  );
}

function DAGVisualization({ nodes, setNodes, theme, t }) {
  const [edges] = useState(INITIAL_EDGES);
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  const getNodeColor = (type) => {
    const colors = {
      input: theme === 'dark' ? '#059669' : '#34d399',
      agent: theme === 'dark' ? '#7c3aed' : '#a78bfa',
      merge: theme === 'dark' ? '#475569' : '#94a3b8',
      output: theme === 'dark' ? '#dc2626' : '#f87171',
    };
    return colors[type] || colors.merge;
  };

  const getSVGPoint = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    return {
      x: ((clientX - rect.left) / rect.width) * viewBox.width,
      y: ((clientY - rect.top) / rect.height) * viewBox.height,
    };
  }, []);

  const handleMouseDown = useCallback((e, nodeId) => {
    e.preventDefault();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const pt = getSVGPoint(e.clientX, e.clientY);
    setDraggingNode(nodeId);
    setDragOffset({ x: pt.x - node.x, y: pt.y - node.y });
  }, [nodes, getSVGPoint]);

  const handleMouseMove = useCallback((e) => {
    if (!draggingNode) return;
    const pt = getSVGPoint(e.clientX, e.clientY);
    setNodes(prev => prev.map(n =>
      n.id === draggingNode
        ? { ...n, x: Math.max(0, Math.min(480, pt.x - dragOffset.x)), y: Math.max(25, Math.min(175, pt.y - dragOffset.y)) }
        : n
    ));
  }, [draggingNode, dragOffset, getSVGPoint]);

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null);
  }, []);

  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';

  return (
    <div className={`p-4 border-b ${borderClass}`}>
      <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
        <span>🔀</span> {t.dagExecution}
        <span className={`text-xs font-normal ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
          (drag nodes to rearrange)
        </span>
      </h3>

      <svg
        ref={svgRef}
        className="w-full h-40 select-none"
        viewBox="0 0 560 200"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Edges */}
        {edges.map((edge, i) => {
          const from = nodes.find(n => n.id === edge.from);
          const to = nodes.find(n => n.id === edge.to);
          if (!from || !to) return null;

          return (
            <path
              key={i}
              d={`M ${from.x + 40} ${from.y} Q ${(from.x + to.x) / 2 + 40} ${(from.y + to.y) / 2} ${to.x} ${to.y}`}
              stroke={theme === 'dark' ? '#6366f1' : '#818cf8'}
              strokeWidth="2"
              fill="none"
              strokeDasharray="4 2"
              className="animate-pulse"
            />
          );
        })}

        {/* Nodes (draggable) */}
        {nodes.map(node => (
          <g
            key={node.id}
            className={`${draggingNode === node.id ? 'cursor-grabbing' : 'cursor-grab'} hover:opacity-80 transition-opacity`}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
          >
            <rect
              x={node.x}
              y={node.y - 25}
              width="80"
              height="50"
              rx="8"
              fill={getNodeColor(node.type)}
              stroke={draggingNode === node.id ? '#fff' : 'none'}
              strokeWidth="2"
            />
            <text
              x={node.x + 40}
              y={node.y + 5}
              textAnchor="middle"
              fill="white"
              fontSize="10"
              fontWeight="500"
              style={{ pointerEvents: 'none' }}
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="flex justify-center gap-4 mt-2 text-xs">
        {[
          { type: 'input', label: 'Input' },
          { type: 'agent', label: 'Agent' },
          { type: 'merge', label: 'Merge' },
          { type: 'output', label: 'Output' },
        ].map(item => (
          <div key={item.type} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: getNodeColor(item.type) }}
            />
            <span className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentConfig({ template, onClose, onAgentStatusChange, createFile, selectFile, theme }) {

  const [config, setConfig] = useState({
    name: template.name,
    model: template.model,
    temperature: 0.7,
    tools: template.tools,
  });
  const [userPrompt, setUserPrompt] = useState('');
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState(null);

  const handleOpenInEditor = useCallback(() => {
    if (!output) return;
    const safeName = config.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const fileName = `${safeName}-output.md`;
    createFile('agents', fileName, output);
    selectFile(`agents/${fileName}`);
  }, [output, config.name, createFile, selectFile]);

  const borderClass = theme === 'dark' ? 'border-slate-700' : 'border-gray-200';
  const inputClass = theme === 'dark'
    ? 'bg-slate-800 border-slate-600 text-slate-200 focus:border-purple-500'
    : 'bg-white border-gray-300 text-gray-800 focus:border-purple-500';

  const handleRun = useCallback(async () => {
    if (!userPrompt.trim() || running) return;
    setRunning(true);
    setOutput('');
    setError(null);
    onAgentStatusChange?.(config.name, 'running');
    try {
      const result = await sendMessage({
        model: config.model,
        systemPrompt: `You are ${config.name}. ${template.description}. Available tools: ${config.tools.join(', ')}.`,
        userMessage: userPrompt,
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
  }, [userPrompt, running, config, template]);

  return (
    <div className={`p-4 border-t ${borderClass} ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-gray-50'} overflow-auto max-h-96`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
          <span>{template.icon}</span> Configure {template.name}
        </h3>
        <button
          onClick={onClose}
          className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
            Agent Name
          </label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => setConfig({ ...config, name: e.target.value })}
            className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`}
          />
        </div>

        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
            Model
          </label>
          <select
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
            className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${inputClass}`}
          >
            {LLM_MODELS.map(model => (
              <option key={model.id} value={model.id}>{model.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
            Temperature: {config.temperature}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={config.temperature}
            onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
            className="w-full accent-purple-500"
          />
        </div>

        <div>
          <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
            Tools
          </label>
          <div className="flex flex-wrap gap-1">
            {config.tools.map(tool => (
              <span
                key={tool}
                className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Prompt input */}
      <div className="mt-4">
        <label className={`block text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
          Prompt
        </label>
        <textarea
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
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
          <div className={`text-xs font-semibold mb-1 flex items-center justify-between ${error ? 'text-red-400' : theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
            <span>{error ? '❌ Error' : '✅ Response'}</span>
            {output && !error && (
              <button
                onClick={handleOpenInEditor}
                className="px-2 py-0.5 rounded text-xs bg-purple-600/20 text-purple-400 hover:bg-purple-600/40 transition-colors"
              >
                📝 Open in Editor
              </button>
            )}
          </div>
          <pre className="whitespace-pre-wrap font-sans leading-relaxed">{error || output}</pre>
        </div>
      )}
    </div>
  );
}
