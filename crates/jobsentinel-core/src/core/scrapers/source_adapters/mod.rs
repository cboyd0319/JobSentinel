//! Source-adapter contracts for employer career systems.
//!
//! These modules keep request shaping, parsing, and canonical normalization
//! separate from live fetching. Runtime fetchers still need to route through
//! JobSentinel's shared HTTP safety layer before they are scheduled.

mod contract;
mod phenom_widget;
mod radancy_talentbrew;
mod workday_cxs;
