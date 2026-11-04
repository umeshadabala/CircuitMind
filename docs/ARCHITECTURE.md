# CircuitMind — Architecture & Engineering Specification

## 1. Executive Summary

CircuitMind is an AI-assisted electronics engineering workspace designed to convert natural-language product concepts into structured, verified, and revision-controlled embedded systems designs.

Unlike conversational chat tools or static illustration generators, CircuitMind treats the hardware project as a formal, typed, invariant-enforcing **Project Graph**. Every user action, AI suggestion, and pin-assignment step operates on this canonical graph with explicit revision invalidation and deterministic electrical validation.

## 2. Monorepo Structure

```
CircuitMind/
├── .env.example              # Documented local runtime environment configuration
├── .gitignore                # Ignoring python caches, node_modules, sqlite databases, env files
├── package.json              # Monorepo scripts (dev, build, test, check)
├── docs/                     # Specifications, architecture, contracts, limitations
│   ├── ARCHITECTURE.md       # Core architectural principles and domain model
│   ├── DOMAIN_MODEL.md       # Graph entities, pin definitions, nets, invariants
│   ├── API_CONTRACTS.md      # REST API endpoints and schema definitions
│   └── LIMITATIONS.md        # Explicit scope boundaries and unverified claims
├── scripts/                  # Reproducible development, test, and startup scripts
│   ├── setup.sh              # Setup virtualenv and frontend dependencies
│   ├── dev.sh                # Launch backend & frontend concurrently
│   └── verify.sh             # Full test and type-check runner
├── backend/                  # FastAPI + Pydantic + SQLite backend
│   ├── pyproject.toml        # Dependencies and build metadata
│   ├── requirements.txt      # Pinned dependencies
│   ├── app/
│   │   ├── main.py           # FastAPI application entrypoint
│   │   ├── config.py         # App settings & Ollama configurations
│   │   ├── domain/           # Pure domain models and graph structures
│   │   │   ├── models.py     # Canonical Project, Component, Pin, Net, Revision
│   │   │   ├── catalog.py    # Curated versioned hardware catalog
│   │   │   └── drc_rules.py  # Design Rule Check (DRC) rule definitions
│   │   ├── services/         # Engineering domain logic (stateless or repo-backed)
│   │   │   ├── pin_allocator.py     # Deterministic GPIO and bus allocator
│   │   │   ├── validator.py         # Electrical and logical DRC validator
│   │   │   ├── net_generator.py     # Deterministic net generation from components
│   │   │   ├── firmware_gen.py      # Target-specific firmware generator
│   │   │   ├── simulator.py         # Honest behavioral simulation engine
│   │   │   ├── artifact_gen.py      # BOM, Netlist, Assembly guide derivation
│   │   │   └── pipeline.py          # Stages A->G requirements-to-design pipeline
│   │   ├── ai/               # Local Ollama client and structured output schemas
│   │   │   ├── ollama_client.py     # Resilient local Ollama HTTP client
│   │   │   ├── prompts.py           # Strict system prompts and schemas
│   │   │   └── copilot.py           # Engineering copilot mutating graph via actions
│   │   ├── storage/          # SQLite persistence and project revisions
│   │   │   ├── database.py          # SQLite engine and session management
│   │   │   └── repository.py        # Project repository with revision control
│   │   └── api/              # FastAPI router endpoints
│   │       ├── projects.py          # CRUD & revision management
│   │       ├── pipeline.py          # Requirements parsing & design synthesis
│   │       ├── catalog.py           # Catalog inspection
│   │       ├── simulation.py        # Behavioral simulation runs
│   │       └── copilot.py           # Copilot dialogue & graph actions
│   └── tests/                # Automated pytest suite
│       ├── test_domain.py           # Invariants and model serialization
│       ├── test_catalog.py          # Catalog integrity and component specs
│       ├── test_pin_allocator.py    # Pin allocation constraints and strapping pins
│       ├── test_validator.py        # DRC electrical rules and edge cases
│       ├── test_firmware_gen.py     # Firmware generation and pin mapping checks
│       ├── test_simulator.py        # Behavioral simulator state-machines
│       ├── test_pipeline.py         # Pipeline stages with mocked Ollama
│       ├── test_regressions.py      # 3 distinct projects (Anti-theft, Temp, Traffic)
│       └── test_api.py              # API contract validation and error handling
└── frontend/                 # React + TypeScript + Vite + React Flow
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── theme.css
    │   ├── types/            # TypeScript interfaces aligned with Pydantic models
    │   ├── api/              # Strongly typed API client
    │   ├── components/       # Reusable UI primitives (retro-industrial style)
    │   │   ├── Header.tsx
    │   │   ├── Badge.tsx
    │   │   ├── StatusPill.tsx
    │   │   └── Modal.tsx
    │   └── views/            # Main application views
    │       ├── LandingView.tsx
    │       ├── DashboardView.tsx
    │       ├── NewProjectView.tsx
    │       └── WorkspaceView.tsx
    │           ├── CircuitCanvas.tsx       # React Flow circuit view
    │           ├── ComponentInspector.tsx  # Selected part inspector & pinout
    │           ├── NetlistPanel.tsx        # Netlist view
    │           ├── BomPanel.tsx            # Bill of Materials
    │           ├── FirmwarePanel.tsx       # C++/Arduino firmware viewer
    │           ├── ValidationPanel.tsx     # DRC findings with actionable fixes
    │           ├── SimulationPanel.tsx     # Behavioral simulation runner
    │           ├── AssemblyGuidePanel.tsx  # Step-by-step wiring instructions
    │           ├── SettingsPanel.tsx       # Project metadata & Ollama status
    │           └── CopilotDrawer.tsx       # Engineering assistant drawer
```

## 3. Core Architectural Invariants

1. **Graph as Single Source of Truth**: UI coordinates and rendering properties are strictly presentation metadata. Electrical identity is determined solely by component instance IDs, pin identifiers, and explicit net membership.
2. **Deterministic Allocation & Validation**: The pin allocator and DRC engine are 100% deterministic algorithms. AI is never trusted to assign raw GPIO pins or claim electrical compliance without algorithmic verification.
3. **Strict Revision Integrity**: Every mutation (adding a component, rewiring, editing requirements) increments the integer `revision`. Any downstream artifact (firmware, simulation run, validation report) generated at revision $R$ is marked `stale` if the current project revision is $R' > R$.
4. **Honest Simulation & Verification**: Local simulation executes genuine state-machine and scenario checks with step-by-step trace output. No fabricated test results or fake "compilation succeeded" claims are emitted unless an actual tool was executed.
5. **Zero Remote/Paid AI Dependencies**: Inference runs exclusively against a local Ollama instance (`http://localhost:11434`). If Ollama is unreachable, explicit recoverable error diagnostics are presented to the user.
