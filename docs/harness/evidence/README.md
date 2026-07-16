# Harness Evidence

This directory stores compact evidence used for durable feature transitions.
Use one file per transition or bounded verification checkpoint. Include:

- feature id and revision or explicit working-tree checkpoint;
- UTC timestamp and platform;
- commands, exit status, and relevant result;
- skipped checks, caveats, and live-platform gaps; and
- the acceptance behavior the evidence proves.

Do not store raw command logs, screenshots with private data, credentials,
environment dumps, machine-specific home paths, or transcripts. Root state keeps
only evidence pointers.

The pre-standard ledger is archived at
`docs/harness/archive/evidence-log-pre-standard-2026-07-14.md`. The former
`docs/harness/evidence-log.md` path is retired and must not return.
