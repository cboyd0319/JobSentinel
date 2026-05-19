# Harness Engineering Sources

Research date: 2026-05-19.

This file records the guidance used to align JobSentinel with current harness
engineering practice. Source claims can change, so refresh this file before
large harness redesigns.

## Primary Guidance

| Source | Date | Relevant guidance | JobSentinel adoption |
| ------ | ---- | ----------------- | -------------------- |
| OpenAI, "Harness engineering: leveraging Codex in an agent-first world" | 2026-02-11 | Use a short `AGENTS.md` as a table of contents, keep structured docs as the system of record, expose app state and observability to agents, enforce architecture with mechanical checks, and run cleanup loops against entropy. | Root `AGENTS.md`, `docs/harness/`, plan templates, `npm run harness:check`, tech debt tracker. |
| Anthropic, "Harness design for long-running application development" | 2026-03-24 | Decompose long work, preserve state through structured handoffs, use planner/generator/evaluator loops, and reset context when long sessions lose coherence. | Exec plan format, change contracts, completion handoff, evaluator-style review checklist. |
| Martin Fowler, "Harness engineering for coding agent users" | 2026-04-02 | Build feedforward guides and feedback sensors; combine deterministic checks with model-based review; regulate maintainability, architecture fitness, and behavior. | Verification matrix separates guides and sensors by change type. |
| Red Hat Developer, "Harness engineering: Structured workflows for AI-assisted development" | 2026-04-07 | Give agents real code maps, use impact maps and task templates, make the repo the source of truth, and treat prompts, skills, and MCP configs as versioned software. | Change contract template and docs source-of-truth rules. |
| Thoughtworks, "Harness engineering and agent feedback: Exploring AI coding sensors" | 2026-05-13 | Sensors are underused; deterministic tools such as ESLint, Semgrep, dependency checks, coverage, and mutation testing improve agent quality over time. | Sensor matrix and future Semgrep/dependency-cruiser debt items. |
| LangChain, "The Anatomy of an Agent Harness" | 2026-03-10 | Agent equals model plus harness; harness includes prompts, tools, MCP, infrastructure, orchestration, middleware, state, and feedback loops. | Harness definition and component map. |
| LangChain Deep Agents harness docs | 2026 | Useful harness primitives include planning, filesystem permissions, subagents, context management, code execution, human-in-the-loop gates, skills, memory, and profiles. | Permissions and HITL requirements in agent guide and verification matrix. |
| AGENTS.md open format | 2026 | Provide a predictable repo-local agent instructions file with setup, test, style, and security guidance; use nested files for subprojects when needed. | Root `AGENTS.md`; future nested files if `src-tauri` or E2E guidance grows. |

## Emerging Research To Track

| Source | Date | Signal | Status |
| ------ | ---- | ------ | ------ |
| "AI Harness Engineering: A Runtime Substrate for Foundation-Model Software Agents" | 2026-05-13 | Formalizes task spec, context selection, tool access, memory, task state, observability, failure attribution, verification, permissions, entropy auditing, and intervention recording. | Adopted as checklist language, not as formal runtime yet. |
| "Agentic Harness Engineering: Observability-Driven Automatic Evolution of Coding-Agent Harnesses" | 2026-04-28, v4 2026-05-18 | Treats harness edits as falsifiable contracts with component, experience, and decision observability. | Future work: store compact run evidence for recurring harness fixes. |
| "Code as Agent Harness" | 2026-05-18 | Frames code as substrate for planning, memory, tool use, feedback, multi-agent coordination, review, and verification. | Informational; no immediate repo change. |

## Local Decisions

- Do not put all guidance in `AGENTS.md`. It stays short.
- Do not rely on agent-written tests alone. Use existing deterministic sensors.
- Do not use raw chat as durable project memory. Put stable facts in docs,
  plans, tests, scripts, or issues.
- Do not add broad new tools until current checks are wired and visible.
- Prefer one repo-native harness check over scattered manual instructions.

## Refresh Checklist

When refreshing this guidance:

1. Re-check OpenAI, Anthropic, Martin Fowler, Thoughtworks, Red Hat, LangChain,
   and AGENTS.md sources.
2. Add new dated source rows only when they change repo practice.
3. Move superseded guidance into local decisions or remove it.
4. Run `npm run harness:check`.
