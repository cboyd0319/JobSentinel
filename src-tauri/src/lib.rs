//! Selects the application profile before initializing model caches and the native shell.

extern crate self as jobsentinel;

use jobsentinel_application as application;

mod bootstrap;
mod desktop;
mod ipc;
mod policy;

/// Start the JobSentinel desktop application.
pub fn run() {
    let portable = desktop::portable_root_from_args(std::env::args_os().skip(1))
        .and_then(|root| root.map_or(Ok(()), |root| desktop::select_portable_root(&root)));
    if portable.is_err() {
        eprintln!("Could not select the portable profile. Use an existing private directory with --portable.");
        return;
    }
    #[cfg(feature = "embedded-ml")]
    {
        std::env::set_var("HF_HUB_DISABLE_IMPLICIT_TOKEN", "1");
        std::env::set_var(
            "HF_XET_CACHE",
            desktop::get_data_dir().join("ml_models").join(".xet"),
        );
    }
    bootstrap::run();
}
