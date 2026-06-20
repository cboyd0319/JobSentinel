//! Source-adapter contracts for employer career systems.
//!
//! These modules keep request shaping, parsing, and canonical normalization
//! separate from live fetching. Runtime fetchers still need to route through
//! JobSentinel's shared HTTP safety layer before they are scheduled.

pub mod contract;
pub mod phenom_widget;
pub mod workday_cxs;

pub use contract::{
    validate_canonical_records, CanonicalJobRecord, FetchContract, HttpMethod, SourceAdapterLane,
    SourcePlatform,
};
pub use phenom_widget::{parse_phenom_widget_listing, PhenomWidgetRequest, PhenomWidgetSource};
pub use workday_cxs::{parse_workday_cxs_listing, WorkdayCxsRequest, WorkdayCxsSource};
