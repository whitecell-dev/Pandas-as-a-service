# 🐼 Pandas as a Service (PaaS)

> **The last data pipeline you’ll ever write.**

Pandas as a Service (PaaS) transforms messy Python scripts into **clean, declarative specs** you can generate with AI, edit visually, and execute anywhere.

It’s not a library. It’s not a framework.
It’s a **post-code execution model** for business logic — built for the AI era.

---

## 🔁 What It Does

```yaml
processor:
  inputKey: sales_data
  outputKey: us_revenue
  pipes:
    - select: "row.region === 'US'"
    - derive:
        revenue: "row.units * row.price"
```

**This is Pandas — without code.**
The same logic. But:

* ✅ AI can generate it
* ✅ Humans can understand it
* ✅ Engines can run it deterministically
* ✅ Businesses can own and reuse it

---

## 🌟 What’s Inside

### ✨ SPC (Single Page Computer)

* The atomic unit of portable logic
* Describes your pipeline in JSON or YAML
* Works entirely client-side (browser or offline)

### 🏋️ EDT Micro-Kernel Engine (KERN)

* Tick-based execution loop
* Lifecycle manager auto-resets services
* Built-in observability and hash-chained audit logs (MNEME)

### 💡 Declarative Primitives

* **connector** - fetch data
* **processor** - filter, map, transform
* **adapter** - trigger webhooks / side effects
* **monitor** - fire alerts
* **iterator** - walk over arrays
* **router** - conditional logic
* **vault** - manage secrets

### 🔗 Execution = Deterministic

Every tick:

1. Scans for `status: running`
2. Executes handlers
3. Applies lifecycle policies
4. Updates shared state
5. Appends to audit ledger

---

## 🌊 Who It’s For

| Persona            | Before                           | After                                       |
| ------------------ | -------------------------------- | ------------------------------------------- |
| 🧑‍💼 Business Ops | "I need a dev to write a script" | "I can describe it — AI makes the pipeline" |
| 🤖 LLM Co-Pilot    | "Generate fragile Python"        | "Emit clean, structured SPC specs"          |
| 🧑‍💻 Engineers    | "Debug legacy dataflows"         | "Build primitives and let specs flow"       |

---

## 📦 Folder Structure

```
pandas-as-a-service/
├── engine/                        # Vault-enabled EDT micro-kernel
├── studio/                        # Visual canvas editors (React + Tailwind)
├── examples/                      # Real-world .spc.json templates
├── docs/                          # Design philosophy and deep dives
├── pipeline_integration_guide.md # Canvas → Runtime glue logic
├── setup_package.json             # Vite + React setup
├── README.md                      # You're reading it!
```

---

## 🚀 Quickstart

```bash
# Install dependencies
npm install

# Run local dev server
npm run dev
```

Then open:

* `engine/edt-microkernel.html` to run SPC specs
* `studio/pipeline_canvas_editor.tsx` to build visually
* `studio/reactflow_enhanced_editor.tsx` for advanced UI

---

## 🚪 Core Primitives

Each SPC file includes one or more services. Supported primitives:

### `connector`

```yaml
type: connector
spec:
  url: "https://api.example.com/data/{{state.userId}}"
  outputKey: api_response
  persistent: true
```

### `processor`

```yaml
type: processor
spec:
  inputKey: raw_data
  outputKey: clean_data
  pipes:
    - select: "row.status === 'active'"
    - derive: { age: "2025 - row.birthYear" }
```

### `adapter`

```yaml
type: adapter
spec:
  kind: webhook
  url: "https://hooks.example.com/alert"
  body:
    text: "New data processed"
  idempotency_key: "{{state.alert_id}}"
```

### `monitor`, `router`, `iterator`, `vault`

Each have their own minimal schema and lifecycle policies.

---

## 📅 Lifecycle Management

| Type      | Behavior                 | Modifiers                        |
| --------- | ------------------------ | -------------------------------- |
| adapter   | auto-stop after fire     | `hold: true`, `persistent: true` |
| monitor   | stay running             | `oneShot: true`                  |
| router    | always running (default) | `persistent: false` to stop      |
| processor | always running           | `persistent: false`              |
| connector | always running           | `persistent: false`              |
| iterator  | stops when done          | `loop: true` to repeat           |

---

## 📉 Use Cases

| Use Case        | Spec Primitive Flow             |
| --------------- | ------------------------------- |
| ETL pipeline    | connector → processor → adapter |
| Alert on spike  | processor → monitor → webhook   |
| Data sync       | iterator → connector → vault    |
| Ad optimization | monitor → adapter               |

---

## 🔧 SPC Anatomy

```json
{
  "spc_version": "1.0",
  "meta": { "name": "Demo", "description": "Simple pipeline" },
  "services": {
    "clean": {
      "type": "processor",
      "spec": {
        "inputKey": "sales",
        "pipes": [
          { "select": "row.region === 'US'" },
          { "derive": { "revenue": "row.units * row.price" } }
        ]
      },
      "status": "running"
    }
  },
  "state": {}
}
```

---

## 🕵️ Philosophy

> "Instead of writing pipelines in Pandas, describe them once — and execute them anywhere."

* ❌ Fragile scripts
* ❌ Hidden logic
* ❌ Black-box orchestration

Replaced with:

* ✅ Deterministic, composable services
* ✅ Reusable declarative specs
* ✅ Self-healing, portable logic containers

You don’t rent your data. Why rent your pipelines?

---

## 💚 License

MIT — Use freely, fork aggressively, build something wild.

---

## 🙌 Final Thought

**PaaS** isn’t just about doing Pandas in YAML.

It’s about making **data pipelines a first-class unit of logic.**

* Declarative
* Deterministic
* Portable

Build declaratively. Execute deterministically. Think exponentially.

—
*Brought to you by those who believe logic should be portable.*

