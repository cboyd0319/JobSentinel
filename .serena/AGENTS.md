<!-- Owns Serena setup and semantic-navigation rules for this repository and its worktrees. -->

# Serena workflow

The root [AGENTS.md](../AGENTS.md) owns repository rules; [project.yml](project.yml)
owns shared server configuration. Follow the host's `~/.serena/WORKFLOW.md`.
Version reviewed shared configuration and explicitly approved project memories;
keep `project.local.yml`, caches and logs local. Memory updates remain deliberate
and scoped; keep memory tools available without automatic integrity checks or hooks.

## Setup

- Use the verified production-stable Serena installation and its actual CLI help.
  Do not install development releases or floating Git builds; source docs may be newer.
- Configured backends: Rust, TypeScript/JavaScript, Bash, PowerShell, TOML, YAML
  and JSON. SQL and unsupported operations use bounded native text search.
- Prepare dependencies once:
  `serena download-ls-dependencies rust typescript bash powershell toml yaml json`.
  Node/npm and `pwsh` must be available on the launching process's PATH.
- Use `rustup which --toolchain <rust-toolchain.toml version> rust-analyzer` to
  select the pinned analyzer in local `ls_specific_settings.rust.ls_path`.
  Install the missing component through that pinned Rust toolchain if necessary.
- Rust `initializationOptions.checkOnSave: false` prevents repeated Cargo checks;
  explicit repository checks remain authoritative. Activation runs no shell command.
- On POSIX, the local Bash override below restricts background analysis to
  maintained scripts. Prefetch dependencies before using this managed executable:

```yaml
ls_specific_settings:
  bash:
    ls_base_cmd: [env, "GLOB_PATTERN={init.sh,scripts/**/*.sh}", bash-language-server]
    ls_args: [start]
```

Merge local settings rather than replacing the pinned Rust override. Do not
commit machine paths, credentials or local overrides. Reconnect the owning MCP
client after changing configuration; reactivating its cached project may retain
old backends.

## Isolated agents

Give each repository subagent its own Git worktree and branch before work.
Before granting trust, compare `git rev-parse --path-format=absolute --git-common-dir`
in that worktree and the approved repository. Only a match authorizes its exact
canonical path in local `trusted_project_path_patterns`; never use a wildcard.
Inspect local overrides separately because ignored settings do not transfer.
Each agent needs its own client-launched server for that absolute root:

```text
serena start-mcp-server --context codex --project <absolute-worktree-root> --transport stdio
```

Use `--project-from-cwd` only with a verified client working directory. Call
`initial_instructions` for that agent's session and verify the reported root and
backends. Session IDs do not isolate a server's active project. Never activate
another root on a server shared with another agent. If the runtime cannot supply
an independent connection, use native file/search tools in the isolated worktree.

## Navigation and verification

Start from a known path/symbol; use a shallow overview, exact definition and
references before reading needed bodies or editing. Keep results bounded. Check
excluded tests, generated/string callers and incomplete LSP coverage separately.
Use the symbol editing tools when changing whole symbols; inspect the resulting
diff and run focused checks. Successful edits or diagnostics are not test passes.

Index once with `serena project index <absolute-root>`. For each important language,
verify a known definition/body, cross-file caller and representative tests; include
cross-package callers in this workspace. Compare expected callers with targeted text
search and inspect supported diagnostics. Empty references are not proof of no callers.
Symbol lookup is verified for all seven backends; Rust and TypeScript cross-file
references are verified. Unsupported operations use bounded text search.

Official sources: [server lifecycle](https://github.com/oraios/serena/blob/main/docs/02-usage/020_running.md)
and [project workflow](https://github.com/oraios/serena/blob/main/docs/02-usage/040_workflow.md).
