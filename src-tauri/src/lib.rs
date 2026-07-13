extern crate self as jobsentinel;

use jobsentinel_core as core;
use jobsentinel_core::platforms;

mod app;
mod command_handlers;
mod commands;

/// Start the JobSentinel desktop application.
pub fn run() {
    app::run();
}
