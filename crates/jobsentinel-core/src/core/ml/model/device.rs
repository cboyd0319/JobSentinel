use super::ModelManager;
use anyhow::Result;
use candle_core::Device;

impl ModelManager {
    /// Get device, using Metal on macOS when available and CPU elsewhere.
    pub fn get_device() -> Result<Device> {
        #[cfg(target_os = "macos")]
        {
            match Device::new_metal(0) {
                Ok(device) => {
                    tracing::info!("Using Metal acceleration");
                    return Ok(device);
                }
                Err(e) => {
                    tracing::warn!("Metal not available: {}, falling back to CPU", e);
                }
            }
        }

        tracing::info!("Using CPU for inference");
        Ok(Device::Cpu)
    }
}
