# CircuitMind

> **Verifiable, AI-Assisted Embedded Hardware & Firmware Engineering Workspace**

CircuitMind transforms natural-language system requirements into verified component selections, conflict-free pin allocations, deterministic electrical netlists, and production-ready firmware.

Unlike conversational chat tools or static illustration generators, CircuitMind treats every design as a formal, typed, invariant-enforcing **Project Graph**. Artificial intelligence proposes high-level system architectures and explains engineering tradeoffs, while **deterministic software algorithms** allocate physical GPIOs, enforce logic-level translation, calculate passive components, and audit electrical safety.

---

## Key Engineering Pillars

### 1. Canonical Project Graph as Single Source of Truth
Every project is anchored to an immutable, versioned project graph:
- **Components**: Catalog parts with defined electrical properties, footprints, pin counts, and voltage tolerances.
- **Pins & Nets**: Explicit signal directions (Input, Output, Bidirectional, Power, Ground, Passive) and net memberships.
- **Traceability**: Every component links to a specific functional requirement and architectural rationale.
- **Revision Invalidation**: Any mutation to the graph increments the revision number and marks previously generated artifacts for re-synthesis.

### 2. Autonomous Board & Architecture Selection
CircuitMind algorithmically evaluates controller requirements based on extracted system specifications:
- **Supported Microcontrollers**:
  - **ESP32-DEVKIT-V1** (Xtensa dual-core 240MHz, 3.3V logic, Wi-Fi/BLE, hardware I2C/SPI, ADC).
  - **Raspberry Pi Pico (RP2040)** (Dual-core ARM Cortex-M0+ 133MHz, 30 GPIOs, 8x PIO state machines).
  - **Arduino Uno R3** (ATmega328P 16MHz, native 5V TTL logic, 14 digital I/O, 6 analog inputs).
  - **STM32F405-FC** (ARM Cortex-M4F 168MHz, hardware FPU, 4x DShot timer channels for multirotor flight control).
- Automatic selection matches compute requirements, peripheral bus counts, ADC resolution, and power constraints.

### 3. Deterministic Pin Allocation & Strapping Protection
GPIO assignment is solved by a dedicated constraint solver:
- **Bootstrapping Pin Protection**: Strictly protects strapping pins (e.g., ESP32 GPIO 0, 2, 12, 15) from floating or invalid state attachments that cause bootloader crashes or flash corruption.
- **Input-Only Pin Isolation**: Reserves GPI pins (e.g., ESP32 GPIO 34–39) strictly for analog or digital inputs, never outputs.
- **Dedicated Hardware Bus Mapping**: Routes I2C (SDA/SCL), SPI (MOSI/MISO/SCK/CS), and UART (TX/RX) exclusively to peripheral-capable pins.

### 4. Algorithmic Design Rule Check (DRC)
Static electrical verification audits the circuit before physical breadboard assembly:
- **Power & Ground Short Detection**: Prevents direct shorts between VCC rails and ground nets.
- **Voltage Domain Compatibility**: Detects logic-level mismatches (e.g., 5V sensor outputs connected to 3.3V GPIOs).
- **Passive Attenuation Divider Enforcement**: Automatically calculates and requires 1kΩ / 2kΩ voltage dividers for 5V signals (such as the HC-SR04 ECHO pulse).
- **LED Current-Limiting Resistor Verification**: Warns and repairs unresisted indicator LEDs to prevent diode burnout.
- **I2C/1-Wire Bus Pull-Up Validation**: Verifies 4.7kΩ pull-up resistors on open-drain communication lines.

### 5. Dual-AI Provider Architecture
CircuitMind isolates high-parameter reasoning from deterministic hardware validation:
- **Local AI (Ollama)**: Default production provider connecting to `http://localhost:11434` (e.g., `gpt-oss:120b-cloud` or any local model). 100% private, zero external telemetry, unlimited queries.
- **Meta AI (Official Model API)**: Connects to `https://api.meta.ai/v1` using designated model `muse-spark-1.3-contributor`.
  - **Backend-Only Authentication**: Credentials (`MODEL_API_KEY`) reside exclusively in the backend environment.
  - **Stateless One-Trial Policy**: Enforces single-use trials per browser identity via cryptographically signed HMAC-SHA256 HttpOnly cookies (`cm_meta_trial`).
  - **No Database Overhead**: In-process token concurrency locks and signed state payloads guarantee zero database dependency.
  - **Zero Silent Fallbacks**: If the designated model is rejected or unavailable, the engine surfaces an explicit diagnostic error rather than silently degrading.

### 6. Production Engineering Outputs
- **KiCad PCB Netlist**: Industry-standard S-expression netlist export (`.net`) compatible with KiCad 7 and 8.
- **Bill of Materials (BOM)**: Complete parts list with reference designators (U1, S1, R1), manufacturer part numbers, footprints, and procurement specifications.
- **Target C++ Firmware**: Target-specific, non-blocking Arduino/ESP-IDF C++ firmware with explicit `#define` pin mappings directly derived from the canonical graph.
- **Step-by-Step Assembly Guide**: Step-by-step breadboard wiring instructions with color-coded jumper assignments and voltage warning notices.
- **Behavioral Simulation**: Trace-based state machine simulation verifying sensor excursions, alarm triggers, and transition timing without fabricated physical claims.

---

## System Architecture

```
                                Natural-Language Prompt
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │         Requirements Analyst          │
                     │  (Extracts I/O, constraints, states)  │
                     └───────────────────┬───────────────────┘
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │       Autonomous Board Selector       │
                     │  (ESP32, RP2040, Uno R3, STM32F405)   │
                     └───────────────────┬───────────────────┘
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │          Hardware Architect           │
                     │    (Resolves components & passives)   │
                     └───────────────────┬───────────────────┘
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │       Deterministic Pin Solver        │
                     │   (Bus mapping, strapping isolation)  │
                     └───────────────────┬───────────────────┘
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │        Electrical DRC Validator       │
                     │    (Voltage levels, shorts, dividers) │
                     └───────────────────┬───────────────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              ▼                          ▼                          ▼
    ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
    │  Canonical Graph │       │  KiCad Netlist   │       │ Target Firmware  │
    │  & Visual Canvas │       │   & Verified BOM │       │  (C++ / Arduino) │
    └──────────────────┘       └──────────────────┘       └──────────────────┘
```

---

## Supported Hardware Catalog (28 Curated Components)

| Category | Component ID | Key Specifications | Voltage | Interfaces |
| :--- | :--- | :--- | :--- | :--- |
| **MCU** | `ESP32-DEVKIT-V1` | Xtensa Dual-Core 240MHz, 30-pin DIP, Wi-Fi/BLE | 3.3V | I2C, SPI, UART, PWM, ADC |
| **MCU** | `RPI-PICO` | RP2040 Dual-Core Cortex-M0+ 133MHz, 30 GPIOs | 3.3V | I2C, SPI, UART, PWM, PIO |
| **MCU** | `ARDUINO-UNO-R3` | ATmega328P 16MHz, 14 digital I/O, 6 ADC | 5.0V | I2C, SPI, UART, PWM |
| **MCU** | `STM32F405-FC` | Cortex-M4F 168MHz, 4x DShot Motor Timer Outputs | 3.3V | SPI, I2C, UART, Timer PWM |
| **Sensor** | `HC-SR04` | Ultrasonic distance sensor (2cm – 400cm range) | 5.0V | Digital Trig/Echo |
| **Sensor** | `DS18B20` | High-precision digital temperature sensor (±0.5°C) | 3.0V–5.5V | 1-Wire |
| **Sensor** | `DHT22` | Digital relative humidity and temperature sensor | 3.3V–5.0V | 1-Wire Custom |
| **Sensor** | `MPU6050` | 6-axis IMU (3-axis Gyroscope + 3-axis Accelerometer)| 3.3V | I2C (0x68) |
| **Sensor** | `BMP280` | Barometric pressure & altitude telemetry sensor | 3.3V | I2C / SPI |
| **Sensor** | `LDR-ANALOG` | Light-dependent photoresistor with pull-down | 3.3V–5.0V | Analog ADC |
| **Sensor** | `POT-10K` | 10kΩ linear rotary potentiometer | 3.3V–5.0V | Analog ADC |
| **Display** | `OLED-SSD1306` | 0.96" 128x64 monochrome graphic OLED display | 3.3V–5.0V | I2C (0x3C) |
| **Display** | `LCD-1602-I2C` | 16x2 character alphanumeric display with PCF8574 | 5.0V | I2C (0x27) |
| **Actuator**| `BUZZER-PIEZO` | Active sounder transducer (2.3kHz audible tone) | 3.3V–5.0V | Digital Output |
| **Actuator**| `SERVO-SG90` | 180° micro servo actuated by 50Hz PWM signal | 4.8V–6.0V | 50Hz PWM |
| **Actuator**| `RELAY-1CH` | Optocoupled 5V relay module for AC/DC switching | 5.0V | Digital Input |
| **Actuator**| `MOTOR-BLDC-2207`| 2450KV Brushless DC Motor (DShot600 protocol) | 12.0V–24V | DShot PWM |
| **Actuator**| `ESC-4IN1-30A` | 4-in-1 30A Electronic Speed Controller | 11.1V–22.2V| DShot / PWM |
| **Passive** | `DIVIDER-5V-3V3`| 1kΩ / 2kΩ passive resistor divider for 5V $\to$ 3.3V| Passive | Resistor Network |
| **Passive** | `LED-RED` | 5mm diffused red LED (2.0V forward drop, 15mA) | 2.0V | Anode/Cathode |
| **Passive** | `LED-YELLOW` | 5mm diffused yellow LED (2.1V forward drop, 15mA) | 2.1V | Anode/Cathode |
| **Passive** | `LED-GREEN` | 5mm diffused green LED (2.2V forward drop, 15mA) | 2.2V | Anode/Cathode |
| **Passive** | `BTN-PUSH` | 6mm tactile momentary push button | Passive | Normally Open |
| **Passive** | `RES-220R` | 220Ω 1/4W 5% current-limiting resistor | Passive | Axial THT |
| **Passive** | `RES-330R` | 330Ω 1/4W 5% current-limiting resistor | Passive | Axial THT |
| **Passive** | `RES-1K` | 1kΩ 1/4W 5% carbon film resistor | Passive | Axial THT |
| **Passive** | `RES-2K` | 2kΩ 1/4W 5% carbon film resistor | Passive | Axial THT |
| **Passive** | `RES-4K7` | 4.7kΩ I2C/1-Wire pull-up resistor | Passive | Axial THT |
| **Passive** | `RES-10K` | 10kΩ pull-up / pull-down resistor | Passive | Axial THT |

---

## Directory Structure

```
CircuitMind/
├── .env                      # Active runtime environment configuration (gitignored)
├── .env.example              # Documented environment template
├── package.json              # Root workspace management scripts
├── scripts/                  # Automated verification and launcher scripts
│   ├── setup.sh              # Python virtual environment & frontend dependency setup
│   ├── dev.sh                # Launches backend (8000) & frontend (5173) concurrently
│   ├── dev-backend.sh        # FastAPI uvicorn daemon with hot reload
│   ├── test-backend.sh       # Pytest test runner
│   └── verify.sh             # Full CI/CD verification script (51 tests + Vite build)
├── backend/                  # FastAPI + Pydantic backend service
│   ├── pyproject.toml        # Backend package metadata & dependencies
│   ├── app/
│   │   ├── config.py         # App settings & environment variable loaders
│   │   ├── main.py           # FastAPI ASGI entrypoint & CORS middleware
│   │   ├── api/
│   │   │   └── routes.py     # Health, Catalog, Projects, Copilot, Simulation APIs
│   │   ├── ai/
│   │   │   ├── copilot.py    # Dual-provider Copilot orchestration service
│   │   │   ├── meta_client.py# Meta Model API client (muse-spark-1.3-contributor)
│   │   │   ├── ollama_client.py # Local Ollama HTTP client
│   │   │   ├── trial_manager.py # Stateless HMAC-SHA256 browser trial manager
│   │   │   └── prompts.py    # Structured engineering prompts
│   │   ├── domain/
│   │   │   ├── models.py     # Typed Project Graph, Component, Pin, Net models
│   │   │   ├── catalog.py    # 28-component verified hardware database
│   │   │   └── drc_rules.py  # Static Design Rule Check definitions
│   │   ├── services/
│   │   │   ├── board_selector.py # Autonomous MCU selection engine
│   │   │   ├── pin_allocator.py  # Constraint-based GPIO routing solver
│   │   │   ├── validator.py      # Electrical DRC execution engine
│   │   │   ├── firmware_gen.py   # Target C++ firmware synthesis engine
│   │   │   ├── artifact_gen.py   # KiCad netlist, BOM, and assembly guides
│   │   │   └── simulator.py      # Multi-channel behavioral simulation engine
│   │   └── storage/
│   │       └── repository.py     # Project persistence layer
│   └── tests/                # 51 comprehensive automated test suites
└── frontend/                 # React 18 + TypeScript + Vite + Tailwind CSS IDE
    ├── index.html            # Single page app entrypoint
    ├── src/
    │   ├── api/client.ts     # Strongly typed API client with credentials support
    │   ├── types/index.ts    # Frontend TypeScript models
    │   ├── components/       # Header, StatusBadge, ComponentNode, Navigation
    │   └── views/
    │       ├── LandingView.tsx      # Aceternity-inspired product website
    │       ├── DashboardView.tsx    # Project browser & management
    │       ├── NewProjectView.tsx   # Project prompt submission & MCU selector
    │       ├── WorkspaceView.tsx    # Multi-tab engineering workspace
    │       └── panels/              # Canvas, Netlist, BOM, DRC, Firmware, Guide panels
```

---

## Installation & Quickstart

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10.0 or higher
- **Local Ollama** *(optional)*: For offline AI inference (`http://localhost:11434`)

### 1. One-Click Setup
```bash
npm run setup
```
This provisions a Python `.venv` virtual environment, installs backend dependencies, and installs all frontend npm packages.

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

To enable Meta AI cloud inference, add your official API key in `.env`:
```env
MODEL_API_KEY=your_meta_api_key_here
META_MODEL_ID=muse-spark-1.3-contributor
```
*(If omitted, CircuitMind automatically uses local Ollama without requiring any paid API key).*

### 3. Launch Development Servers
```bash
npm run dev
```
- **Frontend IDE**: `http://localhost:5173`
- **Backend REST API**: `http://127.0.0.1:8000`
- **Interactive OpenAPI Docs**: `http://127.0.0.1:8000/docs`

---

## Automated Verification & Tests

CircuitMind includes a comprehensive test suite of **51 automated tests** covering domain invariants, pin allocation constraints, DRC detection, multi-board selection, and dual-provider authentication.

Run the full verification pipeline:
```bash
bash scripts/verify.sh
```

Or execute tests individually:
```bash
# Run 51 backend pytest suites
npm run test:backend

# Run frontend TypeScript type-checker
npm run test:frontend

# Run production frontend build
npm run build
```

---

## Core REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Returns service status, connected Ollama model, and Meta API state. |
| `GET` | `/api/catalog` | Lists all 28 supported hardware components with pinouts and voltage specs. |
| `GET` | `/api/projects` | Lists all projects with revisions and timestamps. |
| `POST`| `/api/projects` | Synthesizes a new circuit design from natural language requirements. |
| `GET` | `/api/projects/{id}` | Retrieves full canonical project graph, netlist, BOM, and firmware. |
| `POST`| `/api/projects/{id}/copilot` | Queries Copilot with `provider: "local" \| "meta"`. |
| `GET` | `/api/ai/meta/trial-status` | Inspects and issues stateless HMAC-signed trial cookies. |
| `POST`| `/api/projects/{id}/simulate` | Executes multi-channel behavioral simulation trace. |
| `POST`| `/api/projects/{id}/auto-repair`| Applies bounded DRC auto-repair mutations. |

---

## Engineering Limitations & Disclosures

1. **Simulation vs. Physical Reality**: CircuitMind's behavioral simulator validates logical state machines, threshold triggers, and pin mappings. It does **not** replace continuous-time SPICE solvers, RF transmission line impedance analyzers, or electromagnetic compatibility (EMC) testing.
2. **Deterministic Safety Guarantee**: Circuit safety is guaranteed by algorithmic constraint rules and DRC verification, **never** by raw LLM probabilistic token generation alone.
3. **Physical Prototyping Review**: Always review generated schematic connections and verify voltage rails with a digital multimeter before applying power to physical hardware.

---

## License

CircuitMind is licensed under the [Apache 2.0 License](LICENSE).
