import React, { useState, useCallback } from 'react';
import { Play, Square, Zap, Download, Upload, Save, GitBranch } from 'lucide-react';

// ============================================================================
// ENHANCED PIPELINE EDITOR WITH REACT-FLOW-LIKE FEATURES
// ============================================================================

const SERVICE_CONFIGS = {
  connector: { color: 'from-blue-500 to-blue-600', icon: '🔌', bgColor: 'bg-blue-900/30' },
  processor: { color: 'from-purple-500 to-purple-600', icon: '⚙️', bgColor: 'bg-purple-900/30' },
  monitor: { color: 'from-yellow-500 to-yellow-600', icon: '👁️', bgColor: 'bg-yellow-900/30' },
  adapter: { color: 'from-green-500 to-green-600', icon: '📤', bgColor: 'bg-green-900/30' },
  aggregator: { color: 'from-orange-500 to-orange-600', icon: '📊', bgColor: 'bg-orange-900/30' },
  vault: { color: 'from-red-500 to-red-600', icon: '🔐', bgColor: 'bg-red-900/30' }
};

export default function EnhancedPipelineEditor() {
  const [spc, setSpc] = useState({
    spc_version: "1.0",
    meta: { name: "My Pipeline", created_at: new Date().toISOString() },
    services: {},
    state: {}
  });

  const [selectedNode, setSelectedNode] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [logs, setLogs] = useState([]);

  // ============================================================================
  // SERVICE MANAGEMENT
  // ============================================================================

  const addService = useCallback((type) => {
    const id = `${type}-${Date.now()}`;
    const existingCount = Object.values(spc.services).filter(s => s.type === type).length;
    
    setSpc(prev => ({
      ...prev,
      services: {
        ...prev.services,
        [id]: {
          id,
          type,
          title: `${type} ${existingCount + 1}`,
          spec: getDefaultSpec(type),
          status: 'stopped',
          position: { x: 300, y: 200 }
        }
      }
    }));

    addLog('info', `Added ${type} service: ${id}`);
  }, [spc.services]);

  const updateService = useCallback((id, updates) => {
    setSpc(prev => ({
      ...prev,
      services: {
        ...prev.services,
        [id]: { ...prev.services[id], ...updates }
      }
    }));
  }, []);

  const deleteService = useCallback((id) => {
    setSpc(prev => {
      const newServices = { ...prev.services };
      delete newServices[id];
      return { ...prev, services: newServices };
    });
    
    if (selectedNode === id) setSelectedNode(null);
    addLog('warn', `Deleted service: ${id}`);
  }, [selectedNode]);

  // ============================================================================
  // EXECUTION CONTROLS
  // ============================================================================

  const runPipeline = useCallback(() => {
    setIsRunning(true);
    addLog('success', '▶️ Pipeline execution started');
    
    // Simulate execution
    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      addLog('info', `⚡ Tick ${tick} - Processing services...`);
      
      // Update service states
      setSpc(prev => {
        const updated = { ...prev };
        Object.keys(updated.services).forEach(id => {
          if (updated.services[id].status === 'running') {
            updated.services[id].lastRun = new Date().toISOString();
          }
        });
        return updated;
      });

      if (tick >= 5) {
        clearInterval(interval);
        setIsRunning(false);
        addLog('success', '✅ Pipeline execution completed');
      }
    }, 1000);
  }, []);

  const stopPipeline = useCallback(() => {
    setIsRunning(false);
    addLog('warn', '⏹ Pipeline stopped by user');
  }, []);

  const tickOnce = useCallback(() => {
    addLog('info', '⚡ Manual tick executed');
  }, []);

  // ============================================================================
  // FILE OPERATIONS
  // ============================================================================

  const exportSPC = useCallback(() => {
    const json = JSON.stringify(spc, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spc.meta.name.replace(/\s+/g, '-')}.spc.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('success', '📥 SPC exported successfully');
  }, [spc]);

  const importSPC = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        setSpc(imported);
        addLog('success', '📤 SPC imported successfully');
      } catch (error) {
        addLog('error', `Import failed: ${error.message}`);
      }
    };
    reader.readAsText(file);
  }, []);

  // ============================================================================
  // UTILITIES
  // ============================================================================

  const addLog = useCallback((level, message) => {
    setLogs(prev => [...prev, {
      level,
      message,
      timestamp: new Date().toLocaleTimeString()
    }].slice(-30));
  }, []);

  const getDefaultSpec = (type) => {
    const defaults = {
      connector: { url: 'https://api.example.com/data', outputKey: `${type}_data` },
      processor: { inputKey: '', outputKey: `${type}_output`, transform: [] },
      monitor: { checks: [], emit: 'onChange' },
      adapter: { kind: 'webhook', url: 'https://hooks.example.com/webhook' },
      aggregator: { inputKey: '', window: { size_sec: 30 } },
      vault: { provider: 'hashicorp-vault', secrets: [] }
    };
    return defaults[type] || {};
  };

  const getConnections = useCallback(() => {
    const connections = [];
    Object.entries(spc.services).forEach(([targetId, service]) => {
      if (service.spec?.inputKey) {
        const sourceKey = service.spec.inputKey.replace(/_data$|_output$/, '');
        if (spc.services[sourceKey]) {
          connections.push({ 
            source: sourceKey, 
            target: targetId,
            animated: isRunning 
          });
        }
      }
    });
    return connections;
  }, [spc.services, isRunning]);

  // ============================================================================
  // RENDER
  // ============================================================================

  const services = Object.values(spc.services);
  const connections = getConnections();

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100">
      {/* Header */}
      <Header 
        spc={spc}
        setSpc={setSpc}
        onExport={exportSPC}
        onImport={importSPC}
        onRun={runPipeline}
        onStop={stopPipeline}
        onTick={tickOnce}
        isRunning={isRunning}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Palette */}
        <Sidebar onAddService={addService} />

        {/* Main Canvas */}
        <div className="flex-1 relative bg-gray-950 overflow-hidden">
          {/* Grid Background */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          />

          {/* Canvas Content */}
          <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
            {connections.map((conn, idx) => {
              const source = spc.services[conn.source];
              const target = spc.services[conn.target];
              if (!source || !target) return null;

              const x1 = source.position.x + 120;
              const y1 = source.position.y + 40;
              const x2 = target.position.x;
              const y2 = target.position.y + 40;

              return (
                <g key={idx}>
                  <path
                    d={`M ${x1} ${y1} C ${x1 + 80} ${y1}, ${x2 - 80} ${y2}, ${x2} ${y2}`}
                    stroke={conn.animated ? '#10b981' : '#3b82f6'}
                    strokeWidth="3"
                    fill="none"
                    opacity={conn.animated ? "1" : "0.5"}
                    className={conn.animated ? 'animate-pulse' : ''}
                  />
                  <circle cx={x2} cy={y2} r="5" fill={conn.animated ? '#10b981' : '#3b82f6'} />
                </g>
              );
            })}
          </svg>

          {/* Service Nodes */}
          {services.map(service => (
            <ServiceNode
              key={service.id}
              service={service}
              isSelected={selectedNode === service.id}
              isRunning={isRunning && service.status === 'running'}
              onSelect={() => setSelectedNode(service.id)}
              onMove={(pos) => updateService(service.id, { position: pos })}
              onDelete={() => deleteService(service.id)}
            />
          ))}

          {/* Empty State */}
          {services.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-600">
                <GitBranch size={64} className="mx-auto mb-4 opacity-20" />
                <p className="text-xl mb-2">Start building your pipeline</p>
                <p className="text-sm">Drag a primitive from the left sidebar</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Inspector */}
        {selectedNode && spc.services[selectedNode] && (
          <Inspector
            service={spc.services[selectedNode]}
            onUpdate={(updates) => updateService(selectedNode, updates)}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>

      {/* Bottom Panel - Logs */}
      <LogPanel logs={logs} />
    </div>
  );
}

// ============================================================================
// HEADER COMPONENT
// ============================================================================

function Header({ spc, setSpc, onExport, onImport, onRun, onStop, onTick, isRunning }) {
  return (
    <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
          🌲 EDT Pipeline Studio
        </h1>
        <input
          type="text"
          value={spc.meta.name}
          onChange={(e) => setSpc(prev => ({ ...prev, meta: { ...prev.meta, name: e.target.value } }))}
          className="bg-gray-800 px-3 py-1.5 rounded border border-gray-700 text-sm focus:border-green-500 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onExport} className="btn-icon" title="Export">
          <Download size={18} />
        </button>
        
        <label className="btn-icon cursor-pointer" title="Import">
          <Upload size={18} />
          <input type="file" accept=".json" onChange={onImport} className="hidden" />
        </label>

        <button className="btn-icon" title="Save">
          <Save size={18} />
        </button>

        <div className="w-px h-6 bg-gray-700 mx-2" />

        {!isRunning ? (
          <button onClick={onRun} className="btn-primary">
            <Play size={16} /> Run
          </button>
        ) : (
          <button onClick={onStop} className="btn-danger">
            <Square size={16} /> Stop
          </button>
        )}

        <button onClick={onTick} className="btn-secondary">
          <Zap size={16} />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================

function Sidebar({ onAddService }) {
  return (
    <div className="w-56 bg-gray-900 border-r border-gray-800 p-4">
      <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Primitives</h3>
      <div className="space-y-2">
        {Object.entries(SERVICE_CONFIGS).map(([type, config]) => (
          <button
            key={type}
            onClick={() => onAddService(type)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ${config.bgColor} hover:brightness-125 transition-all border border-gray-800 hover:border-gray-700`}
          >
            <span className="text-2xl">{config.icon}</span>
            <span className="text-sm font-medium capitalize">{type}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SERVICE NODE COMPONENT
// ============================================================================

function ServiceNode({ service, isSelected, isRunning, onSelect, onMove, onDelete }) {
  const [isDragging, setIsDragging] = useState(false);
  const config = SERVICE_CONFIGS[service.type];

  const handleMouseDown = (e) => {
    if (e.target.closest('.delete-btn')) return;
    setIsDragging(true);
    onSelect();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    onMove({
      x: service.position.x + e.movementX,
      y: service.position.y + e.movementY
    });
  };

  return (
    <div
      className={`absolute cursor-move transition-all ${isSelected ? 'ring-2 ring-green-400 z-10' : 'z-0'}`}
      style={{ left: service.position.x, top: service.position.y, width: 240 }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
    >
      {/* Header */}
      <div className={`bg-gradient-to-r ${config.color} p-3 rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            <span className="font-bold text-white text-sm">{service.title}</span>
          </div>
          <button
            onClick={onDelete}
            className="delete-btn text-white hover:text-red-300 opacity-70 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="bg-gray-800 p-3 rounded-b-lg border border-gray-700 border-t-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase font-medium">{service.type}</span>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${service.status === 'running' ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-xs text-gray-500">{service.status}</span>
          </div>
        </div>
        
        {isRunning && service.status === 'running' && (
          <div className="mt-2 bg-green-900/20 border border-green-700/50 rounded px-2 py-1">
            <span className="text-xs text-green-400">⚡ Executing...</span>
          </div>
        )}

        {service.lastRun && (
          <div className="mt-2 text-xs text-gray-500">
            Last run: {new Date(service.lastRun).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Connection Points */}
      <div className="absolute left-0 top-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full border-2 border-gray-950" />
      <div className="absolute right-0 top-1/2 translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full border-2 border-gray-950" />
    </div>
  );
}

// ============================================================================
// INSPECTOR PANEL
// ============================================================================

function Inspector({ service, onUpdate, onClose }) {
  const [specJson, setSpecJson] = useState(JSON.stringify(service.spec, null, 2));
  const [error, setError] = useState(null);

  const handleSpecChange = (value) => {
    setSpecJson(value);
    try {
      const parsed = JSON.parse(value);
      onUpdate({ spec: parsed });
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 overflow-y-auto">
      <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between z-10">
        <h3 className="font-bold text-green-400">Inspector</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>

      <div className="p-4 space-y-4">
        {/* Basic Info */}
        <div>
          <label className="block text-xs text-gray-400 uppercase mb-2 font-medium">Title</label>
          <input
            type="text"
            value={service.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="w-full bg-gray-800 px-3 py-2 rounded border border-gray-700 text-sm focus:border-green-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 uppercase mb-2 font-medium">Type</label>
          <div className="bg-gray-800 px-3 py-2 rounded border border-gray-700 text-sm text-gray-500">
            {service.type}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 uppercase mb-2 font-medium">Status</label>
          <select
            value={service.status}
            onChange={(e) => onUpdate({ status: e.target.value })}
            className="w-full bg-gray-800 px-3 py-2 rounded border border-gray-700 text-sm focus:border-green-500 focus:outline-none"
          >
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
          </select>
        </div>

        {/* Spec Editor */}
        <div>
          <label className="block text-xs text-gray-400 uppercase mb-2 font-medium">
            Specification
            {error && <span className="text-red-400 ml-2">⚠ {error}</span>}
          </label>
          <textarea
            value={specJson}
            onChange={(e) => handleSpecChange(e.target.value)}
            className="w-full bg-gray-950 px-3 py-2 rounded border border-gray-700 text-xs font-mono h-64 focus:border-green-500 focus:outline-none"
            spellCheck="false"
          />
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t border-gray-800">
          <h4 className="text-xs text-gray-400 uppercase mb-3 font-medium">Quick Actions</h4>
          <div className="space-y-2">
            <button className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-left transition-colors">
              📋 Duplicate Service
            </button>
            <button className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-left transition-colors">
              📊 View Metrics
            </button>
            <button className="w-full px-3 py-2 bg-red-900/30 hover:bg-red-900/50 rounded text-sm text-left text-red-400 transition-colors">
              🗑️ Delete Service
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="pt-4 border-t border-gray-800">
          <h4 className="text-xs text-gray-400 uppercase mb-2 font-medium">Metadata</h4>
          <div className="space-y-1 text-xs text-gray-500">
            <div>ID: <span className="font-mono">{service.id}</span></div>
            <div>Position: <span className="font-mono">({Math.round(service.position.x)}, {Math.round(service.position.y)})</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LOG PANEL
// ============================================================================

function LogPanel({ logs }) {
  return (
    <div className="h-40 bg-gray-900 border-t border-gray-800">
      <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-400 uppercase">Execution Log</h3>
        <span className="text-xs text-gray-600">{logs.length} events</span>
      </div>
      
      <div className="h-32 overflow-y-auto px-4 py-2">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-600 text-sm">
            No logs yet. Run the pipeline to see execution logs.
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs font-mono">
                <span className="text-gray-600">{log.timestamp}</span>
                <span className={
                  log.level === 'error' ? 'text-red-400' :
                  log.level === 'warn' ? 'text-yellow-400' :
                  log.level === 'success' ? 'text-green-400' :
                  'text-gray-400'
                }>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CUSTOM STYLES
// ============================================================================

const customStyles = `
  .btn-icon {
    @apply px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors flex items-center gap-2;
  }
  
  .btn-primary {
    @apply px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-bold rounded flex items-center gap-2 transition-colors;
  }
  
  .btn-secondary {
    @apply px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors;
  }
  
  .btn-danger {
    @apply px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded flex items-center gap-2 transition-colors;
  }
`;