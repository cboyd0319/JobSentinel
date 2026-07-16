# Architecture Compatibility Pointer

The human-readable repository shape is summarized by
[the root architecture guide](../../ARCHITECTURE.md). Executable ownership is
split without overlap: `repository-structure-policy.json` owns roots, units,
entrypoints, and source limits; `validation/repository_architecture_contract.json`
owns the Rust graph, technology dependencies, and retired architecture paths.

Detailed feature and migration documents may explain a bounded implementation
slice, but they cannot redefine either executable owner.
