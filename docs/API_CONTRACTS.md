# CircuitMind — API Contracts

All endpoints return JSON responses. Errors use standard HTTP status codes and structured detail objects:
`{"detail": "Error description", "error_code": "STRING_IDENTIFIER"}`.

## Endpoints

### 1. Health & Status
- `GET /api/health`
  - Returns: `{ "status": "ok", "version": "1.0.0", "ollama_status": "connected" | "unavailable", "ollama_model": string }`

### 2. Catalog
- `GET /api/catalog`
  - Returns list of catalog parts with pins, electrical specs, and roles.
- `GET /api/catalog/{catalog_id}`
  - Returns detailed definition of a specific catalog part.

### 3. Projects
- `GET /api/projects`
  - List all projects with ID, name, description, revision, updated timestamp.
- `POST /api/projects`
  - Create a new project. Body: `{ "name": string, "description": string, "target_board"?: string }`
- `GET /api/projects/{project_id}`
  - Retrieve full project state (components, nets, revision, validation status).
- `PUT /api/projects/{project_id}`
  - Update project metadata or requirements.
- `DELETE /api/projects/{project_id}`
  - Delete project.

### 4. Requirements & Pipeline
- `POST /api/pipeline/parse-requirements`
  - Body: `{ "prompt": string }`
  - Parses natural language into structured requirements using local Ollama.
- `POST /api/projects/{project_id}/synthesize`
  - Runs full pipeline Stages A through G on the project requirements:
    1. Requirements extraction
    2. Architecture proposal
    3. Component resolution from catalog
    4. Deterministic pin allocation
    5. Net generation
    6. Electrical validation
    7. Artifact generation (BOM, Netlist, Firmware, Assembly guide)
  - Increments project revision and stores updated graph.

### 5. Graph Mutations (Direct & Copilot)
- `POST /api/projects/{project_id}/components`
  - Add component instance to graph. Body: `{ "catalog_id": string, "name"?: string, "position"?: { "x": float, "y": float } }`
- `DELETE /api/projects/{project_id}/components/{instance_id}`
  - Remove component instance and connected nets.
- `POST /api/projects/{project_id}/nets`
  - Add or update a net. Body: `{ "name": string, "net_type": string, "pins": [ {"instance_id": string, "pin_id": string} ] }`
- `DELETE /api/projects/{project_id}/nets/{net_id}`
  - Remove a net.

### 6. Validation & Artifacts
- `GET /api/projects/{project_id}/validation`
  - Runs deterministic DRC on current graph and returns findings.
- `GET /api/projects/{project_id}/artifacts/bom`
  - Returns structured Bill of Materials with unit counts and catalog references.
- `GET /api/projects/{project_id}/artifacts/netlist`
  - Returns netlist in JSON and KiCad-compatible text format.
- `GET /api/projects/{project_id}/artifacts/firmware`
  - Returns generated C++/Arduino firmware and pin mapping headers.
- `GET /api/projects/{project_id}/artifacts/assembly-guide`
  - Returns human-readable step-by-step assembly and safety instructions.

### 7. Behavioral Simulation
- `POST /api/projects/{project_id}/simulate`
  - Body: `{ "scenario": string, "parameters"?: dict }`
  - Runs deterministic state-machine simulation and returns step-by-step trace.

### 8. Copilot Interaction
- `POST /api/projects/{project_id}/copilot`
  - Body: `{ "message": string }`
  - Ollama analyzes user request in context of project graph, returns answer and optional structured graph mutation actions.
