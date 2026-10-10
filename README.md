# CircuitMind — AI-Native Engineering IDE for Physical Systems

> **Tagline:** Think it. Build it. Prove it.  
> **Category:** AI for hardware, electronics engineering, developer tools, educational technology  
> **Status:** MVP Complete & Production-Ready for Demonstration  

---

## 1. Overview & Vision

**CircuitMind** transforms natural-language project descriptions into structured, verified electronics systems. It provides the closed engineering loop:

$$\text{Describe} \longrightarrow \text{Design} \longrightarrow \text{Generate} \longrightarrow \text{Simulate} \longrightarrow \text{Test} \longrightarrow \text{Diagnose} \longrightarrow \text{Repair} \longrightarrow \text{Verify} \longrightarrow \text{Remember}$$

CircuitMind acts as a dedicated physical systems IDE rather than a generic code assistant. It enforces deterministic hardware constraints, produces Wokwi-compatible circuit simulations, generates production-quality Arduino C++ firmware, conducts behavioral test verification, and maintains persistent engineering memory backed by SQLite and integrated with **DevMemoryAI (DMAI)**.

---

## 2. Architecture & Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Vanilla CSS design system with custom dark IDE aesthetic and restrained circuit orange accents (`#f97316`)
- **Icons:** `lucide-react`
- **Effects:** `canvas-confetti` for celebratory verification checkpoints
- **Proxy:** Configured in `vite.config.ts` to seamlessly route `/api` to the backend

### Backend
- **Framework:** FastAPI + Uvicorn
- **Data Validation:** Pydantic v2 (Single source of truth Project Graph)
- **Database:** SQLite (`data/circuitmind.db`) storing projects, simulation runs, and the DMAI event log
- **Hardware Catalog:** Curated physical specifications for ESP32 DevKit V1, Arduino Uno, HC-SR04, LEDs, Piezo Buzzers, Resistors, DHT22, Servos, Potentiometers, and SSD1306 OLED displays.
- **Engines:**
  - `planner.py`: Natural language requirements parsing and design synthesis
  - `validator.py`: Deterministic hardware, pin conflict, and voltage validator
  - `generator.py`: Wokwi `diagram.json`, Arduino C++ firmware, and step-by-step assembly guides
  - `simulator.py`: Behavioral simulation runner with real serial telemetry streaming
  - `debugger.py`: Root-cause diagnosis, diff generation, and 1-click patch application
  - `memory_service.py`: Persistent event logger & DevMemoryAI CLI integration

---

## 3. Quickstart & Running Locally

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn pydantic pytest httpx python-dotenv

# Start FastAPI server
PYTHONPATH=. uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 4. Automated Testing & Verification

Run the comprehensive unit test suite:
```bash
PYTHONPATH=. ./venv/bin/pytest backend/tests/test_backend.py -v
```

Run the complete 8-step live integration demonstration:
```bash
./venv/bin/python3 backend/tests/integration_demo.py
```

---

## 5. Live Demonstration Sequence

1. **Step 1 — Describe:** User selects "Smart Parking Sensor" or types:
   > *"Build a smart parking sensor using an ESP32. When an object is closer than 20 cm, activate a warning LED and buzzer. Explain the wiring and show me how to test it."*
2. **Step 2 — Generate:** CircuitMind synthesizes requirements, selects hardware, verifies pin assignments, routes connections, generates C++ firmware (`sketch.ino`), creates Wokwi `diagram.json`, and outputs ordered assembly instructions.
3. **Step 3 — Inspect:** User explores the interactive Schematic Diagram, Wiring Table, and syntax-highlighted Firmware.
4. **Step 4 — Simulate:** In the Simulation tab, user drags the virtual distance slider (e.g. from 12 cm to 45 cm) and clicks **Run Behavioral Simulation**. Serial telemetry streams in real time.
5. **Step 5 — Verify:** The verification engine runs close-obstacle and far-obstacle tests. Tests pass with supporting evidence.
6. **Step 6 — Modify:** User asks AI Copilot to *"Change the warning threshold to 50 cm"*. CircuitMind increments project version to v2, updating requirements, firmware macros, and tests.
7. **Step 7 — Remember:** The DMAI Memory tab shows the persistent SQLite timeline of decisions and allows natural-language queries (e.g. *"Why is the piezo buzzer connected to GPIO19?"*).
8. **Step 8 — Debug:** In the Verification tab, click **Inject Demo Defect** (misassigning buzzer to Pin D4). The simulation fails honestly. Clicking **Launch AI Debugger** analyzes root cause, shows the patch diff, and clicking **Apply Repair Patch & Re-Verify** fixes the circuit and re-tests green!
