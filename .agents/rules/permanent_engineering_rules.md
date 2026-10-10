# CircuitMind — Permanent Engineering Rules

These rules apply to every change in this repository. Read this file before modifying code.

## 1. Source of truth
- The persisted, versioned `ProjectSpec` is the canonical representation of a project.
- The component catalogue is the source of component metadata.
- The project graph is the source of component instances and connections.
- Firmware, diagrams, BOMs, guides, and exports are generated artifacts derived from the project graph.
- The UI renders persisted application state; it must not invent project data.
- Chat responses are not evidence that a project modification succeeded.

## 2. Model-generated data
- Treat all LLM output as untrusted input.
- Require structured output matching the current schema.
- Validate, normalize, and resolve catalogue references before applying changes.
- Preserve every user requirement, including unresolved requirements.
- Never silently substitute a default project or discard a requested component.
- Never mark an operation successful before its implementation succeeds.
- Keep provider-specific code behind a common interface.
- Handle malformed output, timeouts, missing credentials, and provider failures explicitly.

## 3. Project consistency
- Every project has a stable ID and a version.
- Every component instance has a stable instance ID and a catalogue reference.
- Every connection references valid component instances and pin identifiers in the project schema.
- Generated artifacts must identify the project version from which they were produced.
- A stale asynchronous response must never overwrite a newer project version.
- Changing the project invalidates affected generated artifacts.
- Do not claim hardware correctness merely because data passes schema validation.

## 4. Wokwi integration and documentation
- Before implementing or changing Wokwi-specific behavior, consult the relevant official documentation.
  - Home: [https://docs.wokwi.com/](https://docs.wokwi.com/)
  - Diagram format: [https://docs.wokwi.com/diagram-format](https://docs.wokwi.com/diagram-format)
  - CLI usage: [https://docs.wokwi.com/wokwi-ci/cli-usage](https://docs.wokwi.com/wokwi-ci/cli-usage)
  - MCP support: [https://docs.wokwi.com/wokwi-ci/mcp-support](https://docs.wokwi.com/wokwi-ci/mcp-support)
- Rules:
  - Use the documentation relevant to the exact feature being changed.
  - Verify supported fields, part identifiers, configuration formats, authentication requirements, and tool capabilities.
  - Do not invent Wokwi APIs, CLI flags, MCP tools, or embedding functionality.
  - Do not assume MCP provides a visual simulator.
  - Record relevant documentation URLs and confirmed capabilities in `docs/integrations/wokwi.md`.
  - Record the date of the last documentation review and any known limitations.
  - Recheck the official documentation when integration behavior changes or an implementation depends on a previously unverified capability.
  - Never describe an untested integration as working.
  - Do not fetch the entire documentation repeatedly for unrelated tasks. Maintain a concise, source-linked integration reference and refresh it when necessary.

## 5. Component catalogue
- Store component definitions in a data-driven catalogue.
- Use stable IDs and explicit metadata provenance.
- Do not invent datasheets, electrical specifications, board support, or simulator support.
- Represent unknown capabilities as unknown.
- Keep visual assets, simulator identifiers, firmware dependencies, and hardware metadata separate.
- Add catalogue entries through the catalogue service or data files, not hardcoded UI branches.

## 6. Generated firmware and diagrams
- Generate firmware from the selected board, requirements, and resolved components.
- Generate simulator diagrams from the canonical project graph through provider-specific adapters.
- Use valid language identifiers and typed pin representations.
- Keep database IDs separate from source-code identifiers.
- Do not generate connections or components from unrelated example projects.
- Never label generated firmware as compiled unless a real compiler succeeded.
- Never label a simulation as passed unless real execution evidence supports that status.

## 7. Persistence and memory
- Use the established storage abstraction.
- For browser-local data, use IndexedDB for projects, conversations, firmware, and engineering memory.
- Do not store large application records in cookies.
- Preserve a migration path for server-backed SQLite or other storage providers.
- DMAI is the engineering memory layer, not just chat history.
- Record project decisions, changes, failures, fixes, and execution evidence with provenance.
- Keep memory isolated by project.
- Never invent historical events or silently upload local data.

## 8. UI and interaction
- Keep the interface compact, professional, responsive, and consistent.
- Use the established icon library; do not use emoji icons.
- Remove dead controls, duplicate state, fake status indicators, and redundant UI.
- Every control must perform its advertised action or be explicitly disabled.
- Render Markdown safely and correctly.
- Toasts must reflect actual operation outcomes.
- Preserve existing working functionality.

## 9. Required development workflow
For every non-trivial change:
1. Inspect the existing implementation.
2. Identify the root cause or precise requirement.
3. Make the smallest coherent change.
4. Add or update a regression test.
5. Run relevant tests and checks.
6. Inspect affected user workflows.
7. Report what changed, what passed, and what remains unverified.
- Do not suppress errors, replace failures with mock data, or claim unexecuted tests passed.

## 10. Completion standard
A feature is complete only when:
- Its data flow is implemented.
- Its errors are handled.
- Its persisted state is correct.
- Its UI reflects actual state.
- Its relevant regression tests pass.
- Its external capabilities are verified to the extent claimed.
- When blocked, report the exact blocker and preserve a coherent, usable application.
