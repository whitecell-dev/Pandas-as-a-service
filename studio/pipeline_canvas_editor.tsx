import React, { useState, useCallback, useEffect } from 'react';
import { Download, Upload, Play, Square, Zap, Share2, MessageSquare, Clock, Save } from 'lucide-react';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

const SERVICE_TYPES = {
  connector: { 
    color: 'bg-blue-500', 
    icon: '🔌',
    label: 'Connector',
    defaultSpec: { url: '', outputKey: '' }
  },
  processor: { 
    color: 'bg-purple-500', 
    icon: '⚙️',
    label: 'Processor',
    defaultSpec: { inputKey: '', outputKey: '', transform: [] }
  },
  monitor: { 
    color: 'bg-yellow-500', 
    icon: '👁️',
    label: 'Monitor',
    defaultSpec: { checks: [], emit: 'onChange' }
  },
  adapter: { 
    color: 'bg-green-500', 
    icon: '📤',
    label: 'Adapter',
    defaultSpec: { kind: 'webhook', url: '' }
  },
  aggregator: { 
    color: 'bg-orange-500', 
    icon: '📊',
    label: 'Aggregator',
    defaultSpec: { inputKey: '', window: { size_sec: 30 } }
  },
  vault: { 
    color: 'bg-red-500', 
    icon: '🔐',
    label: 'Vault',
    defaultSpec: { provider: '', secrets: [] }
  }
};

// ============================================================================
// MAIN CANVAS EDITOR COMPONENT
// ============================================================================

export default function PipelineEditor() {
  const [spc, setSpc] = useState({
    spc_version: "1.0",
    meta: { name: "Untitled Pipeline", created_at: new Date().toISOString() },
    services: {},
    state: {}
  });
  
  const [selectedService, setSelectedService] = useState(null);
  const [viewMode, setViewMode] = useState('split'); // 'canvas', 'json', 'split'
  const [isRunning, setIsRunning] = useState(false);
  const [executionLog, setExecutionLog] = useState([]);
  const [jsonError, setJsonError] = useState(null);
  const [canvasNodes, setCanvasNodes] = useState([]);
  const [connections, setConnections] = useState([]);

  // Sync SPC to Canvas Nodes
  useEffect(() => {
    const nodes = Object.entries(spc.services).map(([id, service], idx) => ({
      id,
      type: service.type,
      title: service.title || id,
      spec: service.spec,
      status: service.status || 'stopped',
      position: service.position || { x: 100 + (idx % 3) * 250, y: 100 + Math.floor(idx / 3) * 150 }
    }));
    setCanvasNodes(nodes);

    // Extract connections from inputKey references
    const conns = [];
    Object.entries(spc.services).forEach(([targetId, service]) => {
      if (service.spec?.inputKey) {
        const sourceKey = service.spec.inputKey.replace(/_data$|_output$/, '');
        if (spc.services[sourceKey]) {
          conns.push({ source: sourceKey, target: targetId });
        }
      }
    });
    setConnections(conns);
  }, [spc]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const addService = (type) => {
    const id = `${type}-${Date.now()}`;
    const newService = {
      id,
      type,
      title: `${SERVICE_TYPES[type].label} ${Object.keys(spc.services).length + 1}`,
      spec: { ...SERVICE_TYPES[type].defaultSpec },
      status: 'stopped',
      position: { x: 100, y: 100 }
    };

    setSpc(prev => ({
      ...prev,
      services: { ...prev.services, [id]: newService }
    }));
    setSelectedService(id);
  };

  const updateService = (id, updates) => {
    setSpc(prev => ({
      ...prev,
      services: {
        ...prev.services,
        [id]: { ...prev.services[id], ...updates }
      }
    }));
  };

  const deleteService = (id) => {
    setSpc(prev => {
      const newServices = { ...prev.services };
      delete newServices[id];
      return { ...prev, services: newServices };
    });
    if (selectedService === id) setSelectedService(null);
  };

  const moveNode = (id, position) => {
    updateService(id, { position });
  };

  const exportSPC = () => {
    const blob = new Blob([JSON.stringify(spc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spc.meta.name.replace(/\s+/g, '-').toLowerCase()}.spc.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('info', 'SPC exported successfully');
  };

  const importSPC = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!imported.spc_version || !imported.services) {
          throw new Error('Invalid SPC format');
        }
        setSpc(imported);
        setJsonError(null);
        addLog('info', 'SPC imported successfully');
      } catch (error) {
        setJsonError(error.message);
        addLog('error', `Import failed: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };

  const runPipeline = () => {
    setIsRunning(true);
    addLog('info', '▶️ Pipeline started');
    // In production, this would call the EDT engine
    setTimeout(() => {
      addLog('success', '✅ Pipeline executed successfully');
      setIsRunning(false);
    }, 2000);
  };

  const stopPipeline = () => {
    setIsRunning(false);
    addLog('warn', '⏹ Pipeline stopped');
  };

  const tickOnce = () => {
    addLog('info', '⚡ Single tick executed');
  };

  const addLog = (level, message) => {
    setExecutionLog(prev => [...prev, { 
      level, 
      message, 
      timestamp: new Date().toLocaleTimeString() 
    }].slice(-50));
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-100">
      {/* Top Toolbar */}
      <Toolbar
        spc={spc}
        setSpc={setSpc}
        isRunning={isRunning}
        onExport={exportSPC}
        onImport={importSPC}
        onRun={runPipeline}
        onStop={stopPipeline}
        onTick={tickOnce}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Service Palette */}
        <ServicePalette onAddService={addService} />

        {/* Canvas View */}
        {(viewMode === 'canvas' || viewMode === 'split') && (
          <CanvasView
            nodes={canvasNodes}
            connections={connections}
            selectedService={selectedService}
            onSelectService={setSelectedService}
            onMoveNode={moveNode}
            onDeleteService={deleteService}
          />
        )}

        {/* JSON Editor */}
        {(viewMode === 'json' || viewMode === 'split') && (
          <JsonEditor
            spc={spc}
            setSpc={setSpc}
            jsonError={jsonError}
            setJsonError={setJsonError}
          />
        )}

        {/* Inspector Panel */}
        {selectedService && (
          <InspectorPanel
            service={spc.services[selectedService]}
            onUpdate={(updates) => updateService(selectedService, updates)}
            onClose={() => setSelectedService(null)}
          />
        )}
      </div>

      {/* Bottom Execution Log */}
      <ExecutionLog logs={executionLog} />
    </div>
  );
}

// ============================================================================
// TOOLBAR COMPONENT
// ============================================================================

function Toolbar({ spc, setSpc, isRunning, onExport, onImport, onRun, onStop, onTick, viewMode, setViewMode }) {
  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-green-400">🌲 EDT Pipeline Editor</h1>
        <input
          type="text"
          value={spc.meta.name}
          onChange={(e) => setSpc(prev => ({ ...prev, meta: { ...prev.meta, name: e.target.value } }))}
          className="bg-gray-700 px-3 py-1 rounded border border-gray-600 text-sm"
          placeholder="Pipeline name"
        />
      </div>

      <div className="flex items-center gap-2">
        {/* File Operations */}
        <button onClick={onExport} className="btn-toolbar" title="Export SPC">
          <Download size={16} />
        </button>
        <label className="btn-toolbar cursor-pointer" title="Import SPC">
          <Upload size={16} />
          <input type="file" accept=".json" onChange={onImport} className="hidden" />
        </label>
        <button className="btn-toolbar" title="Save to Cloud">
          <Save size={16} />
        </button>

        <div className="w-px h-6 bg-gray-600 mx-2" />

        {/* Execution Controls */}
        {!isRunning ? (
          <button onClick={onRun} className="btn-primary" title="Run Pipeline">
            <Play size={16} /> Run
          </button>
        ) : (
          <button onClick={onStop} className="btn-danger" title="Stop Pipeline">
            <Square size={16} /> Stop
          </button>
        )}
        <button onClick={onTick} className="btn-toolbar" title="Tick Once">
          <Zap size={16} />
        </button>

        <div className="w-px h-6 bg-gray-600 mx-2" />

        {/* View Mode */}
        <div className="flex bg-gray-700 rounded">
          <button
            onClick={() => setViewMode('canvas')}
            className={`px-3 py-1 text-xs rounded-l ${viewMode === 'canvas' ? 'bg-green-500 text-black' : ''}`}
          >
            Canvas
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1 text-xs ${viewMode === 'split' ? 'bg-green-500 text-black' : ''}`}
          >
            Split
          </button>
          <button
            onClick={() => setViewMode('json')}
            className={`px-3 py-1 text-xs rounded-r ${viewMode === 'json' ? 'bg-green-500 text-black' : ''}`}
          >
            JSON
          </button>
        </div>

        <div className="w-px h-6 bg-gray-600 mx-2" />

        {/* Collaboration (Future) */}
        <button className="btn-toolbar" title="Share Pipeline">
          <Share2 size={16} />
        </button>
        <button className="btn-toolbar" title="Comments">
          <MessageSquare size={16} />
        </button>
        <button className="btn-toolbar" title="Version History">
          <Clock size={16} />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SERVICE PALETTE
// ============================================================================

function ServicePalette({ onAddService }) {
  return (
    <div className="w-48 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
      <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase">Primitives</h3>
      <div className="space-y-2">
        {Object.entries(SERVICE_TYPES).map(([type, config]) => (
          <button
            key={type}
            onClick={() => onAddService(type)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            <span className="text-xl">{config.icon}</span>
            <span>{config.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-700">
        <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase">Templates</h3>
        <button className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-left">
          📋 API Monitor
        </button>
        <button className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-left mt-2">
          🔄 ETL Pipeline
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// CANVAS VIEW (Simplified Visual Editor)
// ============================================================================

function CanvasView({ nodes, connections, selectedService, onSelectService, onMoveNode, onDeleteService }) {
  const [draggedNode, setDraggedNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e, node) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setDraggedNode(node.id);
    onSelectService(node.id);
  };

  const handleMouseMove = (e) => {
    if (!draggedNode) return;
    const canvas = e.currentTarget.getBoundingClientRect();
    onMoveNode(draggedNode, {
      x: e.clientX - canvas.left - dragOffset.x,
      y: e.clientY - canvas.top - dragOffset.y
    });
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
  };

  return (
    <div
      className="flex-1 bg-gray-900 relative overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }}
    >
      {/* Connections */}
      <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        {connections.map((conn, idx) => {
          const sourceNode = nodes.find(n => n.id === conn.source);
          const targetNode = nodes.find(n => n.id === conn.target);
          if (!sourceNode || !targetNode) return null;

          const x1 = sourceNode.position.x + 100;
          const y1 = sourceNode.position.y + 35;
          const x2 = targetNode.position.x;
          const y2 = targetNode.position.y + 35;

          return (
            <g key={idx}>
              <path
                d={`M ${x1} ${y1} C ${x1 + 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}`}
                stroke="#00ff88"
                strokeWidth="2"
                fill="none"
                opacity="0.5"
              />
              <circle cx={x2} cy={y2} r="4" fill="#00ff88" />
            </g>
          );
        })}
      </svg>

      {/* Nodes */}
      {nodes.map(node => (
        <div
          key={node.id}
          onMouseDown={(e) => handleMouseDown(e, node)}
          className={`absolute cursor-move transition-shadow ${
            selectedService === node.id ? 'ring-2 ring-green-400' : ''
          }`}
          style={{
            left: node.position.x,
            top: node.position.y,
            width: 200,
            zIndex: draggedNode === node.id ? 10 : 2
          }}
        >
          <div className={`${SERVICE_TYPES[node.type].color} p-3 rounded-t`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{SERVICE_TYPES[node.type].icon}</span>
                <span className="font-bold text-sm text-white">{node.title}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteService(node.id);
                }}
                className="text-white hover:text-red-300 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="bg-gray-800 p-2 rounded-b border border-gray-700">
            <div className="text-xs text-gray-400">
              Status: <span className={node.status === 'running' ? 'text-green-400' : 'text-gray-500'}>
                {node.status}
              </span>
            </div>
          </div>
        </div>
      ))}

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-600">
          <div className="text-center">
            <p className="text-xl mb-2">👈 Drag a primitive from the palette to start</p>
            <p className="text-sm">Build your data pipeline visually</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// JSON EDITOR
// ============================================================================

function JsonEditor({ spc, setSpc, jsonError, setJsonError }) {
  const [jsonText, setJsonText] = useState(JSON.stringify(spc, null, 2));

  useEffect(() => {
    setJsonText(JSON.stringify(spc, null, 2));
  }, [spc]);

  const handleJsonChange = (e) => {
    const text = e.target.value;
    setJsonText(text);
    
    try {
      const parsed = JSON.parse(text);
      setSpc(parsed);
      setJsonError(null);
    } catch (error) {
      setJsonError(error.message);
    }
  };

  return (
    <div className="flex-1 bg-gray-900 border-l border-gray-700 flex flex-col">
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-300">SPC JSON</h3>
        {jsonError && <span className="text-red-400 text-xs">⚠️ {jsonError}</span>}
      </div>
      <textarea
        value={jsonText}
        onChange={handleJsonChange}
        className="flex-1 bg-gray-900 text-gray-100 font-mono text-xs p-4 resize-none focus:outline-none"
        spellCheck="false"
      />
    </div>
  );
}

// ============================================================================
// INSPECTOR PANEL
// ============================================================================

function InspectorPanel({ service, onUpdate, onClose }) {
  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-green-400">Inspector</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Title</label>
          <input
            type="text"
            value={service.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="w-full bg-gray-700 px-3 py-2 rounded text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Type</label>
          <div className="bg-gray-700 px-3 py-2 rounded text-sm">{service.type}</div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Status</label>
          <select
            value={service.status}
            onChange={(e) => onUpdate({ status: e.target.value })}
            className="w-full bg-gray-700 px-3 py-2 rounded text-sm"
          >
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-2">Spec</label>
          <div className="bg-gray-900 p-3 rounded text-xs font-mono">
            <pre>{JSON.stringify(service.spec, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXECUTION LOG
// ============================================================================

function ExecutionLog({ logs }) {
  return (
    <div className="h-32 bg-gray-800 border-t border-gray-700 overflow-y-auto">
      <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-400 uppercase">Execution Log</h3>
      </div>
      <div className="p-2 space-y-1">
        {logs.map((log, idx) => (
          <div key={idx} className="text-xs font-mono flex items-start gap-2">
            <span className="text-gray-500">{log.timestamp}</span>
            <span className={
              log.level === 'error' ? 'text-red-400' :
              log.level === 'warn' ? 'text-yellow-400' :
              log.level === 'success' ? 'text-green-400' :
              'text-gray-300'
            }>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// STYLES (Tailwind utility classes defined inline)
// ============================================================================

const styles = `
  .btn-toolbar {
    @apply px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm flex items-center gap-1 transition-colors;
  }
  .btn-primary {
    @apply px-4 py-1.5 bg-green-500 hover:bg-green-600 text-black font-bold rounded text-sm flex items-center gap-1 transition-colors;
  }
  .btn-danger {
    @apply px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded text-sm flex items-center gap-1 transition-colors;
  }
`;