extern crate self as jobsentinel;

use jobsentinel_application as application;

mod bootstrap;
mod desktop;
mod ipc;
mod policy;

/// Start the JobSentinel desktop application.
pub fn run() {
    bootstrap::run();
}
