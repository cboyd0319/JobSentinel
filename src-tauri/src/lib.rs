// Clippy configuration - allow common patterns that are intentional
#![allow(clippy::module_name_repetitions)]
#![allow(clippy::must_use_candidate)]
#![allow(clippy::missing_errors_doc)]
#![allow(clippy::missing_panics_doc)]
#![allow(clippy::doc_markdown)]
#![allow(clippy::similar_names)]
#![allow(clippy::too_many_lines)]
#![allow(clippy::needless_raw_string_hashes)]
#![allow(clippy::unreadable_literal)]
#![allow(clippy::cast_possible_truncation)]
#![allow(clippy::cast_sign_loss)]
#![allow(clippy::cast_precision_loss)]
#![allow(clippy::cast_lossless)]
#![allow(clippy::unused_async)]
#![allow(clippy::unused_self)]
#![allow(clippy::redundant_closure_for_method_calls)]
#![allow(clippy::struct_excessive_bools)]
#![allow(clippy::fn_params_excessive_bools)]
#![allow(clippy::if_not_else)]
#![allow(clippy::items_after_statements)]
#![allow(clippy::match_same_arms)]
#![allow(clippy::match_wildcard_for_single_variants)]
#![allow(clippy::option_if_let_else)]
#![allow(clippy::map_unwrap_or)]
#![allow(clippy::uninlined_format_args)]
#![allow(clippy::single_match_else)]
#![allow(clippy::manual_let_else)]
#![allow(clippy::redundant_else)]
#![allow(clippy::unnecessary_wraps)]
#![allow(clippy::return_self_not_must_use)]
#![allow(clippy::derive_partial_eq_without_eq)]
#![allow(clippy::significant_drop_tightening)]
#![allow(clippy::bool_to_int_with_if)]
#![allow(clippy::struct_field_names)]
#![allow(clippy::used_underscore_binding)]
#![allow(clippy::format_push_string)]
#![allow(clippy::cast_possible_wrap)]
#![allow(clippy::missing_const_for_fn)]
#![allow(clippy::needless_pass_by_value)]
#![allow(clippy::manual_midpoint)]
#![allow(clippy::match_bool)]
#![allow(clippy::default_trait_access)]
#![allow(clippy::ref_option)]
#![allow(clippy::iter_without_into_iter)]
#![allow(clippy::comparison_chain)]
#![allow(clippy::use_self)]
#![allow(clippy::ignored_unit_patterns)]
#![allow(clippy::implicit_hasher)]

pub mod cloud;
pub mod commands;
/// JobSentinel Core Library
///
/// This library contains all platform-agnostic business logic that can be shared
/// across desktop (Windows/macOS/Linux) and cloud deployments (GCP/AWS).
// Re-export core modules
pub mod core;
pub mod platforms;

// Re-export commonly used types
pub use core::config::Config;
pub use core::db::{Database, Job};
pub use core::notify::{Notification, NotificationService};
pub use core::scheduler::{ScheduleConfig, Scheduler};
pub use core::scoring::{JobScore, ScoringEngine};
pub use core::scrapers::{JobScraper, ScraperResult};
