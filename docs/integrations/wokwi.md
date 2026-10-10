# Wokwi Integration Reference

*Last Documentation Review Date: 2026-10-10*

## 1. Official Documentation Sources
- **Documentation Home**: [https://docs.wokwi.com/](https://docs.wokwi.com/)
- **Diagram File Format**: [https://docs.wokwi.com/diagram-format](https://docs.wokwi.com/diagram-format)
- **Wokwi CLI Usage**: [https://docs.wokwi.com/wokwi-ci/cli-usage](https://docs.wokwi.com/wokwi-ci/cli-usage)
- **Model Context Protocol (MCP) Support**: [https://docs.wokwi.com/wokwi-ci/mcp-support](https://docs.wokwi.com/wokwi-ci/mcp-support)
- **Wokwi Elements Catalog**: [https://elements.wokwi.com/](https://elements.wokwi.com/)

---

## 2. Verified Capabilities

### A. `diagram.json` Format
- **Root Fields**:
  - `"version"`: Integer, always `1`.
  - `"author"`: String identifier.
  - `"editor"`: `"wokwi"`.
  - `"parts"`: Array of component definitions.
  - `"connections"`: Array of pin-to-pin wiring connections.
  - Optional `"serialMonitor"` configuration.
- **Part Object**:
  - `id` (required): Unique string identifier for the instance (e.g. `"board"`, `"mpu6050-1"`).
  - `type` (required): Canonical Wokwi part type (e.g. `"wokwi-arduino-uno"`, `"wokwi-esp32-devkit-v1"`, `"wokwi-mpu6050"`, `"wokwi-buzzer"`, `"wokwi-servo"`).
  - `left`, `top`: Pixel layout coordinates.
  - `attrs`: Key-value object for part attributes (e.g. `{"color": "red"}`).
  - `rotate`: Rotation angle in degrees (e.g. `90`, `180`).
  - `hide`: Boolean.
- **Connection Format**:
  - Array of 4 elements: `["<part1>:<pin1>", "<part2>:<pin2>", "<color>", [<routing_instructions>]]`.
  - Wire colors: `"red"` (power/VCC), `"black"` (ground/GND), `"blue"` (I2C SDA), `"orange"` (I2C SCL, PWM, digital), `"purple"` (analog), `"green"`.

### B. `wokwi.toml` Configuration
- Placed in project root alongside `diagram.json`.
- Minimal structure:
  ```toml
  [wokwi]
  version = 1
  firmware = "firmware/sketch.bin"  # or sketch.hex for AVR
  elf = "firmware/sketch.elf"
  ```
- Optional `gdbServerPort` enables GDB remote debugging.

### C. Wokwi CLI Tooling (`wokwi-cli`)
- **Version**: Tested with `wokwi-cli v0.28.1`.
- **Diagram Linting**:
  ```bash
  wokwi-cli lint diagram.json
  ```
  Validates component part types against the active registry, verifies pin names, and detects duplicate IDs or unconnected nets.
- **Headless Simulation**:
  ```bash
  wokwi-cli <project_directory> --timeout <ms> --expect-text <str> --fail-text <str>
  ```
  Streams virtual serial UART output, asserts test text expectations, and exits with code 0 on match or 42 on timeout.
- **Authentication**:
  - Environment variable: `WOKWI_CLI_TOKEN`.
  - Token format: Starts with `wok_`, exactly 44 characters total.

### D. Model Context Protocol (MCP) Server
- **Command**: `wokwi-cli mcp`
- **Transport**: Standard I/O (`stdio`).
- **Capability**: Enables AI agents to run headless simulation runs, monitor serial output, and inspect virtual hardware.
- **Critical Boundary**: MCP does **not** provide an embedded visual browser simulator. CircuitMind provides its own interactive SVG / HTML canvas for visual layout.

---

## 3. Known Limitations & Constraints
1. **Compilation Prerequisite**: Full physical CPU emulation with `wokwi-cli` requires pre-compiled binary firmware (`.hex` for AVR, `.bin` / `.elf` for ESP32/RP2040). Raw `.ino` / `.cpp` source files require an external toolchain (`arduino-cli` or `esphome`/`platformio`) before CLI simulation can run.
2. **Behavioral Simulation Fallback**: When an offline environment or uncompiled sketch is present, CircuitMind executes deterministic behavioral simulation (`circuitmind_behavioral`) rather than claiming an uncompiled binary ran inside Wokwi.
3. **Board Part Types**:
   - `wokwi-arduino-uno` is officially registered.
   - `wokwi-esp32-devkit-v1` is functional in simulation and recognized by the linter, but produces a benign registry notice recommending `board-esp32-devkit-c-v4` for official devkit pin layouts.
4. **Simulator Support Provenance**: Only parts listed in the verified catalog with valid `wokwi_part_id` are exported to Wokwi diagrams. Uncatalogued components are recorded as `status="unresolved"` and excluded from `diagram.json` until supported.
