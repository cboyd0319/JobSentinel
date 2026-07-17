# Architecture Compatibility Pointer

The human-readable repository shape is summarized by
[the repository architecture guide](../architecture/repository.md). Executable ownership is
split without overlap: `scripts/harness/contracts/repository-structure.json` owns roots, units,
entrypoints, and source limits; `scripts/harness/contracts/architecture.json`
owns the Rust graph, technology dependencies, and retired architecture paths.

Detailed feature and migration documents may explain a bounded implementation
slice, but they cannot redefine either executable owner.
