use super::*;
use crate::test_support::{
    insert_current_test_jobs, insert_numbered_current_test_jobs, migrated_pool,
};

#[path = "async_tests/query_tests.rs"]
mod query_tests;
#[path = "async_tests/trend_compute_tests.rs"]
mod trend_compute_tests;
#[path = "async_tests/trend_edge_tests.rs"]
mod trend_edge_tests;
