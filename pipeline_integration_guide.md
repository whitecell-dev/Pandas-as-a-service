# 🎨 EDT Pipeline Canvas Editor - Integration Guide

## Overview

A **Figma-like visual editor** for building data pipelines with the EDT micro-kernel engine. This React-based interface provides:

- ✅ Visual canvas with drag-and-drop service blocks
- ✅ Live JSON ↔ Canvas synchronization
- ✅ Import/Export SPC files
- ✅ Execution controls (Run, Stop, Tick)
- ✅ Inspector panel for editing service specs
- ✅ Extensible architecture for new primitives

---

## Architecture

### Component Hierarchy

```
PipelineEditor (Root)
├── Toolbar (Controls & View Modes)
├── ServicePalette (Drag Source)
├── CanvasView (Visual Pipeline)
│   ├── Nodes (Service Blocks)
│   └── Connections (Data Flow Arrows)
├── JsonEditor (Live JSON Sync)
├── InspectorPanel (Edit Service Specs)
└── ExecutionLog (Runtime Output)
```

### State Management

**Single Source of Truth:** The `spc` object (SPC JSON structure)

```javascript
const [spc, setSpc] = useState({
  spc_version: "1.0",
  meta: { name: "Pipeline", created_at: "..." },
  services: {
    "connector-1": {
      id: "connector-1",
      type: "connector",
      title: "API Connector",
      spec: { url: "...", outputKey: "..." },
      status: "running",
      position: { x: 100, y: 100 }
    }
  },
  state: {}
});
```

**Derived State:**
- `canvasNodes` - Computed from `spc.services`
- `connections` - Inferred from `inputKey` references

---

## Key Features

### 1. Visual Canvas

**Drag-and-Drop Nodes:**
```javascript
const handleMouseDown = (e, node) => {
  const rect = e.currentTarget.getBoundingClientRect();
  setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  setDraggedNode(node.id);
};

const handleMouseMove = (e) => {
  if (!draggedNode) return;
  const canvas = e.currentTarget.getBoundingClientRect();
  onMoveNode(draggedNode, {
    x: e.clientX - canvas.left - dragOffset.x,
    y: e.clientY - canvas.top - dragOffset.y
  });
};
```

**Connection Rendering (SVG Paths):**
```javascript
<path
  d={`M ${x1} ${y1} C ${x1 + 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}`}
  stroke="#00ff88"
  strokeWidth="2"
  fill="none"
/>
```

### 2. Two-Way JSON Sync

**Canvas → JSON:**
```javascript
const updateService = (id, updates) => {
  setSpc(prev => ({
    ...prev,
    services: {
      ...prev.services,
      [id]: { ...prev.services[id], ...updates }
    }
  }));
};
```

**JSON → Canvas:**
```javascript
useEffect(() => {
  const nodes = Object.entries(spc.services).map(([id, service]) => ({
    id,
    type: service.type,
    position: service.position || { x: 100, y: 100 }
  }));
  setCanvasNodes(nodes);
}, [spc]);
```

### 3. Import/Export

**Export SPC:**
```javascript
const exportSPC = () => {
  const blob = new Blob([JSON.stringify(spc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${spc.meta.name}.spc.json`;
  a.click();
};
```

**Import SPC:**
```javascript
const importSPC = (event) => {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    const imported = JSON.parse(e.target.result);
    setSpc(imported);
  };
  reader.readAsText(file);
};
```

---

## Extensibility

### Adding New Primitives

**1. Update SERVICE_TYPES Config:**
```javascript
const SERVICE_TYPES = {
  // ... existing types
  transformer: {
    color: 'bg-indigo-500',
    icon: '🔄',
    label: 'Transformer',
    defaultSpec: { inputKey: '', outputKey: '', rules: [] }
  }
};
```

**2. Primitive Auto-Registers:**
- Appears in Service Palette
- Canvas renders with correct color/icon
- JSON editor validates structure
- Inspector panel shows spec fields

### Custom Connection Logic

**Auto-Connect Based on inputKey:**
```javascript
const connections = [];
Object.entries(spc.services).forEach(([targetId, service]) => {
  if (service.spec?.inputKey) {
    const sourceKey = service.spec.inputKey.replace(/_data$|_output$/, '');
    if (spc.services[sourceKey]) {
      connections.push({ source: sourceKey, target: targetId });
    }
  }
});
```

### Validation & Error Handling

**JSON Validation:**
```javascript
const handleJsonChange = (text) => {
  try {
    const parsed = JSON.parse(text);
    if (!parsed.spc_version || !parsed.services) {
      throw new Error('Invalid SPC structure');
    }
    setSpc(parsed);
    setJsonError(null);
  } catch (error) {
    setJsonError(error.message);
  }
};
```

---

## Integration with EDT Engine

### Running Pipelines

**Client-Side Execution:**
```javascript
import { EDTEngine } from './edt-engine';

const engine = new EDTEngine();

const runPipeline = async () => {
  // Load SPC into engine
  engine.spc = spc;
  
  // Register handlers
  engine.register(connectorHandler);
  engine.register(processorHandler);
  engine.register(vaultHandler);
  
  // Start execution
  engine.start();
  
  // Listen to events
  engine.on('tick', (results) => {
    addLog('info', `Tick completed: ${results.length} events`);
  });
};
```

**Server-Side Execution (API):**
```javascript
const runPipeline = async () => {
  setIsRunning(true);
  
  try {
    const response = await fetch('/api/pipelines/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spc })
    });
    
    const result = await response.json();
    addLog('success', `Pipeline executed: ${result.ticks} ticks`);
  } catch (error) {
    addLog('error', `Execution failed: ${error.message}`);
  } finally {
    setIsRunning(false);
  }
};
```

### Real-Time State Updates

**WebSocket Integration:**
```javascript
useEffect(() => {
  const ws = new WebSocket('ws://localhost:8080/pipeline-state');
  
  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    
    // Update SPC state in real-time
    setSpc(prev => ({
      ...prev,
      state: { ...prev.state, ...update.patch }
    }));
    
    // Log events
    if (update.events) {
      update.events.forEach(evt => {
        addLog('info', `${evt.name}: ${evt.for}`);
      });
    }
  };
  
  return () => ws.close();
}, []);
```

---

## Advanced Features

### 1. Multi-User Collaboration (Future)

**User Cursors:**
```javascript
const [collaborators, setCollaborators] = useState([]);

useEffect(() => {
  const channel = pusher.subscribe('pipeline-123');
  
  channel.bind('cursor-move', (data) => {
    setCollaborators(prev => ({
      ...prev,
      [data.userId]: {
        name: data.name,
        color: data.color,
        position: data.position
      }
    }));
  });
}, []);

// Render cursors
{collaborators.map(user => (
  <div
    key={user.id}
    className="absolute pointer-events-none"
    style={{
      left: user.position.x,
      top: user.position.y,
      color: user.color
    }}
  >
    <span>👤 {user.name}</span>
  </div>
))}
```

**Comment System:**
```javascript
const [comments, setComments] = useState({});

const addComment = (serviceId, text) => {
  const comment = {
    id: Date.now(),
    serviceId,
    text,
    author: currentUser.name,
    timestamp: new Date().toISOString()
  };
  
  setComments(prev => ({
    ...prev,
    [serviceId]: [...(prev[serviceId] || []), comment]
  }));
};

// Render comment pins on nodes
{comments[node.id]?.length > 0 && (
  <div className="absolute -top-2 -right-2 bg-yellow-500 text-black rounded-full w-5 h-5 flex items-center justify-center text-xs">
    {comments[node.id].length}
  </div>
)}
```

### 2. Version History

**Auto-Save with History:**
```javascript
const [history, setHistory] = useState([]);
const [historyIndex, setHistoryIndex] = useState(-1);

const saveSnapshot = useCallback(() => {
  const snapshot = {
    spc: JSON.parse(JSON.stringify(spc)),
    timestamp: new Date().toISOString(),
    message: `Auto-save at ${new Date().toLocaleTimeString()}`
  };
  
  setHistory(prev => [...prev.slice(0, historyIndex + 1), snapshot]);
  setHistoryIndex(prev => prev + 1);
}, [spc, historyIndex]);

// Auto-save every 30 seconds
useEffect(() => {
  const interval = setInterval(saveSnapshot, 30000);
  return () => clearInterval(interval);
}, [saveSnapshot]);

// Undo/Redo
const undo = () => {
  if (historyIndex > 0) {
    setHistoryIndex(prev => prev - 1);
    setSpc(history[historyIndex - 1].spc);
  }
};

const redo = () => {
  if (historyIndex < history.length - 1) {
    setHistoryIndex(prev => prev + 1);
    setSpc(history[historyIndex + 1].spc);
  }
};
```

### 3. Data Flow Animations

**Animated Connections:**
```javascript
<style>{`
  @keyframes flow {
    0% { stroke-dashoffset: 20; }
    100% { stroke-dashoffset: 0; }
  }
`}</style>

<path
  d={connectionPath}
  stroke="#00ff88"
  strokeWidth="2"
  fill="none"
  strokeDasharray="5,5"
  style={{
    animation: isRunning ? 'flow 1s linear infinite' : 'none'
  }}
/>
```

**Node Pulse on Execution:**
```javascript
<div
  className={`node ${isExecuting ? 'animate-pulse ring-2 ring-green-400' : ''}`}
>
  {/* Node content */}
</div>
```

### 4. Template Library

**Pre-Built Pipeline Templates:**
```javascript
const TEMPLATES = {
  'api-monitor': {
    name: 'API Health Monitor',
    description: 'Monitor API endpoints and send alerts',
    services: {
      'api-connector': {
        type: 'connector',
        spec: { url: 'https://api.example.com/health' }
      },
      'health-processor': {
        type: 'processor',
        spec: { inputKey: 'api-connector_data', pipes: [...] }
      },
      'alert-adapter': {
        type: 'adapter',
        spec: { kind: 'webhook', url: 'https://hooks.slack.com/...' }
      }
    }
  },
  'etl-pipeline': {
    name: 'ETL Data Pipeline',
    description: 'Extract, transform, and load data',
    services: { /* ... */ }
  }
};

const loadTemplate = (templateKey) => {
  const template = TEMPLATES[templateKey];
  setSpc({
    spc_version: "1.0",
    meta: { name: template.name, created_at: new Date().toISOString() },
    services: template.services,
    state: {}
  });
};
```

---

## Performance Optimizations

### 1. Virtual Canvas Rendering

For large pipelines (100+ nodes):

```javascript
import { FixedSizeGrid } from 'react-window';

const VirtualCanvas = ({ nodes }) => {
  const visibleNodes = nodes.filter(node => {
    const { x, y } = node.position;
    return (
      x >= viewport.minX && x <= viewport.maxX &&
      y >= viewport.minY && y <= viewport.maxY
    );
  });
  
  return visibleNodes.map(node => <Node key={node.id} {...node} />);
};
```

### 2. Debounced JSON Updates

```javascript
import { useDebouncedCallback } from 'use-debounce';

const debouncedJsonUpdate = useDebouncedCallback((text) => {
  try {
    const parsed = JSON.parse(text);
    setSpc(parsed);
  } catch (error) {
    setJsonError(error.message);
  }
}, 500);
```

### 3. Memoized Connections

```javascript
import { useMemo } from 'react';

const connections = useMemo(() => {
  const conns = [];
  Object.entries(spc.services).forEach(([targetId, service]) => {
    if (service.spec?.inputKey) {
      const sourceKey = service.spec.inputKey.replace(/_data$|_output$/, '');
      if (spc.services[sourceKey]) {
        conns.push({ source: sourceKey, target: targetId });
      }
    }
  });
  return conns;
}, [spc.services]);
```

---

## Deployment Options

### 1. Standalone Web App

```bash
# Build for production
npm run build

# Serve static files
npx serve -s build
```

### 2. Embedded in Existing App

```javascript
import PipelineEditor from './PipelineEditor';

function App() {
  return (
    <div>
      <Navigation />
      <PipelineEditor initialSpc={mySpc} onSave={handleSave} />
    </div>
  );
}
```

### 3. Electron Desktop App

```javascript
// main.js
const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true
    }
  });
  
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);
```

---

## Testing Strategy

### Component Tests

```javascript
import { render, fireEvent, screen } from '@testing-library/react';
import PipelineEditor from './PipelineEditor';

test('adds service to canvas', () => {
  render(<PipelineEditor />);
  
  const connectorBtn = screen.getByText('Connector');
  fireEvent.click(connectorBtn);
  
  expect(screen.getByText(/Connector 1/i)).toBeInTheDocument();
});

test('exports SPC correctly', () => {
  const { getByTitle } = render(<PipelineEditor />);
  
  const exportBtn = getByTitle('Export SPC');
  fireEvent.click(exportBtn);
  
  // Verify download triggered
  expect(URL.createObjectURL).toHaveBeenCalled();
});
```

### Integration Tests

```javascript
test('canvas and JSON stay in sync', () => {
  const { getByRole } = render(<PipelineEditor />);
  
  // Add service via palette
  fireEvent.click(screen.getByText('Processor'));
  
  // Check JSON editor reflects change
  const jsonEditor = getByRole('textbox');
  const json = JSON.parse(jsonEditor.value);
  
  expect(Object.keys(json.services).length).toBe(1);
  expect(json.services[Object.keys(json.services)[0]].type).toBe('processor');
});
```

---

## Roadmap

### Phase 1: Core Editor (✅ Complete)
- [x] Visual canvas with drag-and-drop
- [x] Service palette
- [x] JSON editor with live sync
- [x] Import/export SPC files
- [x] Inspector panel

### Phase 2: Execution (In Progress)
- [ ] Integrate EDT engine
- [ ] Real-time state updates
- [ ] Execution log with filtering
- [ ] Step-through debugging

### Phase 3: Collaboration
- [ ] Multi-user cursors
- [ ] Comment system
- [ ] Version history
- [ ] Conflict resolution

### Phase 4: Advanced Features
- [ ] Template library
- [ ] Custom primitive builder
- [ ] Data flow animations
- [ ] Performance profiling
- [ ] A/B testing pipelines

---

## API Reference

### PipelineEditor Props

```typescript
interface PipelineEditorProps {
  initialSpc?: SPC;
  onSave?: (spc: SPC) => void;
  readOnly?: boolean;
  engineUrl?: string; // Backend EDT engine
  collaborationEnabled?: boolean;
  theme?: 'dark' | 'light';
}
```

### Hooks

```javascript
// Custom hook for pipeline state management
const usePipeline = (initialSpc) => {
  const [spc, setSpc] = useState(initialSpc);
  const [history, setHistory] = useState([]);
  
  const addService = (type) => { /* ... */ };
  const updateService = (id, updates) => { /* ... */ };
  const deleteService = (id) => { /* ... */ };
  const undo = () => { /* ... */ };
  const redo = () => { /* ... */ };
  
  return {
    spc,
    addService,
    updateService,
    deleteService,
    undo,
    redo,
    canUndo: history.length > 0,
    canRedo: historyIndex < history.length - 1
  };
};
```

---

## FAQ

**Q: Can I use this with react-flow or reactflow library?**

A: Yes! The current implementation uses a custom canvas, but you can easily migrate to `react-flow`:

```javascript
import ReactFlow, { Controls, Background } from 'reactflow';

const nodes = canvasNodes.map(node => ({
  id: node.id,
  type: 'custom',
  position: node.position,
  data: { service: spc.services[node.id] }
}));

const edges = connections.map(conn => ({
  id: `${conn.source}-${conn.target}`,
  source: conn.source,
  target: conn.target,
  animated: isRunning
}));

<ReactFlow nodes={nodes} edges={edges}>
  <Controls />
  <Background />
</ReactFlow>
```

**Q: How do I add authentication/authorization?**

A: Wrap the editor with your auth provider:

```javascript
import { AuthProvider, useAuth } from './auth';

function ProtectedEditor() {
  const { user, canEdit } = useAuth();
  
  return (
    <PipelineEditor
      readOnly={!canEdit}
      onSave={(spc) => savePipeline(user.id, spc)}
    />
  );
}
```

**Q: Can I customize the primitive icons and colors?**

A: Yes, modify the `SERVICE_TYPES` constant:

```javascript
const SERVICE_TYPES = {
  connector: {
    color: 'bg-blue-600', // Change color
    icon: '🔗', // Change icon
    label: 'Data Source' // Change label
  }
};
```

---

## Support & Contributing

- **Documentation:** [docs.edt-engine.dev](https://docs.edt-engine.dev)
- **GitHub:** [github.com/your-org/edt-pipeline-editor](https://github.com)
- **Discord:** [discord.gg/edt-engine](https://discord.gg)

**Contributing:**
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

---

## License

MIT License - See LICENSE file for details