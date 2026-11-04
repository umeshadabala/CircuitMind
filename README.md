# CircuitMind

An AI-assisted electronics engineering workspace that transforms natural-language requirements into structured, inspectable, and verified embedded systems hardware and firmware projects.

## Architecture & System Invariants

1. **Canonical Project Graph**: Single source of truth containing components, pin definitions, and explicit net membership. UI coordinates are presentation metadata only.
2. **Deterministic Pin Allocation & DRC**: Conflict-free GPIO and bus allocator avoiding ESP32 strapping pins (GPIO0, 2, 12, 15) and input-only pins (GPIO34-39). Real Design Rule Check (DRC) engine validating voltage boundaries (e.g., 5V to 3.3V divider protection for HC-SR04 ECHO), LED current-limiting resistors, and short-circuit prevention.
3. **Firmware Provenance**: Target-specific C++/Arduino code derived from the exact project revision. Honest build status (marked as uncompiled if no local host toolchain was invoked).
4. **Behavioral Simulation**: Trace-based scenario runner verifying state-machine transitions and sensor excursion handling without fabricated claims.
5. **Zero Paid/Remote AI Dependencies**: Local Ollama runtime (`gpt-oss:120b-cloud` configured by default, or configurable via `.env`). Graceful failure reporting if Ollama is unreachable.

---

## Directory Structure

```
CircuitMind/
├── .env.example              # Documented local runtime environment configuration
├── .gitignore                # Ignoring python caches, node_modules, sqlite databases, env files
├── package.json              # Monorepo scripts (dev, build, test, check)
├── docs/                     # Specifications, architecture, contracts, limitations
│   ├── ARCHITECTURE.md       # Architectural principles and domain model
│   ├── DOMAIN_MODEL.md       # Graph entities, pin definitions, nets, invariants
│   ├── API_CONTRACTS.md      # REST API endpoints and schema definitions
│   └── LIMITATIONS.md        # Explicit verification boundaries and disclosures
├── scripts/                  # Reproducible development, test, and startup scripts
│   ├── setup.sh              # Setup virtualenv and frontend dependencies
│   ├── dev.sh                # Launch backend & frontend concurrently
│   ├── dev-backend.sh        # Launch FastAPI backend
│   ├── test-backend.sh       # Run backend pytest suite
│   └── verify.sh             # Full test and type-check runner
├── backend/                  # FastAPI + Pydantic + SQLite backend
│   ├── pyproject.toml        # Dependencies and build metadata
│   ├── requirements.txt      # Pinned dependencies
│   ├── app/                  # Application domain, services, ai, storage, api
│   └── tests/                # Automated pytest suite (19 tests)
└── frontend/                 # React + TypeScript + Vite + React Flow
    ├── index.html
    ├── src/
    │   ├── api/              # Strongly typed API client
    │   ├── components/       # Header, StatusBadge, ComponentNode
    │   ├── types/            # TypeScript models matching backend schemas
    │   └── views/            # LandingView, DashboardView, NewProjectView, WorkspaceView
```

---

## Prerequisites

- **Node.js**: v18+ (tested with v26)
- **Python**: 3.10+ (tested with v3.14)
- **Ollama**: Local instance with `gpt-oss:120b-cloud` (or custom model specified in `.env`)

---

## Quickstart & Local Execution

### 1. Initial Setup
```bash
npm run setup
```
This initializes the `.venv` Python virtual environment, installs backend requirements, and installs frontend node modules.

### 2. Run Development Servers
```bash
npm run dev
```
Starts both the FastAPI backend on `http://127.0.0.1:8000` and the Vite frontend on `http://localhost:5173`.

Alternatively, run them separately:
```bash
npm run dev:backend   # Starts FastAPI with uvicorn reload
npm run dev:frontend  # Starts Vite frontend dev server
```

### 3. Run Automated Tests & Type Checks
```bash
npm run check
```
Runs:
1. Python unit, regression, and API tests (`npm run test:backend`)
2. TypeScript static type-checking (`npm run test:frontend`)
3. Production Vite build (`npm run build`)

---

## Supported Hardware Catalog

- **ESP32-DEVKIT-V1**: 30-pin dual-core Xtensa microcontroller with Wi-Fi/BLE, 3.3V logic level, ADC, I2C, SPI.
- **HC-SR04**: Ultrasonic distance sensor (5V supply, 5V echo output).
- **DIVIDER-5V-3V3**: 1kΩ / 2kΩ passive resistor divider protecting 3.3V ESP32 GPIOs from 5V echo signals.
- **LED-RED / LED-YELLOW / LED-GREEN**: Standard 5mm LEDs with series current-limiting resistors.
- **RES-220R / RES-330R / RES-1K / RES-2K / RES-10K**: Standard 1/4W carbon-film resistors.
- **BUZZER-PIEZO**: Active sounder module (3.3V to 5V).
- **BTN-PUSH**: Tactile momentary button with internal/external pull-up.
- **OLED-SSD1306**: 0.96 inch 128x64 monochrome I2C display.
- **DS18B20**: 1-Wire digital temperature sensor.

