#!/bin/bash
echo "=== Testing Cache Module ==="
cargo test --lib core::scrapers::cache -- --test-threads=1 --nocapture 2>&1 | tail -5

echo ""
echo "=== Testing HTTP Client with Cache ==="
cargo test --lib core::scrapers::http_client::tests::test_get_with_cache -- --test-threads=1 --nocapture 2>&1 | tail -5
cargo test --lib core::scrapers::http_client::tests::test_cache_reduces -- --test-threads=1 --nocapture 2>&1 | tail -5

echo ""
echo "=== Build Status ==="
cargo build --lib 2>&1 | tail -3
