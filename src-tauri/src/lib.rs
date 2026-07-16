extern crate self as jobsentinel;

use jobsentinel_application as application;
use jobsentinel_application::desktop;

mod app;
mod command_handlers;
mod commands;

/// Start the JobSentinel desktop application.
pub fn run() {
    app::run();
}
